import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTable } from '@/lib/useTable';
import { formatCurrency } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, Box, CheckCircle, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';

interface Product extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  status: 'active' | 'inactive' | 'discontinued';
}

const CATEGORIES = ['Electronics', 'Apparel', 'Food & Beverage', 'Office Supplies', 'Hardware', 'Furniture'];
const UNITS = ['pcs', 'kg', 'L', 'box', 'pair'];

type ProductStatus = Product['status'];
const statusVariant: Record<ProductStatus, 'success' | 'secondary' | 'outline'> = {
  active: 'success',
  inactive: 'secondary',
  discontinued: 'outline',
};

function StockDot({ qty, reorder }: { qty: number; reorder: number }) {
  if (qty === 0) return <span className="inline-flex items-center gap-1.5 text-xs text-destructive font-medium"><span className="w-2 h-2 rounded-full bg-destructive inline-block" />Out</span>;
  if (qty <= reorder) return <span className="inline-flex items-center gap-1.5 text-xs text-warning font-medium"><span className="w-2 h-2 rounded-full bg-warning inline-block" />Low</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium"><span className="w-2 h-2 rounded-full bg-success inline-block" />OK</span>;
}

type FormState = {
  sku: string; name: string; category: string; unit: string;
  unit_cost: string; selling_price: string; stock_qty: string;
  reorder_level: string; status: ProductStatus;
};

function productToForm(p: Product): FormState {
  return {
    sku: p.sku, name: p.name, category: p.category, unit: p.unit,
    unit_cost: String(p.unit_cost), selling_price: String(p.selling_price),
    stock_qty: String(p.stock_qty), reorder_level: String(p.reorder_level),
    status: p.status,
  };
}

const EMPTY_FORM: FormState = {
  sku: '', name: '', category: 'Electronics', unit: 'pcs',
  unit_cost: '', selling_price: '', stock_qty: '0', reorder_level: '0', status: 'active',
};

export default function Products() {
  const { rows: products, loading, insert, update, remove } = useTable<Product>('myerp_products');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const lowStock = products.filter(p => Number(p.stock_qty) <= Number(p.reorder_level)).length;
  const totalInventoryValue = products.reduce((s, p) => s + Number(p.unit_cost) * Number(p.stock_qty), 0);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(productToForm(product));
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.sku.trim()) { toast.error('SKU is required'); return; }
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      unit_cost: parseFloat(form.unit_cost) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_qty: parseInt(form.stock_qty) || 0,
      reorder_level: parseInt(form.reorder_level) || 0,
      status: form.status,
    };
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Product updated');
      } else {
        await insert(payload);
        toast.success('Product added');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Product removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    }
  }

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <AppLayout title="Products">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Products">
      <PageHeader
        title="Products"
        subtitle="Manage your product catalogue, SKUs, and pricing"
        action={{ label: 'Add Product', onClick: openCreate }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Products</CardTitle>
            <Box className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{activeProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Low / Out of Stock</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Inventory Value</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>{formatCurrency(Number(p.unit_cost))}</TableCell>
                    <TableCell>{formatCurrency(Number(p.selling_price))}</TableCell>
                    <TableCell>{p.stock_qty}</TableCell>
                    <TableCell>{p.reorder_level}</TableCell>
                    <TableCell><StockDot qty={Number(p.stock_qty)} reorder={Number(p.reorder_level)} /></TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[p.status]} className="capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)}>
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
            <SheetTitle>{editing ? 'Edit Product' : 'Add Product'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="p-sku">SKU</Label>
              <Input id="p-sku" value={form.sku} onChange={set('sku')} placeholder="EL-001" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={form.name} onChange={set('name')} placeholder="Product name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-category">Category</Label>
              <Select id="p-category" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-unit">Unit</Label>
              <Select id="p-unit" value={form.unit} onChange={set('unit')}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="p-cost">Unit Cost</Label>
                <Input id="p-cost" type="number" min="0" step="0.01" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0.00" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-price">Selling Price</Label>
                <Input id="p-price" type="number" min="0" step="0.01" value={form.selling_price} onChange={set('selling_price')} placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-reorder">Reorder Level</Label>
              <Input id="p-reorder" type="number" min="0" value={form.reorder_level} onChange={set('reorder_level')} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-status">Status</Label>
              <Select id="p-status" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Product'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
