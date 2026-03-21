import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { ShoppingCart, DollarSign, Users, TrendingUp, Trash2, FileDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePDFReport } from '@/lib/pdf-reports';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

function CreateSalesOrderDialog({ inventoryItems, onCreated, isPending }: {
  inventoryItems: any[];
  onCreated: (row: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    order_number: '', customer_name: '', customer_email: '',
    item_id: '', quantity: '1', status: 'pending',
  });
  const [stockError, setStockError] = useState('');

  const selectedItem = inventoryItems.find((i: any) => i.id === form.item_id);
  const unitPrice = selectedItem ? Number(selectedItem.unit_cost) : 0;
  const totalAmount = unitPrice * (parseInt(form.quantity) || 0);

  const handleItemChange = (itemId: string) => {
    setForm(prev => ({ ...prev, item_id: itemId }));
    setStockError('');
  };

  const handleQuantityChange = (qty: string) => {
    setForm(prev => ({ ...prev, quantity: qty }));
    const q = parseInt(qty) || 0;
    if (selectedItem && q > selectedItem.quantity) {
      setStockError(`Insufficient stock for ${selectedItem.name}. Available: ${selectedItem.quantity}`);
    } else {
      setStockError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) { toast.error('Select an inventory item'); return; }
    const qty = parseInt(form.quantity) || 1;
    if (qty > selectedItem.quantity) {
      setStockError(`Insufficient stock for ${selectedItem.name}. Available: ${selectedItem.quantity}`);
      return;
    }
    onCreated({
      order_number: form.order_number,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      item_id: form.item_id,
      quantity: qty,
      total_amount: totalAmount,
      status: form.status,
    });
    setOpen(false);
    setForm({ order_number: '', customer_name: '', customer_email: '', item_id: '', quantity: '1', status: 'pending' });
    setStockError('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ New Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Order #</Label>
            <Input required value={form.order_number} onChange={e => setForm(p => ({ ...p, order_number: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer Name</Label>
              <Input required value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Email</Label>
              <Input type="email" required value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Inventory Item</Label>
            <Select value={form.item_id} onValueChange={handleItemChange}>
              <SelectTrigger><SelectValue placeholder="Select item from inventory..." /></SelectTrigger>
              <SelectContent>
                {inventoryItems.filter((i: any) => i.quantity > 0 && (i.status === 'good' || !i.status)).map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.quantity} in stock
                  </SelectItem>
                ))}
                {inventoryItems.filter((i: any) => i.quantity > 0 && (i.status === 'good' || !i.status)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No sellable items in stock</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="1" max={selectedItem?.quantity || 99999} required
                value={form.quantity} onChange={e => handleQuantityChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Amount</Label>
              <Input type="number" value={totalAmount.toFixed(2)} disabled className="bg-muted" />
            </div>
          </div>
          {stockError && (
            <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md border border-destructive/20">
              ⚠️ {stockError}
            </div>
          )}
          {selectedItem && !stockError && (
            <div className="bg-primary/5 text-primary text-sm px-3 py-2 rounded-md border border-primary/20">
              ✓ {selectedItem.quantity} units available · Unit price: {unitPrice.toFixed(2)}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending || !!stockError}>
            {isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Sales() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const insertMutation = useTenantInsert('sales_orders');
  const updateMutation = useTenantUpdate('sales_orders');
  const remove = useTenantDelete('sales_orders');
  useRealtimeSync('sales_orders');
  useRealtimeSync('inventory_items');

  const orders = data ?? [];
  const inventoryItems = inventoryData ?? [];
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

  const handleCreate = (row: Record<string, any>) => {
    insertMutation.mutate(row, {
      onSuccess: () => {
        // Reservation is handled by the insert — no client-side cross-module needed
        // The DB triggers handle fulfillment automation on status change
        if (row.item_id && tenant?.id) {
          (supabase.from('inventory_reservations') as any).insert({
            tenant_id: tenant.id,
            item_id: row.item_id,
            sales_order_id: undefined, // will be filled by the insert return
            quantity: row.quantity || 1,
            status: 'reserved',
          }).then(() => {});
        }
      },
    });
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateMutation.mutate({ id: orderId, status: newStatus });
  };

  const demoRows = [
    ['#SO-2847', 'Acme Corp', 'john@acme.com', formatMoney(12450), <StatusBadge status="Delivered" variant="success" />, 'Mar 18', null],
    ['#SO-2846', 'TechStart Inc', 'buy@techstart.io', formatMoney(8200), <StatusBadge status="Shipped" variant="info" />, 'Mar 17', null],
  ];

  const rows = isDemo ? demoRows : orders.map((o: any) => {
    const s = statusMap[o.status] || statusMap.pending;
    const canFulfill = o.status === 'pending' || o.status === 'confirmed';
    return [
      o.order_number, o.customer_name, o.customer_email,
      formatMoney(Number(o.total_amount)),
      <StatusBadge status={s.label} variant={s.variant} />,
      new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      <div className="flex items-center gap-1">
        {canFulfill && (
          <Select onValueChange={(v) => handleStatusChange(o.id, v)}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {o.status === 'pending' && <SelectItem value="confirmed">Confirm</SelectItem>}
              <SelectItem value="shipped">Ship</SelectItem>
              <SelectItem value="delivered">Deliver</SelectItem>
              <SelectItem value="cancelled">Cancel</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button variant="ghost" size="icon" onClick={() => remove.mutate(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
      </div>,
    ];
  });

  return (
    <AppLayout title="Sales" subtitle="Orders, POS, and revenue tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (MTD)" value={isDemo ? formatMoney(89400) : formatMoney(totalRevenue)} change={12.5} icon={DollarSign} />
        <StatCard title="Orders" value={isDemo ? '142' : String(orders.length)} change={8.2} icon={ShoppingCart} />
        <StatCard title="Customers" value={isDemo ? '89' : String(customers)} change={15} icon={Users} />
        <StatCard title="Avg Order" value={isDemo ? formatMoney(630) : orders.length ? formatMoney(Math.round(totalRevenue / orders.length)) : formatMoney(0)} change={4.1} icon={TrendingUp} />
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
              <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => formatMoney(v)} />
              <Tooltip formatter={(v: number) => [formatMoney(v), 'Sales']} />
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
                rows: orders.map((o: any) => [o.order_number, o.customer_name, o.customer_email, formatMoney(Number(o.total_amount)), o.status, new Date(o.created_at).toLocaleDateString()]),
                stats: [
                  { label: 'Revenue', value: formatMoney(totalRevenue) },
                  { label: 'Orders', value: String(orders.length) },
                  { label: 'Customers', value: String(customers) },
                ],
              })} disabled={orders.length === 0}>
                <FileDown className="w-4 h-4" /> Export PDF
              </Button>
              <CreateSalesOrderDialog
                inventoryItems={inventoryItems}
                onCreated={handleCreate}
                isPending={insertMutation.isPending}
              />
            </>
          )}
        </div>
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['Order #', 'Customer', 'Email', 'Amount', 'Status', 'Date', ...(isDemo ? [] : ['Actions'])]} rows={rows} />
      )}
    </AppLayout>
  );
}
