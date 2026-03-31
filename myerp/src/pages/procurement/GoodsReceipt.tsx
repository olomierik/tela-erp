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
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, PackageCheck, Clock, CheckCircle, PackageOpen, Loader2 } from 'lucide-react';

interface GoodsReceipt extends Record<string, unknown> {
  id: string;
  receipt_number: string;
  po_number: string;
  vendor: string;
  product_name: string;
  quantity_received: number;
  received_date: string;
  status: 'pending' | 'partial' | 'complete';
  notes: string;
}

type GRStatus = GoodsReceipt['status'];

const statusVariant: Record<GRStatus, 'secondary' | 'warning' | 'success'> = {
  pending:  'secondary',
  partial:  'warning',
  complete: 'success',
};

export default function GoodsReceipt() {
  const { user } = useAuth();
  const { rows: receipts, loading, insert, update, remove } = useTable<GoodsReceipt>('myerp_goods_receipts');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GoodsReceipt | null>(null);
  const [form, setForm] = useState({
    po_number: '',
    vendor: '',
    product_name: '',
    quantity_received: 0,
    received_date: new Date().toISOString().split('T')[0],
    status: 'pending' as GRStatus,
    notes: '',
  });

  const totalReceipts = receipts.length;
  const pendingReceipts = receipts.filter(r => r.status === 'pending').length;
  const partialReceipts = receipts.filter(r => r.status === 'partial').length;
  const completeReceipts = receipts.filter(r => r.status === 'complete').length;

  function openCreate() {
    setEditing(null);
    setForm({
      po_number: '',
      vendor: '',
      product_name: '',
      quantity_received: 0,
      received_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
    });
    setSheetOpen(true);
  }

  function openEdit(receipt: GoodsReceipt) {
    setEditing(receipt);
    setForm({
      po_number: receipt.po_number,
      vendor: receipt.vendor,
      product_name: receipt.product_name,
      quantity_received: receipt.quantity_received,
      received_date: receipt.received_date,
      status: receipt.status,
      notes: receipt.notes,
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.po_number.trim()) { toast.error('PO number is required'); return; }
    if (!form.vendor.trim()) { toast.error('Vendor is required'); return; }
    try {
      const wasComplete = editing?.status === 'complete';
      const nowComplete = form.status === 'complete';

      if (editing) {
        await update(editing.id, {
          po_number: form.po_number,
          vendor: form.vendor,
          product_name: form.product_name,
          quantity_received: form.quantity_received,
          received_date: form.received_date,
          status: form.status,
          notes: form.notes,
        });
        toast.success('Goods receipt updated');
      } else {
        const next = receipts.length + 1;
        await insert({
          receipt_number: `GR-${new Date().getFullYear()}-${String(next).padStart(3, '0')}`,
          po_number: form.po_number,
          vendor: form.vendor,
          product_name: form.product_name,
          quantity_received: form.quantity_received,
          received_date: form.received_date,
          status: form.status,
          notes: form.notes,
        });
        toast.success('Goods receipt created');
      }

      // Update inventory when status first transitions to complete
      if (!wasComplete && nowComplete && form.product_name.trim() && form.quantity_received > 0 && user) {
        const { data: product } = await supabase
          .from('myerp_products')
          .select('id, stock_qty, name')
          .eq('user_id', user.id)
          .ilike('name', form.product_name)
          .maybeSingle();
        if (product) {
          await supabase
            .from('myerp_products')
            .update({ stock_qty: Number(product.stock_qty) + Number(form.quantity_received) })
            .eq('id', product.id);
          toast.success(`Inventory updated: +${form.quantity_received} units of "${product.name}"`);
        } else {
          toast.warning(`Receipt completed but product "${form.product_name}" not found in inventory`);
        }
      }

      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save goods receipt');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Goods receipt deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete goods receipt');
    }
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <AppLayout title="Goods Receipt">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Goods Receipt">
      <PageHeader
        title="Goods Receipt"
        subtitle="Record received goods, verify against POs, and update inventory levels"
        action={{ label: 'New Receipt', onClick: openCreate }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Receipts</CardTitle>
            <PackageCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{pendingReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Partial</CardTitle>
            <PackageOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{partialReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Complete</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{completeReceipts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-medium">{r.receipt_number}</TableCell>
                    <TableCell className="font-mono text-sm">{r.po_number}</TableCell>
                    <TableCell>{r.vendor}</TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell>{r.quantity_received}</TableCell>
                    <TableCell>{formatDate(r.received_date)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]} className="capitalize">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)}>
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
            <SheetTitle>{editing ? 'Edit Goods Receipt' : 'New Goods Receipt'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="gr-po">PO Number</Label>
              <Input id="gr-po" value={form.po_number} onChange={set('po_number')} placeholder="PO-2024-001" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gr-vendor">Vendor</Label>
              <Input id="gr-vendor" value={form.vendor} onChange={set('vendor')} placeholder="Vendor name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gr-product">Product Name</Label>
              <Input id="gr-product" value={form.product_name} onChange={set('product_name')} placeholder="Match name in inventory" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gr-qty">Quantity Received</Label>
              <Input id="gr-qty" type="number" min={0} value={form.quantity_received}
                onChange={e => setForm(f => ({ ...f, quantity_received: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gr-date">Received Date</Label>
              <Input id="gr-date" type="date" value={form.received_date} onChange={set('received_date')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gr-status">Status</Label>
              <Select id="gr-status" value={form.status} onChange={set('status')}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="complete">Complete</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gr-notes">Notes</Label>
              <Textarea id="gr-notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Receipt'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
