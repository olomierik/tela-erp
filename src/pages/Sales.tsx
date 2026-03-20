import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { ShoppingCart, DollarSign, Users, TrendingUp, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { onSalesOrderCreated } from '@/hooks/use-cross-module';
import { generatePDFReport } from '@/lib/pdf-reports';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  pending: { label: 'Pending', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'warning' },
  shipped: { label: 'Shipped', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const demoSalesData = [
  { day: 'Mon', sales: 8200 }, { day: 'Tue', sales: 12400 }, { day: 'Wed', sales: 9800 },
  { day: 'Thu', sales: 15600 }, { day: 'Fri', sales: 11200 }, { day: 'Sat', sales: 7800 }, { day: 'Sun', sales: 4500 },
];

const demoRows = [
  ['#SO-2847', 'Acme Corp', 'john@acme.com', '$12,450', <StatusBadge status="Delivered" variant="success" />, 'Mar 18', null],
  ['#SO-2846', 'TechStart Inc', 'buy@techstart.io', '$8,200', <StatusBadge status="Shipped" variant="info" />, 'Mar 17', null],
];

const fields = [
  { name: 'order_number', label: 'Order #', required: true },
  { name: 'customer_name', label: 'Customer Name', required: true },
  { name: 'customer_email', label: 'Customer Email', required: true },
  { name: 'total_amount', label: 'Amount', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'pending', options: [
    { label: 'Pending', value: 'pending' }, { label: 'Confirmed', value: 'confirmed' },
    { label: 'Shipped', value: 'shipped' }, { label: 'Delivered', value: 'delivered' },
  ]},
];

export default function Sales() {
  const { isDemo, tenant } = useAuth();
  const { data, isLoading } = useTenantQuery('sales_orders');
  const insertMutation = useTenantInsert('sales_orders');
  const remove = useTenantDelete('sales_orders');
  useRealtimeSync('sales_orders');

  const orders = data ?? [];
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const customers = new Set(orders.map((o: any) => o.customer_email)).size;

  const salesChart = isDemo ? demoSalesData : (() => {
    const days: Record<string, number> = {};
    orders.forEach((o: any) => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('en-US', { weekday: 'short' });
      days[key] = (days[key] || 0) + Number(o.total_amount);
    });
    return Object.entries(days).map(([day, sales]) => ({ day, sales }));
  })();

  const handleCreate = async (row: Record<string, any>) => {
    insertMutation.mutate(row, {
      onSuccess: (data: any) => {
        if (tenant?.id) {
          onSalesOrderCreated(tenant.id, {
            order_number: data.order_number || row.order_number,
            customer_name: data.customer_name || row.customer_name,
            total_amount: Number(data.total_amount || row.total_amount),
          });
        }
      },
    });
  };

  const rows = isDemo ? demoRows : orders.map((o: any) => {
    const s = statusMap[o.status] || statusMap.pending;
    return [
      o.order_number, o.customer_name, o.customer_email,
      `$${Number(o.total_amount).toLocaleString()}`,
      <StatusBadge status={s.label} variant={s.variant} />,
      new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  return (
    <AppLayout title="Sales" subtitle="Orders, POS, and revenue tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (MTD)" value={isDemo ? '$89,400' : `$${totalRevenue.toLocaleString()}`} change={12.5} icon={DollarSign} />
        <StatCard title="Orders" value={isDemo ? '142' : String(orders.length)} change={8.2} icon={ShoppingCart} />
        <StatCard title="Customers" value={isDemo ? '89' : String(customers)} change={15} icon={Users} />
        <StatCard title="Avg Order" value={isDemo ? '$630' : orders.length ? `$${Math.round(totalRevenue / orders.length)}` : '$0'} change={4.1} icon={TrendingUp} />
      </div>

      {salesChart.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="font-semibold text-card-foreground mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="day" stroke="hsl(215, 16%, 47%)" />
              <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Sales']} />
              <Area type="monotone" dataKey="sales" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Sales Orders</h3>
        <div className="flex items-center gap-2">
          {!isDemo && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => generatePDFReport({
                title: 'Sales Report',
                subtitle: `Generated for ${tenant?.name || 'TELA-ERP'}`,
                tenantName: tenant?.name,
                headers: ['Order #', 'Customer', 'Email', 'Amount', 'Status', 'Date'],
                rows: orders.map((o: any) => [o.order_number, o.customer_name, o.customer_email, `$${Number(o.total_amount).toLocaleString()}`, o.status, new Date(o.created_at).toLocaleDateString()]),
                stats: [
                  { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}` },
                  { label: 'Orders', value: String(orders.length) },
                  { label: 'Customers', value: String(customers) },
                ],
              })} disabled={orders.length === 0}>
                <FileDown className="w-4 h-4" /> Export PDF
              </Button>
              <CreateDialog title="New Sales Order" buttonLabel="+ New Order" fields={fields} onSubmit={handleCreate} isPending={insertMutation.isPending} />
            </>
          )}
        </div>
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['Order #', 'Customer', 'Email', 'Amount', 'Status', 'Date', ...(isDemo ? [] : [''])]} rows={rows} />
      )}
    </AppLayout>
  );
}
