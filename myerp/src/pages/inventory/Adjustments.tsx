import { useState, useEffect } from 'react';
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
import { formatDate } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Pencil, Trash2, SlidersHorizontal, Plus, Minus, BarChart2, Loader2 } from 'lucide-react';

interface StockAdjustment extends Record<string, unknown> {
  id: string;
  product_id: string | null;
  warehouse_id: string | null;
  adjustment_type: 'add' | 'remove' | 'count';
  quantity: number;
  reason: string;
  date: string;
}

interface NamedOption {
  id: string;
  name: string;
}

type AdjType = StockAdjustment['adjustment_type'];

const typeVariant: Record<AdjType, 'success' | 'destructive' | 'info'> = {
  add:    'success',
  remove: 'destructive',
  count:  'info',
};

export default function Adjustments() {
  const { rows: adjustments, loading, insert, update, remove } = useTable<StockAdjustment>('myerp_stock_adjustments');
  const [products, setProducts] = useState<NamedOption[]>([]);
  const [warehouses, setWarehouses] = useState<NamedOption[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<StockAdjustment | null>(null);
  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    adjustment_type: 'add' as AdjType,
    quantity: '0',
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    supabase.from('myerp_products').select('id, name').then(({ data }) => {
      if (data) setProducts(data as NamedOption[]);
    });
    supabase.from('myerp_warehouses').select('id, name').then(({ data }) => {
      if (data) setWarehouses(data as NamedOption[]);
    });
  }, []);

  const totalAdjustments = adjustments.length;
  const addCount = adjustments.filter(a => a.adjustment_type === 'add').length;
  const removeCount = adjustments.filter(a => a.adjustment_type === 'remove').length;
  const countCount = adjustments.filter(a => a.adjustment_type === 'count').length;

  function productName(id: string | null) {
    if (!id) return '—';
    return products.find(p => p.id === id)?.name ?? id;
  }

  function warehouseName(id: string | null) {
    if (!id) return '—';
    return warehouses.find(w => w.id === id)?.name ?? id;
  }

  function openCreate() {
    setEditing(null);
    setForm({
      product_id: '',
      warehouse_id: '',
      adjustment_type: 'add',
      quantity: '0',
      reason: '',
      date: new Date().toISOString().split('T')[0],
    });
    setSheetOpen(true);
  }

  function openEdit(adj: StockAdjustment) {
    setEditing(adj);
    setForm({
      product_id: adj.product_id ?? '',
      warehouse_id: adj.warehouse_id ?? '',
      adjustment_type: adj.adjustment_type,
      quantity: String(adj.quantity),
      reason: adj.reason,
      date: adj.date,
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    const qty = parseInt(form.quantity) || 0;
    if (qty <= 0) { toast.error('Quantity must be greater than 0'); return; }
    const payload = {
      product_id: form.product_id || null,
      warehouse_id: form.warehouse_id || null,
      adjustment_type: form.adjustment_type,
      quantity: qty,
      reason: form.reason,
      date: form.date,
    };
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Adjustment updated');
      } else {
        await insert(payload);
        toast.success('Adjustment recorded');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save adjustment');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Adjustment deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete adjustment');
    }
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <AppLayout title="Stock Adjustments">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Stock Adjustments">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Record stock adjustments for damages, write-offs, corrections, and cycle counts"
        action={{ label: 'New Adjustment', onClick: openCreate }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Adjustments</CardTitle>
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalAdjustments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Add</CardTitle>
            <Plus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{addCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Remove</CardTitle>
            <Minus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{removeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Count</CardTitle>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{countCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>{productName(a.product_id)}</TableCell>
                    <TableCell>{warehouseName(a.warehouse_id)}</TableCell>
                    <TableCell>
                      <Badge variant={typeVariant[a.adjustment_type]} className="capitalize">{a.adjustment_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.quantity}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">{a.reason}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(a.id)}>
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
            <SheetTitle>{editing ? 'Edit Adjustment' : 'New Adjustment'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="adj-date">Date</Label>
              <Input id="adj-date" type="date" value={form.date} onChange={set('date')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-product">Product</Label>
              <Select id="adj-product" value={form.product_id} onChange={set('product_id')}>
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-warehouse">Warehouse</Label>
              <Select id="adj-warehouse" value={form.warehouse_id} onChange={set('warehouse_id')}>
                <option value="">— Select warehouse —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-type">Adjustment Type</Label>
              <Select id="adj-type" value={form.adjustment_type} onChange={set('adjustment_type')}>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
                <option value="count">Count</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-qty">Quantity</Label>
              <Input id="adj-qty" type="number" min="1" value={form.quantity} onChange={set('quantity')} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-reason">Reason</Label>
              <Textarea id="adj-reason" value={form.reason} onChange={set('reason')} placeholder="Reason for adjustment..." rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Record Adjustment'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
