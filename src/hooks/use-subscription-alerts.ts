import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionAlerts {
  overdueCount: number;
  overdueAmount: number;
  pendingCount: number;
  customers: Array<{ subscription_id: string; customer_name: string; period: string; amount: number }>;
  loading: boolean;
}

/**
 * Tenant-wide aggregate of unpaid / overdue subscription invoices.
 * Used by Dashboard widget and TopBar notification bell.
 */
export function useSubscriptionAlerts(): SubscriptionAlerts {
  const { tenant, isDemo } = useAuth();
  const [state, setState] = useState<SubscriptionAlerts>({
    overdueCount: 0, overdueAmount: 0, pendingCount: 0, customers: [], loading: true,
  });

  useEffect(() => {
    if (isDemo || !tenant?.id) { setState(s => ({ ...s, loading: false })); return; }
    let cancelled = false;
    (async () => {
      try { await (supabase as any).rpc('refresh_subscription_invoice_overdue'); } catch { /* no-op */ }
      const { data: invoices } = await (supabase as any).from('subscription_invoices')
        .select('id, subscription_id, period, amount, status').eq('tenant_id', tenant.id);
      const { data: subs } = await (supabase as any).from('subscriptions')
        .select('id, customer_name').eq('tenant_id', tenant.id);
      if (cancelled) return;
      const subName: Record<string, string> = {};
      (subs ?? []).forEach((s: any) => { subName[s.id] = s.customer_name; });
      let overdueCount = 0, overdueAmount = 0, pendingCount = 0;
      const customers: SubscriptionAlerts['customers'] = [];
      (invoices ?? []).forEach((inv: any) => {
        if (inv.status === 'overdue') {
          overdueCount++;
          overdueAmount += Number(inv.amount || 0);
          customers.push({
            subscription_id: inv.subscription_id,
            customer_name: subName[inv.subscription_id] || 'Customer',
            period: inv.period,
            amount: Number(inv.amount || 0),
          });
        }
        if (inv.status === 'pending') pendingCount++;
      });
      setState({ overdueCount, overdueAmount, pendingCount, customers, loading: false });
    })();

    // Realtime updates
    const channel = supabase.channel(`subinv:${tenant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_invoices', filter: `tenant_id=eq.${tenant.id}` },
        () => { /* trigger refetch */ setState(s => ({ ...s })); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [tenant?.id, isDemo]);

  return state;
}
