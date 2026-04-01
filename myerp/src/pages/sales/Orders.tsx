import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, ShoppingCart, CheckCircle, Truck, DollarSign, Loader2 } from 'lucide-react';

type OrderStatus = 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'unpaid' | 'partial' | 'paid';

interface Order extends Record<string, unknown> {
  id: string;
  order_number: string;
  customer: string;
  date: string;
  items_count: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  notes: string;
}

const STATUS_BADGE: Record<OrderStatus, 'secondary' | 'info' | 'warning' | 'default' | 'success' | 'outline'> = {
  draft: 'secondary',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'outline',
};

const PAYMENT_BADGE: Record<PaymentStatus, 'destructive' | 'warning' | 'success'> = {
  unpaid: 'destructive',
  partial: 'warning',
  paid: 'success',
};

const emptyForm = {
  customer: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  payment_status: 'unpaid' as PaymentStatus,
};

export default function Orders() {
  const { rows: items, loading, insert, update, remove } = useTable<Order>('myerp_sales_orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(o => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeStatuses: OrderStatus[] = ['confirmed', 'processing', 'shipped'];
  const activeCount = items.filter(o => activeStatuses.includes(o.status)).length;
  const deliveredCount = items.filter(o => o.status === 'delivered').length;
  const deliveredRevenue = items.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(o: Order) {
    setEditId(o.id);
    setForm({ customer: o.customer, date: o.date, notes: o.notes, payment_status: o.payment_status });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try { await remove(id); toast.success('Order deleted'); }
    catch { toast.error('Failed to delete'); }
  }

  async function handleSave() {
    if (!form.customer.trim()) {
      toast.error('Customer is required');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await update(editId, { customer: form.customer, date: form.date, notes: form.notes, payment_status: form.payment_status });
        toast.success('Order updated');
      } else {
        await insert({ customer: form.customer, date: form.date, notes: form.notes, payment_status: form.payment_status, status: 'draft' });
        toast.success('Order created');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Orders">
      <PageHeader
        title="Sales Orders"
        subtitle="Track and manage customer orders through the fulfilment pipeline."
        action={{ label: 'New Order', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{items.length}</span>
              <ShoppingCart className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{activeCount}</span>
              <Truck className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivered</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{deliveredCount}</span>
              <CheckCircle className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivered Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(deliveredRevenue)}</span>
              <DollarSign className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by order # or customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-44">
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading orders…</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">No orders found.</TableCell>
                  </TableRow>
                )}
                {filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium font-mono text-sm">{o.order_number}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell>{formatDate(o.date)}</TableCell>
                    <TableCell className="text-right">{o.items_count}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[o.status]}>{o.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_BADGE[o.payment_status]}>{o.payment_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(o)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Order' : 'New Order'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Input placeholder="Customer name or company" value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total</Label>
              <div className="h-9 px-3 py-1 rounded-md border border-input bg-muted/40 text-sm flex items-center text-muted-foreground">
                {editId ? formatCurrency(items.find(o => o.id === editId)?.total ?? 0) : '—'}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value as PaymentStatus }))}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Order notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editId ? 'Save Changes' : 'Create Order'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
