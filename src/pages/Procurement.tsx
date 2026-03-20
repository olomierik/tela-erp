import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Truck, Clock, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  draft: { label: 'Draft', variant: 'default' },
  submitted: { label: 'Submitted', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  received: { label: 'Received', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const demoRows = [
  ['#PO-501', 'SteelMax Inc', '$24,500', <StatusBadge status="Received" variant="success" />, 'Mar 10', 'Mar 18', null],
  ['#PO-500', 'ElectroParts Co', '$8,900', <StatusBadge status="Approved" variant="info" />, 'Mar 8', 'Mar 22', null],
];

const fields = [
  { name: 'po_number', label: 'PO #', required: true },
  { name: 'supplier_name', label: 'Supplier', required: true },
  { name: 'total_amount', label: 'Amount', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'draft', options: [
    { label: 'Draft', value: 'draft' }, { label: 'Submitted', value: 'submitted' },
    { label: 'Approved', value: 'approved' }, { label: 'Received', value: 'received' },
  ]},
  { name: 'order_date', label: 'Order Date', type: 'date' as const },
  { name: 'expected_delivery', label: 'Expected Delivery', type: 'date' as const },
];

export default function Procurement() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useTenantQuery('purchase_orders');
  const insert = useTenantInsert('purchase_orders');
  const remove = useTenantDelete('purchase_orders');

  const pos = data ?? [];
  const open = pos.filter((p: any) => !['received', 'cancelled'].includes(p.status)).length;
  const pending = pos.filter((p: any) => ['submitted', 'approved'].includes(p.status)).length;
  const received = pos.filter((p: any) => p.status === 'received').length;
  const totalSpend = pos.reduce((s: number, p: any) => s + Number(p.total_amount), 0);

  const rows = isDemo ? demoRows : pos.map((p: any) => {
    const s = statusMap[p.status] || statusMap.draft;
    return [
      p.po_number, p.supplier_name,
      `$${Number(p.total_amount).toLocaleString()}`,
      <StatusBadge status={s.label} variant={s.variant} />,
      p.order_date || '—', p.expected_delivery || '—',
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  return (
    <AppLayout title="Procurement" subtitle="Purchase orders and supplier management">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Open POs" value={isDemo ? '18' : String(open)} change={10} icon={FileText} />
        <StatCard title="Pending Delivery" value={isDemo ? '7' : String(pending)} change={-15} icon={Clock} />
        <StatCard title="Received (MTD)" value={isDemo ? '12' : String(received)} change={20} icon={CheckCircle} />
        <StatCard title="Total Spend (MTD)" value={isDemo ? '$55,650' : `$${totalSpend.toLocaleString()}`} change={5} icon={Truck} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Purchase Orders</h3>
        {!isDemo && <CreateDialog title="New Purchase Order" buttonLabel="+ New PO" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['PO #', 'Supplier', 'Amount', 'Status', 'Ordered', 'Expected', ...(isDemo ? [] : [''])]} rows={rows} />
      )}
    </AppLayout>
  );
}
