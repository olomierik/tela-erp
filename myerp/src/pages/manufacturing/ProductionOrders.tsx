import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate, genId, today } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, ClipboardList, Loader, CheckCircle2, PauseCircle } from 'lucide-react';

type OrderStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold';

interface ProductionOrder {
  id: string;
  order_number: string;
  product: string;
  quantity: number;
  start_date: string;
  end_date: string;
  status: OrderStatus;
  notes: string;
}

const INITIAL_ORDERS: ProductionOrder[] = [
  { id: '1', order_number: 'PO-2026-001', product: 'Widget Alpha',    quantity: 500,  start_date: '2026-03-01', end_date: '2026-03-15', status: 'completed',  notes: 'First batch delivered on time'       },
  { id: '2', order_number: 'PO-2026-002', product: 'Gear Assembly X', quantity: 200,  start_date: '2026-03-10', end_date: '2026-03-25', status: 'completed',  notes: 'Quality checks passed'               },
  { id: '3', order_number: 'PO-2026-003', product: 'Panel Unit B',    quantity: 150,  start_date: '2026-03-20', end_date: '2026-04-05', status: 'in_progress',notes: 'On schedule'                         },
  { id: '4', order_number: 'PO-2026-004', product: 'Valve Set V3',    quantity: 1000, start_date: '2026-03-25', end_date: '2026-04-10', status: 'in_progress',notes: 'Raw materials received'              },
  { id: '5', order_number: 'PO-2026-005', product: 'Circuit Board C', quantity: 300,  start_date: '2026-04-01', end_date: '2026-04-20', status: 'planned',    notes: 'Awaiting component delivery'        },
  { id: '6', order_number: 'PO-2026-006', product: 'Housing Shell H', quantity: 750,  start_date: '2026-04-05', end_date: '2026-04-25', status: 'planned',    notes: 'Tooling setup in progress'          },
  { id: '7', order_number: 'PO-2026-007', product: 'Motor Unit M2',   quantity: 100,  start_date: '2026-03-15', end_date: '2026-04-15', status: 'on_hold',    notes: 'Supplier delay on key components'   },
  { id: '8', order_number: 'PO-2026-008', product: 'Connector Block', quantity: 2000, start_date: '2026-04-10', end_date: '2026-04-30', status: 'planned',    notes: 'Large batch for Q2 export'          },
];

const BLANK: Omit<ProductionOrder, 'id' | 'order_number'> = {
  product: '', quantity: 1, start_date: today(), end_date: today(), status: 'planned', notes: '',
};

const statusVariant: Record<OrderStatus, 'secondary' | 'info' | 'success' | 'warning'> = {
  planned: 'secondary', in_progress: 'info', completed: 'success', on_hold: 'warning',
};

const statusLabel: Record<OrderStatus, string> = {
  planned: 'Planned', in_progress: 'In Progress', completed: 'Completed', on_hold: 'On Hold',
};

export default function ProductionOrders() {
  const [orders, setOrders] = useState<ProductionOrder[]>(INITIAL_ORDERS);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionOrder | null>(null);
  const [form, setForm] = useState<Omit<ProductionOrder, 'id' | 'order_number'>>(BLANK);

  const total      = orders.length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const completed  = orders.filter(o => o.status === 'completed').length;
  const planned    = orders.filter(o => o.status === 'planned').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(order: ProductionOrder) {
    setEditing(order);
    setForm({ product: order.product, quantity: order.quantity, start_date: order.start_date, end_date: order.end_date, status: order.status, notes: order.notes });
    setOpen(true);
  }

  function handleSave() {
    if (!form.product.trim()) { toast.error('Product is required'); return; }
    if (editing) {
      setOrders(prev => prev.map(o => o.id === editing.id ? { ...editing, ...form } : o));
      toast.success('Production order updated');
    } else {
      const num = `PO-2026-00${orders.length + 1}`;
      setOrders(prev => [...prev, { id: genId(), order_number: num, ...form }]);
      toast.success('Production order created');
    }
    setOpen(false);
  }

  function handleDelete(id: string) {
    setOrders(prev => prev.filter(o => o.id !== id));
    toast.success('Order removed');
  }

  function field(key: keyof typeof form, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <AppLayout title="Production Orders">
      <PageHeader title="Production Orders" subtitle="Schedule and track manufacturing production runs" action={{ label: 'New Order', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: total,      icon: ClipboardList, color: 'text-primary' },
          { label: 'In Progress',  value: inProgress, icon: Loader,        color: 'text-info'    },
          { label: 'Completed',    value: completed,  icon: CheckCircle2,  color: 'text-success' },
          { label: 'Planned',      value: planned,    icon: PauseCircle,   color: 'text-warning' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                  <TableCell className="font-medium">{order.product}</TableCell>
                  <TableCell>{order.quantity.toLocaleString()}</TableCell>
                  <TableCell>{formatDate(order.start_date)}</TableCell>
                  <TableCell>{formatDate(order.end_date)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(order)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(order.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Order' : 'New Production Order'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Input value={form.product} onChange={e => field('product', e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => field('quantity', Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => field('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => field('end_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => field('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Order'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
