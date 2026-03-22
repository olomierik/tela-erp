import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { ShoppingCart, DollarSign, Users, TrendingUp, Trash2, FileDown, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantQuery, useTenantInsert, useTenantDelete, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePDFReport } from '@/lib/pdf-reports';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  pending: { label: 'Pending', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'warning' },
  shipped: { label: 'Shipped', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

function CreateSalesOrderDialog({ inventoryItems, customers, onCreated, isPending }: {
  inventoryItems: any[]; customers: any[]; onCreated: (row: Record<string, any>) => void; isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ order_number: '', customer_id: '', customer_name: '', customer_email: '', item_id: '', quantity: '1', status: 'pending', payment_method: 'cash' });
  const [stockError, setStockError] = useState('');
  const selectedItem = inventoryItems.find((i: any) => i.id === form.item_id);
  const unitPrice = selectedItem ? Number(selectedItem.unit_cost) : 0;
  const totalAmount = unitPrice * (parseInt(form.quantity) || 0);

  const handleCustomerChange = (customerId: string) => {
    const c = customers.find((c: any) => c.id === customerId);
    setForm(p => ({ ...p, customer_id: customerId, customer_name: c?.name || '', customer_email: c?.email || '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) { toast.error('Select an inventory item'); return; }
    const qty = parseInt(form.quantity) || 1;
    if (qty > selectedItem.quantity) { setStockError(`Insufficient stock. Available: ${selectedItem.quantity}`); return; }
    onCreated({ order_number: form.order_number, customer_name: form.customer_name, customer_email: form.customer_email, customer_id: form.customer_id || null, item_id: form.item_id, quantity: qty, total_amount: totalAmount, status: form.status });
    setOpen(false);
    setForm({ order_number: '', customer_id: '', customer_name: '', customer_email: '', item_id: '', quantity: '1', status: 'pending', payment_method: 'cash' });
    setStockError('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" /> New Order</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Order #</Label><Input required className="h-8 text-xs" value={form.order_number} onChange={e => setForm(p => ({ ...p, order_number: e.target.value }))} /></div>
          {customers.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Select value={form.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Customer</Label><Input required className="h-8 text-xs" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" className="h-8 text-xs" value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} /></div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Inventory Item</Label>
            <Select value={form.item_id} onValueChange={v => { setForm(p => ({ ...p, item_id: v })); setStockError(''); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item..." /></SelectTrigger>
              <SelectContent>
                {inventoryItems.filter((i: any) => i.quantity > 0 && (i.status === 'good' || !i.status)).map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku}) — {item.quantity} in stock</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Qty</Label><Input type="number" min="1" className="h-8 text-xs" required value={form.quantity} onChange={e => { setForm(p => ({ ...p, quantity: e.target.value })); const q = parseInt(e.target.value) || 0; setStockError(selectedItem && q > selectedItem.quantity ? `Insufficient stock. Available: ${selectedItem.quantity}` : ''); }} /></div>
            <div className="space-y-1"><Label className="text-xs">Total</Label><Input type="number" value={totalAmount.toFixed(2)} disabled className="h-8 text-xs bg-muted" /></div>
            <div className="space-y-1"><Label className="text-xs">Payment</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {stockError && <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md">⚠️ {stockError}</div>}
          {selectedItem && !stockError && <div className="bg-primary/5 text-primary text-xs px-3 py-2 rounded-md">✓ {selectedItem.quantity} available · {unitPrice.toFixed(2)}/unit</div>}
          <Button type="submit" className="w-full h-8 text-xs" disabled={isPending || !!stockError}>{isPending ? 'Creating...' : 'Create Order'}</Button>
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
  const { data: customersData } = useTenantQuery('customers');
  const insertMutation = useTenantInsert('sales_orders');
  const updateMutation = useTenantUpdate('sales_orders');
  const remove = useTenantDelete('sales_orders');
  useRealtimeSync('sales_orders');
  useRealtimeSync('inventory_items');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const orders = data ?? [];
  const inventoryItems = inventoryData ?? [];
  const customers = customersData ?? [];
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const uniqueCustomers = new Set(orders.map((o: any) => o.customer_email)).size;

  const filtered = orders.filter((o: any) => {
    if (search && !o.order_number.toLowerCase().includes(search.toLowerCase()) && !o.customer_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const handleCreate = (row: Record<string, any>) => {
    insertMutation.mutate(row, {
      onSuccess: (data: any) => {
        if (row.item_id && tenant?.id && data?.id) {
          (supabase.from('inventory_reservations') as any).insert({
            tenant_id: tenant.id, item_id: row.item_id, sales_order_id: data.id, quantity: row.quantity || 1, status: 'reserved',
          }).then(() => {});
        }
      },
    });
  };

  return (
    <AppLayout title="Sales / POS" subtitle="Orders & revenue tracking">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Revenue (MTD)</p><p className="text-lg font-bold text-foreground">{isDemo ? formatMoney(89400) : formatMoney(totalRevenue)}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Orders</p><p className="text-lg font-bold text-foreground">{isDemo ? '142' : orders.length}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Customers</p><p className="text-lg font-bold text-foreground">{isDemo ? '89' : uniqueCustomers}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Avg Order</p><p className="text-lg font-bold text-foreground">{isDemo ? formatMoney(630) : orders.length ? formatMoney(Math.round(totalRevenue / orders.length)) : formatMoney(0)}</p></div>
      </div>

      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search orders..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {!isDemo && (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => generatePDFReport({
                    title: 'Sales Report', subtitle: `Generated for ${tenant?.name || 'TELA-ERP'}`, tenantName: tenant?.name,
                    headers: ['Order #', 'Customer', 'Email', 'Amount', 'Status', 'Date'],
                    rows: orders.map((o: any) => [o.order_number, o.customer_name, o.customer_email, formatMoney(Number(o.total_amount)), o.status, new Date(o.created_at).toLocaleDateString()]),
                    stats: [{ label: 'Revenue', value: formatMoney(totalRevenue) }, { label: 'Orders', value: String(orders.length) }],
                  })} disabled={orders.length === 0}><FileDown className="w-3.5 h-3.5" /> PDF</Button>
                  <CreateSalesOrderDialog inventoryItems={inventoryItems} customers={customers} onCreated={handleCreate} isPending={insertMutation.isPending} />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {['Order #', 'Customer', 'Email', 'Amount', 'Status', 'Date', ...(!isDemo ? ['Actions'] : [])].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((o: any) => {
                  const s = statusMap[o.status] || statusMap.pending;
                  const canFulfill = o.status === 'pending' || o.status === 'confirmed';
                  return (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">{o.order_number}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.customer_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{o.customer_email}</td>
                      <td className="px-4 py-2.5 font-medium">{formatMoney(Number(o.total_amount))}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={s.label} variant={s.variant} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      {!isDemo && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {canFulfill && (
                              <Select onValueChange={(v) => updateMutation.mutate({ id: o.id, status: v })}>
                                <SelectTrigger className="h-7 w-24 text-[11px]"><SelectValue placeholder="Action" /></SelectTrigger>
                                <SelectContent>
                                  {o.status === 'pending' && <SelectItem value="confirmed">Confirm</SelectItem>}
                                  <SelectItem value="shipped">Ship</SelectItem>
                                  <SelectItem value="delivered">Deliver</SelectItem>
                                  <SelectItem value="cancelled">Cancel</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(o.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
