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
import { genId, today, formatCurrency, formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, ClipboardList, Clock, CheckCircle, DollarSign } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor: string;
  order_date: string;
  expected_date: string;
  total: number;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
  items_count: number;
}

const INITIAL_POS: PurchaseOrder[] = [
  { id: genId(), po_number: 'PO-2024-001', vendor: 'Apex Raw Materials Ltd',   order_date: '2024-01-05', expected_date: '2024-01-20', total: 12500.00, status: 'received',   items_count: 5 },
  { id: genId(), po_number: 'PO-2024-002', vendor: 'TechParts Global',          order_date: '2024-01-10', expected_date: '2024-02-01', total: 48200.50, status: 'approved',   items_count: 8 },
  { id: genId(), po_number: 'PO-2024-003', vendor: 'OfficeWorld Supplies',      order_date: '2024-01-15', expected_date: '2024-01-25', total: 1350.75,  status: 'submitted',  items_count: 3 },
  { id: genId(), po_number: 'PO-2024-004', vendor: 'FastFreight Logistics',     order_date: '2024-01-18', expected_date: '2024-02-10', total: 7800.00,  status: 'submitted',  items_count: 2 },
  { id: genId(), po_number: 'PO-2024-005', vendor: 'NorthStar Materials',       order_date: '2024-01-22', expected_date: '2024-02-15', total: 33400.00, status: 'draft',      items_count: 6 },
  { id: genId(), po_number: 'PO-2024-006', vendor: 'CircuitBase Inc',           order_date: '2024-02-01', expected_date: '2024-02-28', total: 92100.25, status: 'approved',   items_count: 12 },
  { id: genId(), po_number: 'PO-2024-007', vendor: 'Stationery Hub',            order_date: '2024-02-05', expected_date: '2024-02-12', total: 620.00,   status: 'received',   items_count: 4 },
  { id: genId(), po_number: 'PO-2024-008', vendor: 'Global Consult Group',      order_date: '2024-02-08', expected_date: '2024-03-01', total: 15000.00, status: 'cancelled',  items_count: 1 },
  { id: genId(), po_number: 'PO-2024-009', vendor: 'ProServ Consulting',        order_date: '2024-02-12', expected_date: '2024-03-05', total: 8750.00,  status: 'submitted',  items_count: 2 },
  { id: genId(), po_number: 'PO-2024-010', vendor: 'TechParts Global',          order_date: '2024-02-18', expected_date: '2024-03-10', total: 56800.00, status: 'approved',   items_count: 9 },
  { id: genId(), po_number: 'PO-2024-011', vendor: 'Apex Raw Materials Ltd',    order_date: '2024-02-20', expected_date: '2024-03-15', total: 21300.50, status: 'draft',      items_count: 7 },
  { id: genId(), po_number: 'PO-2024-012', vendor: 'FastFreight Logistics',     order_date: '2024-02-25', expected_date: '2024-03-20', total: 4900.00,  status: 'submitted',  items_count: 3 },
];

type POStatus = PurchaseOrder['status'];

const statusVariant: Record<POStatus, 'secondary' | 'info' | 'success' | 'default' | 'outline'> = {
  draft:      'secondary',
  submitted:  'info',
  approved:   'success',
  received:   'default',
  cancelled:  'outline',
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(INITIAL_POS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState({ vendor: '', order_date: today(), expected_date: '', notes: '' });

  const totalPOs = orders.length;
  const pendingApproval = orders.filter(o => o.status === 'submitted').length;
  const approved = orders.filter(o => o.status === 'approved').length;
  const totalValue = orders.reduce((s, o) => s + o.total, 0);

  function openCreate() {
    setEditing(null);
    setForm({ vendor: '', order_date: today(), expected_date: '', notes: '' });
    setSheetOpen(true);
  }

  function openEdit(order: PurchaseOrder) {
    setEditing(order);
    setForm({ vendor: order.vendor, order_date: order.order_date, expected_date: order.expected_date, notes: '' });
    setSheetOpen(true);
  }

  function handleSave() {
    if (!form.vendor.trim()) { toast.error('Vendor is required'); return; }
    if (!form.expected_date) { toast.error('Expected delivery date is required'); return; }
    if (editing) {
      setOrders(os => os.map(o => o.id === editing.id
        ? { ...o, vendor: form.vendor, order_date: form.order_date, expected_date: form.expected_date }
        : o));
      toast.success('Purchase order updated');
    } else {
      const next = orders.length + 1;
      setOrders(os => [...os, {
        id: genId(),
        po_number: `PO-2024-${String(next).padStart(3, '0')}`,
        vendor: form.vendor,
        order_date: form.order_date,
        expected_date: form.expected_date,
        total: 0,
        status: 'draft',
        items_count: 0,
      }]);
      toast.success('Purchase order created');
    }
    setSheetOpen(false);
  }

  function handleDelete(id: string) {
    setOrders(os => os.filter(o => o.id !== id));
    toast.success('Purchase order deleted');
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

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
                    <TableCell className="font-medium">{formatCurrency(o.total)}</TableCell>
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
