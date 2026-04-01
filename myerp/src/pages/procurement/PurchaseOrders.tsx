import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTable } from '@/lib/useTable';
import { formatCurrency, formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, ClipboardList, Clock, CheckCircle, DollarSign, Loader2 } from 'lucide-react';

interface PurchaseOrder extends Record<string, unknown> {
  id: string;
  po_number: string;
  vendor: string;
  order_date: string;
  expected_date: string;
  total: number;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
  items_count: number;
}

type POStatus = PurchaseOrder['status'];

const statusVariant: Record<POStatus, 'secondary' | 'info' | 'success' | 'default' | 'outline'> = {
  draft:      'secondary',
  submitted:  'info',
  approved:   'success',
  received:   'default',
  cancelled:  'outline',
};

export default function PurchaseOrders() {
  const { rows: orders, loading, insert, update, remove } = useTable<PurchaseOrder>('myerp_purchase_orders');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState({ vendor: '', order_date: new Date().toISOString().split('T')[0], expected_date: '', notes: '' });

  const totalPOs = orders.length;
  const pendingApproval = orders.filter(o => o.status === 'submitted').length;
  const approved = orders.filter(o => o.status === 'approved').length;
  const totalValue = orders.reduce((s, o) => s + Number(o.total), 0);

  function openCreate() {
    setEditing(null);
    setForm({ vendor: '', order_date: new Date().toISOString().split('T')[0], expected_date: '', notes: '' });
    setSheetOpen(true);
  }

  function openEdit(order: PurchaseOrder) {
    setEditing(order);
    setForm({ vendor: order.vendor, order_date: order.order_date, expected_date: order.expected_date, notes: '' });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.vendor.trim()) { toast.error('Vendor is required'); return; }
    if (!form.expected_date) { toast.error('Expected delivery date is required'); return; }
    try {
      if (editing) {
        await update(editing.id, {
          vendor: form.vendor,
          order_date: form.order_date,
          expected_date: form.expected_date,
        });
        toast.success('Purchase order updated');
      } else {
        const next = orders.length + 1;
        await insert({
          po_number: `PO-${new Date().getFullYear()}-${String(next).padStart(3, '0')}`,
          vendor: form.vendor,
          order_date: form.order_date,
          expected_date: form.expected_date,
          total: 0,
          status: 'draft',
          items_count: 0,
        });
        toast.success('Purchase order created');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save purchase order');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Purchase order deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete purchase order');
    }
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <AppLayout title="Purchase Orders">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Purchase Orders">
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and track supplier purchase orders"
        action={{ label: 'New PO', onClick: openCreate }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total POs</CardTitle>
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalPOs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending Approval</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{pendingApproval}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Value</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm font-medium">{o.po_number}</TableCell>
                    <TableCell>{o.vendor}</TableCell>
                    <TableCell>{formatDate(o.order_date)}</TableCell>
                    <TableCell>{formatDate(o.expected_date)}</TableCell>
                    <TableCell>{o.items_count}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(o.total))}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[o.status]} className="capitalize">{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(o)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Purchase Order' : 'New Purchase Order'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="po-vendor">Vendor</Label>
              <Input id="po-vendor" value={form.vendor} onChange={set('vendor')} placeholder="Vendor name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="po-order-date">Order Date</Label>
              <Input id="po-order-date" type="date" value={form.order_date} onChange={set('order_date')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="po-expected-date">Expected Delivery</Label>
              <Input id="po-expected-date" type="date" value={form.expected_date} onChange={set('expected_date')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="po-notes">Notes</Label>
              <Textarea id="po-notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create PO'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
