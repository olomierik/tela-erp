import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  ShoppingCart, DollarSign, Users, TrendingUp, Trash2, FileDown,
  Search, Plus, CheckCircle, Truck, Package, XCircle, Clock,
  ArrowRight, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantQuery, useTenantInsert, useTenantDelete, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generatePDFReport } from '@/lib/pdf-reports';
import { onSalesOrderCreated, onSalesOrderCancelled, type SaleLineItem } from '@/hooks/use-cross-module';
import { triggerAutomation } from '@/lib/automation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  pending: { label: 'Pending', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: Clock },
  confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: CheckCircle },
  shipped: { label: 'Shipped', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400', icon: Truck },
  delivered: { label: 'Delivered', class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400', icon: Package },
  cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusConfig[status] || statusConfig.pending;
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.class)}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}

function OrderTimeline({ status }: { status: string }) {
  const stages = ['pending', 'confirmed', 'shipped', 'delivered'];
  const activeIdx = stages.indexOf(status);
  if (status === 'cancelled') return (
    <div className="flex items-center gap-2 text-red-500 text-xs"><XCircle className="w-4 h-4" /> Order Cancelled</div>
  );
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => {
        const s = statusConfig[stage];
        const done = i <= activeIdx;
        return (
          <div key={stage} className="flex items-center">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
              done ? s.class : 'bg-muted text-muted-foreground'
            )}>
              {done ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < stages.length - 1 && (
              <ChevronRight className={cn('w-3 h-3 mx-0.5', done ? 'text-indigo-500' : 'text-muted-foreground/30')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Order Sheet ────────────────────────────────────────────────────

interface LineItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

function CreateOrderSheet({
  inventoryItems, customers, onClose, isPending, onCreate,
}: {
  inventoryItems: any[]; customers: any[]; onClose: () => void;
  isPending: boolean; onCreate: (row: Record<string, any>, lineItems: SaleLineItem[]) => void;
}) {
  const [form, setForm] = useState({
    order_number: `ORD-${String(Date.now()).slice(-6)}`,
    customer_id: '', customer_name: '', customer_email: '',
    status: 'pending', payment_method: 'cash',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_id: '', item_name: '', quantity: 1, unit_price: 0 },
  ]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCustomer = (id: string) => {
    const c = customers.find((c: any) => c.id === id);
    setForm(f => ({ ...f, customer_id: id, customer_name: c?.name || '', customer_email: c?.email || '' }));
  };

  const handleItemChange = (i: number, id: string) => {
    const item = inventoryItems.find((it: any) => it.id === id);
    const price = item?.selling_price && Number(item.selling_price) > 0 ? Number(item.selling_price) : (item?.unit_cost || 0);
    setLineItems(prev => prev.map((li, idx) => idx === i ? {
      ...li, item_id: id, item_name: item?.name || '', unit_price: price,
    } : li));
  };

  const updateLineItem = (i: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  };

  const addLine = () => setLineItems(prev => [...prev, { item_id: '', item_name: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const total = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  const handleSubmit = () => {
    if (!form.customer_name && !form.customer_id) { toast.error('Customer is required'); return; }
    const validLines = lineItems.filter(li => li.item_id);
    if (validLines.length === 0) { toast.error('Add at least one item'); return; }

    // Validate stock availability before submitting
    for (const li of validLines) {
      const invItem = inventoryItems.find((it: any) => it.id === li.item_id);
      if (invItem && invItem.quantity < li.quantity) {
        toast.error(`Insufficient stock for "${invItem.name}": ${invItem.quantity} available, ${li.quantity} requested`);
        return;
      }
    }

    const saleLines: SaleLineItem[] = validLines.map(li => ({
      item_id: li.item_id,
      item_name: li.item_name,
      quantity: li.quantity,
      unit_price: li.unit_price,
    }));

    const firstItem = validLines[0];
    onCreate(
      {
        order_number: form.order_number,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_id: form.customer_id || null,
        item_id: firstItem?.item_id,
        quantity: validLines.reduce((s, li) => s + li.quantity, 0),
        total_amount: total,
        status: form.status,
        custom_fields: { line_items: saleLines },
      },
      saleLines
    );
    onClose();
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>New Sales Order</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Order Number</Label>
            <Input value={form.order_number} onChange={e => set('order_number', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {customers.length > 0 && (
          <div className="space-y-1.5">
            <Label>Select Existing Customer</Label>
            <Select value={form.customer_id} onValueChange={handleCustomer}>
              <SelectTrigger><SelectValue placeholder="Select customer (optional)" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer Name *</Label>
            <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Type customer name" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.customer_email} onChange={e => set('customer_email', e.target.value)} placeholder="customer@email.com" type="email" />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <Label className="mb-2 block">Order Items</Label>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border bg-muted/20">
                <div className="col-span-5">
                  <Select value={li.item_id} onValueChange={v => handleItemChange(i, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {inventoryItems.filter((it: any) => it.quantity > 0).map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>{item.name} ({item.quantity} stock)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input type="number" value={li.quantity} onChange={e => updateLineItem(i, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-xs text-center" placeholder="Qty" min="1" />
                </div>
                <div className="col-span-3">
                  <Input type="number" value={li.unit_price} onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" placeholder="Price" />
                </div>
                <div className="col-span-1 text-xs font-semibold text-right text-foreground">
                  ${(li.quantity * li.unit_price).toFixed(0)}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeLine(i)}>×</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5 border-dashed" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Order Total</span>
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">${total.toFixed(2)}</span>
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSubmit} disabled={isPending}>
          <ShoppingCart className="w-4 h-4" /> Create Order
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main Sales Page ───────────────────────────────────────────────────────

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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const orders = data ?? [];
  const inventoryItems = inventoryData ?? [];
  const customers = customersData ?? [];

  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const uniqueCustomers = new Set(orders.map((o: any) => o.customer_email)).size;
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = (row: Record<string, any>, lineItems: SaleLineItem[]) => {
    insertMutation.mutate(row, {
      onSuccess: (data: any) => {
        if (!tenant?.id || !data?.id) return;

        // Persist line items to sales_order_lines table
        if (lineItems.length > 0) {
          const lines = lineItems.map(li => ({
            tenant_id: tenant.id,
            sales_order_id: data.id,
            item_id: li.item_id || null,
            description: li.item_name || '',
            quantity: li.quantity,
            unit_price: li.unit_price,
          }));
          (supabase as any).from('sales_order_lines').insert(lines).then(() => {});
        }

        // Reserve inventory for each line item
        lineItems.filter(li => li.item_id).forEach(li => {
          (supabase.from('inventory_reservations') as any).insert({
            tenant_id: tenant.id, item_id: li.item_id, sales_order_id: data.id,
            quantity: li.quantity, status: 'reserved',
          }).then(() => {});
        });

        // Cross-module: deduct inventory + COGS + revenue entry
        onSalesOrderCreated(tenant.id, {
          id: data.id,
          order_number: data.order_number,
          customer_name: data.customer_name,
          total_amount: Number(data.total_amount),
        }, lineItems);

        void triggerAutomation('sales_order_created', {
          customer: row.customer_name ?? row.customer,
          total: row.total ?? row.grand_total,
          reference: row.reference ?? row.order_number,
        }, tenant?.id ?? '');
      },
    });
  };

  const handleStatusChange = (order: any, newStatus: string) => {
    updateMutation.mutate({ id: order.id, status: newStatus }, {
      onSuccess: () => {
        if (newStatus === 'cancelled' && tenant?.id) {
          // Restore inventory on cancellation
          const lineItems: SaleLineItem[] =
            (order.custom_fields?.line_items as SaleLineItem[] | undefined) ?? [];
          if (lineItems.length > 0) {
            onSalesOrderCancelled(tenant.id, {
              id: order.id,
              order_number: order.order_number,
              total_amount: Number(order.total_amount),
            }, lineItems);
          }
        }
      },
    });
  };

  return (
    <AppLayout title="Sales" subtitle="Orders, revenue & fulfillment">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Revenue (MTD)', value: isDemo ? formatMoney(89400) : formatMoney(totalRevenue), icon: DollarSign, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Total Orders', value: isDemo ? '142' : String(orders.length), icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Customers', value: isDemo ? '89' : String(uniqueCustomers), icon: Users, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Avg Order Value', value: isDemo ? formatMoney(630) : formatMoney(avgOrder), icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          ].map((stat) => (
            <motion.div key={stat.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="rounded-xl border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {!isDemo && (
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => generatePDFReport({
                title: 'Sales Report', subtitle: `${tenant?.name}`, tenantName: tenant?.name,
                headers: ['Order #', 'Customer', 'Amount', 'Status', 'Date'],
                rows: orders.map((o: any) => [o.order_number, o.customer_name, formatMoney(Number(o.total_amount)), o.status, new Date(o.created_at).toLocaleDateString()]),
                stats: [{ label: 'Revenue', value: formatMoney(totalRevenue) }, { label: 'Orders', value: String(orders.length) }],
              })} disabled={orders.length === 0}>
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </Button>
            )}
            {!isDemo && (
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> New Order
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading && !isDemo ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Order #</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Status Timeline</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                  {!isDemo && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o: any) => (
                  <motion.tr key={o.id} className="hover:bg-accent/40 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{o.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell"><OrderTimeline status={o.status} /></td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{formatMoney(Number(o.total_amount))}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    {!isDemo && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!['delivered', 'cancelled'].includes(o.status) && (
                            <Select onValueChange={(v) => handleStatusChange(o, v)}>
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                              <SelectContent>
                                {o.status === 'pending' && <SelectItem value="confirmed">Confirm</SelectItem>}
                                {o.status === 'confirmed' && <SelectItem value="shipped">Mark Shipped</SelectItem>}
                                {o.status === 'shipped' && <SelectItem value="delivered">Mark Delivered</SelectItem>}
                                <SelectItem value="cancelled">Cancel</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remove.mutate(o.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No orders found</p>
                {!isDemo && (
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4" /> Create First Order
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Order Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[520px] flex flex-col p-0" side="right">
          <CreateOrderSheet
            inventoryItems={inventoryItems}
            customers={customers}
            onClose={() => setCreateOpen(false)}
            isPending={insertMutation.isPending}
            onCreate={(row, lineItems) => handleCreate(row, lineItems)}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
