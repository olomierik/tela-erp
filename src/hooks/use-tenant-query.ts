import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type TableName = 'production_orders' | 'inventory_items' | 'sales_orders' | 'campaigns' | 'transactions' | 'purchase_orders';

export function useTenantQuery<T = any>(table: TableName, orderBy = 'created_at') {
  const { tenant, isDemo } = useAuth();

  return useQuery<T[]>({
    queryKey: [table, tenant?.id],
    queryFn: async () => {
      if (isDemo || !tenant?.id) return [];
      const { data, error } = await (supabase.from(table) as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !isDemo && !!tenant?.id,
  });
}

export function useTenantInsert(table: TableName) {
  const { tenant } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await (supabase.from(table) as any)
        .insert({ ...row, tenant_id: tenant!.id })
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
      const { data, error } = await (supabase.from(table) as any)
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
      const { error } = await (supabase.from(table) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success('Record deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
