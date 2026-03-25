import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

type TableName = 'production_orders' | 'inventory_items' | 'sales_orders' | 'campaigns' | 'transactions' | 'purchase_orders' | 'inventory_transactions' | 'inventory_reservations' | 'audit_log' | 'inventory_adjustments' | 'categories' | 'customers' | 'suppliers' | 'stock_transfers' | 'bom_templates' | 'bom_lines' | 'chart_of_accounts' | 'journal_entries' | 'payments' | 'stores' | 'invoices' | 'invoice_lines' | 'projects' | 'project_tasks' | 'notifications';

const STORE_SCOPED_TABLES: TableName[] = ['production_orders', 'inventory_items', 'sales_orders', 'campaigns', 'transactions', 'purchase_orders', 'customers', 'suppliers', 'stock_transfers', 'payments'];

export function useTenantQuery<T = any>(table: TableName, orderBy = 'created_at') {
  const { tenant, isDemo } = useAuth();
  const { selectedStoreId } = useStore();

  return useQuery<T[]>({
    queryKey: [table, tenant?.id, selectedStoreId],
    queryFn: async () => {
      if (isDemo || !tenant?.id) return [];
      let query = (supabase.from(table as any) as any)
        .select('*')
        .eq('tenant_id', tenant.id);

      // Apply store filter for store-scoped tables
      if (selectedStoreId && STORE_SCOPED_TABLES.includes(table)) {
        query = query.eq('store_id', selectedStoreId);
      }

      const { data, error } = await query.order(orderBy, { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !isDemo && !!tenant?.id,
  });
}

export function useTenantInsert(table: TableName) {
  const { tenant } = useAuth();
  const { selectedStoreId } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const insertData: Record<string, any> = { ...row, tenant_id: tenant!.id };
      // Auto-attach store_id for store-scoped tables
      if (selectedStoreId && STORE_SCOPED_TABLES.includes(table) && !row.store_id) {
        insertData.store_id = selectedStoreId;
      }
      const { data, error } = await (supabase.from(table as any) as any)
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success('Record created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTenantUpdate(table: TableName) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { data, error } = await (supabase.from(table as any) as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success('Record updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTenantDelete(table: TableName) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success('Record deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
