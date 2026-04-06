import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TableName = 'production_orders' | 'inventory_items' | 'sales_orders' | 'campaigns' | 'transactions' | 'purchase_orders' | 'inventory_transactions' | 'inventory_reservations' | 'audit_log' | 'inventory_adjustments' | 'categories' | 'customers' | 'suppliers' | 'stock_transfers' | 'bom_templates' | 'bom_lines' | 'chart_of_accounts' | 'journal_entries' | 'payments' | 'stores' | 'budgets' | 'budget_lines' | 'crm_deals' | 'crm_activities' | 'projects' | 'project_tasks';

/**
 * Subscribe to Supabase Realtime changes for a tenant-scoped table.
 * Automatically invalidates the React Query cache on INSERT/UPDATE/DELETE.
 */
export function useRealtimeSync(table: TableName) {
  const { tenant, isDemo } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (isDemo || !tenant?.id) return;

    const channel = supabase
      .channel(`${table}-${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (_payload) => {
          // Invalidate query so UI refreshes with latest data
          qc.invalidateQueries({ queryKey: [table, tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, tenant?.id, isDemo, qc]);
}

/**
 * Subscribe to ALL module tables at once — used by Dashboard for live KPIs.
 */
const ALL_TABLES: TableName[] = [
  'production_orders', 'inventory_items', 'sales_orders',
  'campaigns', 'transactions', 'purchase_orders',
];

export function useRealtimeSyncAll() {
  const { tenant, isDemo } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (isDemo || !tenant?.id) return;

    const channels = ALL_TABLES.map((table) =>
      supabase
        .channel(`dashboard-${table}-${tenant.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenant.id}` },
          () => qc.invalidateQueries({ queryKey: [table, tenant.id] })
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [tenant?.id, isDemo, qc]);
}
