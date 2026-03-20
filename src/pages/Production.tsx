import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Factory, Clock, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'default' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'warning' },
};

const demoData = [
  ['#PRD-401', 'Steel Components A', '500', <StatusBadge status="In Progress" variant="info" />, 'Mar 12', 'Mar 25', null],
  ['#PRD-400', 'Aluminum Frame B', '300', <StatusBadge status="Completed" variant="success" />, 'Mar 5', 'Mar 18', null],
];

const fields = [
  { name: 'order_number', label: 'Order #', required: true },
  { name: 'product_name', label: 'Product Name', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'draft', options: [
    { label: 'Draft', value: 'draft' }, { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
  ]},
  { name: 'start_date', label: 'Start Date', type: 'date' as const },
  { name: 'end_date', label: 'End Date', type: 'date' as const },
];

export default function Production() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useTenantQuery('production_orders');
  const insert = useTenantInsert('production_orders');
  const remove = useTenantDelete('production_orders');

  const rows = isDemo ? demoData : (data ?? []).map((o: any) => {
    const s = statusMap[o.status] || statusMap.draft;
    return [
      o.order_number,
      o.product_name,
      o.quantity.toLocaleString(),
      <StatusBadge status={s.label} variant={s.variant} />,
      o.start_date || '—',
      o.end_date || '—',
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  const stats = isDemo
    ? { active: 14, inProgress: 8, completed: 23, delayed: 2 }
    : {
        active: (data ?? []).filter((o: any) => o.status !== 'cancelled').length,
        inProgress: (data ?? []).filter((o: any) => o.status === 'in_progress').length,
        completed: (data ?? []).filter((o: any) => o.status === 'completed').length,
        delayed: 0,
      };

  return (
    <AppLayout title="Production" subtitle="Manufacturing orders and tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Orders" value={String(stats.active)} change={5} icon={Factory} />
        <StatCard title="In Progress" value={String(stats.inProgress)} change={12} icon={Clock} />
        <StatCard title="Completed" value={String(stats.completed)} change={8} icon={CheckCircle} />
        <StatCard title="Delayed" value={String(stats.delayed)} change={0} icon={AlertTriangle} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Production Orders</h3>
        {!isDemo && <CreateDialog title="New Production Order" buttonLabel="+ New Order" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable
          headers={['Order #', 'Product', 'Qty', 'Status', 'Start', 'End', ...(isDemo ? [] : [''])]}
          rows={rows}
        />
      )}
    </AppLayout>
  );
}
