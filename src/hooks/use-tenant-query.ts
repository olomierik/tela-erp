import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { isOfflineTable, OfflineTable, db } from '@/lib/offline/db';
import { IS_DESKTOP } from '@/lib/desktop';
import {
  useOfflineInsert, useOfflineUpdate, useOfflineDelete,
} from '@/hooks/use-offline-mutation';

type TableName = 'production_orders' | 'inventory_items' | 'sales_orders' | 'campaigns' | 'transactions' | 'purchase_orders' | 'inventory_transactions' | 'inventory_reservations' | 'audit_log' | 'inventory_adjustments' | 'categories' | 'customers' | 'suppliers' | 'stock_transfers' | 'bom_templates' | 'bom_lines' | 'chart_of_accounts' | 'journal_entries' | 'payments' | 'stores' | 'invoices' | 'invoice_lines' | 'projects' | 'project_tasks' | 'notifications' | 'employees' | 'departments' | 'attendance_logs' | 'leave_requests' | 'payroll_runs' | 'payroll_lines' | 'crm_deals' | 'crm_activities' | 'scanned_documents' | 'fixed_assets' | 'expense_claims' | 'expense_items' | 'budgets' | 'budget_lines' | 'automation_rules' | 'automation_logs' | 'tax_rates' | 'recurring_templates' | 'team_invites';

const STORE_SCOPED_TABLES: TableName[] = ['production_orders', 'inventory_items', 'sales_orders', 'campaigns', 'transactions', 'purchase_orders', 'customers', 'suppliers', 'stock_transfers', 'payments', 'employees', 'expense_claims'];

function invalidateAll(qc: ReturnType<typeof useQueryClient>, table: string) {
  qc.invalidateQueries({ queryKey: [table] });
  qc.invalidateQueries({ queryKey: ['offline', table] });
}

/** Mirror fresh server rows into Dexie so offline reads stay up to date. */
async function warmCache(table: TableName, rows: any[]) {
  if (!isOfflineTable(table) || !rows?.length) return;
  await db.transaction('rw', (db as any)[table], async () => {
    for (const row of rows) {
      const existing = await (db as any)[table].get(row.id);
      if (!existing?._dirty) await (db as any)[table].put({ ...row, _dirty: 0 });
    }
  });
}

export function useTenantQuery<T = any>(table: TableName, orderBy = 'created_at') {
  const { tenant, isDemo } = useAuth();
  const { selectedStoreId } = useStore();

  return useQuery<T[]>({
    queryKey: [table, tenant?.id, selectedStoreId],
    queryFn: async () => {
      if (isDemo || !tenant?.id) return [];

      // Web + offline + cacheable → read from Dexie.
      if (!IS_DESKTOP && !navigator.onLine && isOfflineTable(table)) {
        let rows = await (db as any)[table].where('tenant_id').equals(tenant.id).toArray();
        if (selectedStoreId && STORE_SCOPED_TABLES.includes(table)) {
          rows = rows.filter((r: any) => !r.store_id || r.store_id === selectedStoreId);
        }
        return rows;
      }

      // Online (or desktop, which proxies to SQLite via the desktop client).
      try {
        let query = (supabase.from(table as any) as any)
          .select('*')
          .eq('tenant_id', tenant.id);

        if (selectedStoreId && STORE_SCOPED_TABLES.includes(table)) {
          query = query.eq('store_id', selectedStoreId);
        }

        const { data, error } = await query.order(orderBy, { ascending: false });
        if (error) throw error;

        await warmCache(table, data ?? []);
        return data ?? [];
      } catch (err) {
        // Mid-session network drop → fall back to whatever Dexie has cached.
        if (!IS_DESKTOP && isOfflineTable(table)) {
          let rows = await (db as any)[table].where('tenant_id').equals(tenant.id).toArray();
          if (selectedStoreId && STORE_SCOPED_TABLES.includes(table)) {
            rows = rows.filter((r: any) => !r.store_id || r.store_id === selectedStoreId);
          }
          return rows;
        }
        throw err;
      }
    },
    enabled: !isDemo && !!tenant?.id,
  });
}

export function useTenantInsert(table: TableName) {
  const { tenant } = useAuth();
  const { selectedStoreId } = useStore();
  const qc = useQueryClient();
  const offlineTable: OfflineTable | null = isOfflineTable(table) ? (table as OfflineTable) : null;
  const offlineInsert = useOfflineInsert(offlineTable ?? ('sales_orders' as OfflineTable));

  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      if (!tenant?.id) throw new Error('Not signed in or tenant not loaded yet. Please try again.');
      const insertData: Record<string, any> = { ...row, tenant_id: tenant.id };
      // Auto-attach store_id for store-scoped tables
      if (selectedStoreId && STORE_SCOPED_TABLES.includes(table) && !row.store_id) {
        insertData.store_id = selectedStoreId;
      }
      const { data, error } = await (supabase.from(table as any) as any)
        .insert(insertData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      invalidateAll(qc, table);
      toast.success('Record created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTenantUpdate(table: TableName) {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const offlineTable: OfflineTable | null = isOfflineTable(table) ? (table as OfflineTable) : null;
  const offlineUpdate = useOfflineUpdate(offlineTable ?? ('sales_orders' as OfflineTable));

  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      if (!tenant?.id) throw new Error('No active tenant');
      const useOfflineQueue = !IS_DESKTOP && !navigator.onLine && !!offlineTable;

      if (useOfflineQueue) {
        return offlineUpdate.mutateAsync({ id, ...updates });
      }

      const { tenant_id: _omit, ...safeUpdates } = updates;
      const { data, error } = await (supabase.from(table as any) as any)
        .update(safeUpdates)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;

      if (offlineTable && data) {
        await (db as any)[offlineTable].put({ ...data, _dirty: 0 });
      }
      return data;
    },
    onSuccess: () => {
      invalidateAll(qc, table);
      toast.success('Record updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTenantDelete(table: TableName) {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const offlineTable: OfflineTable | null = isOfflineTable(table) ? (table as OfflineTable) : null;
  const offlineDelete = useOfflineDelete(offlineTable ?? ('sales_orders' as OfflineTable));

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error('No active tenant');
      const useOfflineQueue = !IS_DESKTOP && !navigator.onLine && !!offlineTable;

      if (useOfflineQueue) {
        return offlineDelete.mutateAsync(id);
      }

      const { error } = await (supabase.from(table as any) as any)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;

      if (offlineTable) {
        await (db as any)[offlineTable].delete(id);
      }
    },
    onSuccess: () => {
      invalidateAll(qc, table);
      toast.success('Record deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
