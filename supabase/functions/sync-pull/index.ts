import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OFFLINE_TABLES = new Set([
  'sales_orders', 'inventory_items', 'invoices', 'invoice_lines',
  'customers', 'suppliers', 'transactions', 'pos_orders',
  'pos_order_items', 'inventory_transactions', 'inventory_adjustments', 'payments',
]);

const PULL_LIMIT = 500;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const { tenant_id, table, since } = await req.json() as { tenant_id: string; table: string; since: string | null };
    if (!tenant_id || !table) return json({ error: 'Bad request' }, 400);
    if (!OFFLINE_TABLES.has(table)) return json({ error: 'Table not allowed' }, 400);

    // Verify tenant membership
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

    // Delta query: rows updated since the token.
    let query = admin.from(table)
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('updated_at', { ascending: true })
      .limit(PULL_LIMIT);
    if (since) query = query.gt('updated_at', since);

    const { data: changes, error } = await query;
    if (error) throw error;

    // Look up tombstones since the same token
    const { data: deletes } = await admin
      .from('sync_tombstones')
      .select('row_id, deleted_at')
      .eq('tenant_id', tenant_id)
      .eq('table_name', table)
      .order('deleted_at', { ascending: true })
      .gt('deleted_at', since ?? '1970-01-01')
      .limit(PULL_LIMIT);

    const lastTs =
      changes && changes.length > 0
        ? changes[changes.length - 1].updated_at
        : deletes && deletes.length > 0
          ? deletes[deletes.length - 1].deleted_at
          : since ?? new Date().toISOString();

    return json({
      changes: changes ?? [],
      deletes: (deletes ?? []).map(d => d.row_id),
      next_token: lastTs,
      has_more: (changes?.length ?? 0) >= PULL_LIMIT,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
