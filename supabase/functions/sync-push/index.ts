import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tables clients are allowed to push to via this endpoint.
const OFFLINE_TABLES = new Set([
  'sales_orders', 'inventory_items', 'invoices', 'invoice_lines',
  'customers', 'suppliers', 'transactions', 'pos_orders',
  'pos_order_items', 'inventory_transactions', 'inventory_adjustments', 'payments',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Operation {
  idempotency_key: string;
  table: string;
  op: 'upsert' | 'delete';
  row_id: string;
  payload: any;
  base_version: number;
  client_ts: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify JWT & resolve user
    const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const { tenant_id, operations } = await req.json() as { tenant_id: string; operations: Operation[] };
    if (!tenant_id || !Array.isArray(operations)) return json({ error: 'Bad request' }, 400);

    // Enforce tenant membership
    const { data: membership } = await admin
      .from('user_companies')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    const { data: profile } = await admin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!membership && profile?.tenant_id !== tenant_id) return json({ error: 'Forbidden' }, 403);

    // Idempotency cache — dedupe keys seen in the last 7 days
    const keys = operations.map(o => o.idempotency_key);
    const { data: seen } = await admin
      .from('sync_idempotency')
      .select('idempotency_key')
      .in('idempotency_key', keys);
    const seenSet = new Set((seen ?? []).map(s => s.idempotency_key));

    const accepted: string[] = [];
    const rejected: any[] = [];

    for (const op of operations) {
      if (seenSet.has(op.idempotency_key)) { accepted.push(op.idempotency_key); continue; }
      if (!OFFLINE_TABLES.has(op.table)) {
        rejected.push({ idempotency_key: op.idempotency_key, reason: 'permanent', message: `Table ${op.table} not allowed` });
        continue;
      }
      if (op.payload && op.payload.tenant_id && op.payload.tenant_id !== tenant_id) {
        rejected.push({ idempotency_key: op.idempotency_key, reason: 'permanent', message: 'tenant_id mismatch' });
        continue;
      }

      try {
        if (op.op === 'delete') {
          await admin.from(op.table).delete().eq('id', op.row_id).eq('tenant_id', tenant_id);
        } else {
          // Strip local-only fields
          const { _dirty, _version, ...row } = op.payload ?? {};
          const rowWithTenant = { ...row, tenant_id, updated_at: new Date().toISOString() };

          // Optimistic concurrency: only upsert if server version matches base_version.
          // If no _version column exists we fall back to plain upsert.
          const { data: existing } = await admin
            .from(op.table)
            .select('*')
            .eq('id', op.row_id)
            .eq('tenant_id', tenant_id)
            .maybeSingle();

          if (existing && existing._version !== undefined && existing._version !== op.base_version) {
            rejected.push({
              idempotency_key: op.idempotency_key,
              reason: 'version_conflict',
              server_row: existing,
            });
            continue;
          }

          if (existing && '_version' in existing) {
            rowWithTenant._version = (existing._version ?? 0) + 1;
          }

          const { error } = await admin.from(op.table).upsert(rowWithTenant, { onConflict: 'id' });
          if (error) throw error;
        }

        await admin.from('sync_idempotency').insert({
          idempotency_key: op.idempotency_key,
          tenant_id,
          user_id: userId,
          table_name: op.table,
          created_at: new Date().toISOString(),
        });

        accepted.push(op.idempotency_key);
      } catch (err) {
        rejected.push({
          idempotency_key: op.idempotency_key,
          reason: 'transient',
          message: (err as Error).message,
        });
      }
    }

    return json({ accepted, rejected });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
