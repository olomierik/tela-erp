import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Truck, Clock, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { onProcurementReceived } from '@/hooks/use-cross-module';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  draft: { label: 'Draft', variant: 'default' },
  submitted: { label: 'Submitted', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  received: { label: 'Received', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

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
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('purchase_orders');
  const insertBase = useTenantInsert('purchase_orders');
  const remove = useTenantDelete('purchase_orders');
  useRealtimeSync('purchase_orders');

  const pos = data ?? [];
  const open = pos.filter((p: any) => !['received', 'cancelled'].includes(p.status)).length;
  const pending = pos.filter((p: any) => ['submitted', 'approved'].includes(p.status)).length;
  const received = pos.filter((p: any) => p.status === 'received').length;
  const totalSpend = pos.reduce((s: number, p: any) => s + Number(p.total_amount), 0);

  const supplierMap: Record<string, number> = {};
  pos.forEach((p: any) => { supplierMap[p.supplier_name] = (supplierMap[p.supplier_name] || 0) + Number(p.total_amount); });
  const supplierChart = Object.entries(supplierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const handleCreate = (row: Record<string, any>) => {
    insertBase.mutate(row, {
      onSuccess: (data: any) => {
        if (data.status === 'received' && tenant?.id) {
          onProcurementReceived(tenant.id, {
            po_number: data.po_number,
            supplier_name: data.supplier_name,
            total_amount: Number(data.total_amount),
          });
        }
      },
    });
  };

  const demoRows = [
    ['#PO-501', 'SteelMax Inc', formatMoney(24500), <StatusBadge status="Received" variant="success" />, 'Mar 10', 'Mar 18', null],
    ['#PO-500', 'ElectroParts Co', formatMoney(8900), <StatusBadge status="Approved" variant="info" />, 'Mar 8', 'Mar 22', null],
  ];

  const rows = isDemo ? demoRows : pos.map((p: any) => {
    const s = statusMap[p.status] || statusMap.draft;
    const autoTag = (p.custom_fields as any)?.reason ? ' 🤖' : '';
    return [
      p.po_number + autoTag, p.supplier_name,
      formatMoney(Number(p.total_amount)),
      <StatusBadge status={s.label} variant={s.variant} />,
      p.order_date || '—', p.expected_delivery || '—',
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  return (
    <AppLayout title="Procurement" subtitle="Purchase orders, suppliers & spend tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Open POs" value={isDemo ? '18' : String(open)} change={10} icon={FileText} />
        <StatCard title="Pending Delivery" value={isDemo ? '7' : String(pending)} change={-15} icon={Clock} />
        <StatCard title="Received (MTD)" value={isDemo ? '12' : String(received)} change={20} icon={CheckCircle} />
        <StatCard title="Total Spend (MTD)" value={isDemo ? formatMoney(55650) : formatMoney(totalSpend)} change={5} icon={Truck} />
      </div>

      {supplierChart.length > 0 && !isDemo && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="font-semibold text-card-foreground mb-4">Spend by Supplier</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={supplierChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis type="number" stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => formatMoney(v)} />
              <YAxis dataKey="name" type="category" stroke="hsl(215, 16%, 47%)" width={120} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="value" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Purchase Orders</h3>
        {!isDemo && <CreateDialog title="New Purchase Order" buttonLabel="+ New PO" fields={fields} onSubmit={handleCreate} isPending={insertBase.isPending} />}
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['PO #', 'Supplier', 'Amount', 'Status', 'Ordered', 'Expected', ...(isDemo ? [] : [''])]} rows={rows} />
      )}
    </AppLayout>
  );
}
