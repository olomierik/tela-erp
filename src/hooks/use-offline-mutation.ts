/**
 * Offline-first CRUD hooks.
 *
 * Writes are always applied to the local Dexie store immediately and queued in
 * the _outbox for the sync scheduler to push. The UI doesn't wait on the
 * network — it sees its change in React Query right away.
 *
 * For tables not in OFFLINE_TABLES, callers should keep using the online
 * useTenantInsert / useTenantUpdate / useTenantDelete from use-tenant-query.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { db, OfflineTable, nextClientTs, isOfflineTable } from '@/lib/offline/db';
import { scheduler } from '@/lib/offline/scheduler';

const STORE_SCOPED: OfflineTable[] = [
  'sales_orders', 'inventory_items', 'customers', 'suppliers', 'transactions',
  'payments', 'pos_orders',
  'production_orders', 'campaigns', 'purchase_orders', 'stock_transfers',
  'employees', 'expense_claims',
];

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxxxxxx4xxxyxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }) + Date.now().toString(16);
}

// ─── Query: read from Dexie, fall back to Supabase ──────────────────────────

export function useOfflineQuery<T = any>(table: OfflineTable, orderBy: keyof T | 'updated_at' = 'updated_at') {
  const { tenant, isDemo } = useAuth();
  const { selectedStoreId } = useStore();
  const qc = useQueryClient();

  return useQuery<T[]>({
    queryKey: ['offline', table, tenant?.id, selectedStoreId],
    queryFn: async () => {
      if (isDemo || !tenant?.id) return [];

      // 1. Read whatever is cached locally — instant.
      let local = await (db as any)[table].where('tenant_id').equals(tenant.id).toArray();
      if (selectedStoreId && STORE_SCOPED.includes(table)) {
        local = local.filter((r: any) => !r.store_id || r.store_id === selectedStoreId);
      }

      // 2. Fire a background pull so subsequent renders have fresh data.
      //    Debounced by the scheduler so rapid calls don't stampede.
      if (navigator.onLine) {
        scheduler.pull(tenant.id, [table]).then(() => {
          qc.invalidateQueries({ queryKey: ['offline', table, tenant.id] });
        });
      }

      // 3. If the local cache is empty, do a one-shot blocking fetch so the UI
      //    gets data on first load without waiting for the background pull.
      if (local.length === 0 && navigator.onLine) {
        const { data } = await supabase.from(table as any)
          .select('*')
          .eq('tenant_id', tenant.id)
          .limit(500);
        if (data && data.length) {
          await db.transaction('rw', (db as any)[table], async () => {
            for (const row of data as any[]) await (db as any)[table].put({ ...(row as any), _dirty: 0 });
          });
          local = data as any[];
          if (selectedStoreId && STORE_SCOPED.includes(table)) {
            local = local.filter((r: any) => !r.store_id || r.store_id === selectedStoreId);
          }
        }
      }

      const order = String(orderBy);
      return local.sort((a: any, b: any) => (b[order] ?? '').localeCompare?.(a[order] ?? '') ?? 0);
    },
    enabled: !isDemo && !!tenant?.id,
    staleTime: 30_000,
  });
}

// ─── Mutation: upsert/delete locally, queue to outbox ───────────────────────

function invalidate(qc: ReturnType<typeof useQueryClient>, table: string) {
  qc.invalidateQueries({ queryKey: ['offline', table] });
  qc.invalidateQueries({ queryKey: [table] }); // keep existing useTenantQuery callers in sync too
}

export function useOfflineInsert(table: OfflineTable) {
  const { tenant, user } = useAuth();
  const { selectedStoreId } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      if (!tenant?.id) throw new Error('No active tenant');
      if (!isOfflineTable(table)) throw new Error(`Table ${table} not offline-enabled`);

      const id = row.id ?? uuid();
      const now = new Date().toISOString();
      const full: any = {
        ...row,
        id,
        tenant_id: tenant.id,
        created_at: row.created_at ?? now,
        updated_at: now,
        _version: 0,
        _dirty: 1,
      };
      if (selectedStoreId && STORE_SCOPED.includes(table) && !full.store_id) {
        full.store_id = selectedStoreId;
      }

      await db.transaction('rw', (db as any)[table], db._outbox, async () => {
        await (db as any)[table].put(full);
        await db._outbox.put({
          id: uuid(),
          tenant_id: tenant.id,
          user_id: user?.id ?? '',
          table,
          op: 'upsert',
          row_id: id,
          payload: full,
          base_version: 0,
          client_ts: nextClientTs(),
          retries: 0,
        });
      });

      scheduler.kick();
      return full;
    },
    onSuccess: () => {
      invalidate(qc, table);
      toast.success('Saved (will sync when online)');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOfflineUpdate(table: OfflineTable) {
  const { tenant, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      if (!tenant?.id) throw new Error('No active tenant');
      if (!id) throw new Error('id is required');

      const { tenant_id: _omit, ...safeUpdates } = updates;
      const existing = await (db as any)[table].get(id);
      if (existing && existing.tenant_id !== tenant.id) throw new Error('Cross-tenant update blocked');

      const merged: any = {
        ...(existing ?? { id, tenant_id: tenant.id }),
        ...safeUpdates,
        updated_at: new Date().toISOString(),
        _dirty: 1,
      };

      await db.transaction('rw', (db as any)[table], db._outbox, async () => {
        await (db as any)[table].put(merged);
        await db._outbox.put({
          id: uuid(),
          tenant_id: tenant.id,
          user_id: user?.id ?? '',
          table,
          op: 'upsert',
          row_id: id,
          payload: merged,
          base_version: existing?._version ?? 0,
          client_ts: nextClientTs(),
          retries: 0,
        });
      });

      scheduler.kick();
      return merged;
    },
    onSuccess: () => {
      invalidate(qc, table);
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOfflineDelete(table: OfflineTable) {
  const { tenant, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error('No active tenant');
      const existing = await (db as any)[table].get(id);
      if (existing && existing.tenant_id !== tenant.id) throw new Error('Cross-tenant delete blocked');

      await db.transaction('rw', (db as any)[table], db._outbox, async () => {
        await (db as any)[table].delete(id);
        await db._outbox.put({
          id: uuid(),
          tenant_id: tenant.id,
          user_id: user?.id ?? '',
          table,
          op: 'delete',
          row_id: id,
          payload: null,
          base_version: existing?._version ?? 0,
          client_ts: nextClientTs(),
          retries: 0,
        });
      });

      scheduler.kick();
    },
    onSuccess: () => {
      invalidate(qc, table);
      toast.success('Deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
