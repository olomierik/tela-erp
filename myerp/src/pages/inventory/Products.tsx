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
import { genId, formatCurrency } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, Box, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface Product {
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

const INITIAL_PRODUCTS: Product[] = [
  { id: genId(), sku: 'EL-001', name: 'USB-C Hub 7-Port',          category: 'Electronics',    unit: 'pcs', unit_cost: 18.50,  selling_price: 39.99,  stock_qty: 120, reorder_level: 30,  status: 'active' },
  { id: genId(), sku: 'EL-002', name: 'Wireless Keyboard',         category: 'Electronics',    unit: 'pcs', unit_cost: 22.00,  selling_price: 49.95,  stock_qty: 15,  reorder_level: 20,  status: 'active' },
  { id: genId(), sku: 'AP-001', name: 'Men\'s Running Shorts',     category: 'Apparel',        unit: 'pcs', unit_cost: 8.75,   selling_price: 24.99,  stock_qty: 200, reorder_level: 50,  status: 'active' },
  { id: genId(), sku: 'AP-002', name: 'Sport Socks (Pair)',        category: 'Apparel',        unit: 'pair',unit_cost: 2.10,   selling_price: 7.99,   stock_qty: 0,   reorder_level: 100, status: 'active' },
  { id: genId(), sku: 'FB-001', name: 'Organic Oat Flour',         category: 'Food & Beverage',unit: 'kg',  unit_cost: 1.20,   selling_price: 3.49,   stock_qty: 500, reorder_level: 100, status: 'active' },
  { id: genId(), sku: 'FB-002', name: 'Cold Brew Coffee 1L',       category: 'Food & Beverage',unit: 'L',   unit_cost: 3.80,   selling_price: 8.99,   stock_qty: 80,  reorder_level: 40,  status: 'active' },
  { id: genId(), sku: 'OS-001', name: 'A4 Copy Paper (Box 5)',     category: 'Office Supplies', unit: 'box', unit_cost: 14.00,  selling_price: 27.50,  stock_qty: 60,  reorder_level: 20,  status: 'active' },
  { id: genId(), sku: 'OS-002', name: 'Ballpoint Pens (12-Pack)', category: 'Office Supplies', unit: 'box', unit_cost: 2.50,   selling_price: 6.99,   stock_qty: 8,   reorder_level: 10,  status: 'active' },
  { id: genId(), sku: 'HW-001', name: 'Stainless Steel Bolts M8', category: 'Hardware',        unit: 'box', unit_cost: 5.60,   selling_price: 12.00,  stock_qty: 300, reorder_level: 50,  status: 'active' },
  { id: genId(), sku: 'HW-002', name: 'Industrial Drill Bit Set', category: 'Hardware',        unit: 'pcs', unit_cost: 28.00,  selling_price: 59.99,  stock_qty: 0,   reorder_level: 5,   status: 'inactive' },
  { id: genId(), sku: 'FN-001', name: 'Ergonomic Office Chair',   category: 'Furniture',       unit: 'pcs', unit_cost: 145.00, selling_price: 299.00, stock_qty: 12,  reorder_level: 5,   status: 'active' },
  { id: genId(), sku: 'FN-002', name: 'Standing Desk 140cm',      category: 'Furniture',       unit: 'pcs', unit_cost: 220.00, selling_price: 449.00, stock_qty: 4,   reorder_level: 4,   status: 'active' },
  { id: genId(), sku: 'EL-003', name: 'HDMI Cable 2m',            category: 'Electronics',    unit: 'pcs', unit_cost: 4.20,   selling_price: 11.99,  stock_qty: 75,  reorder_level: 20,  status: 'active' },
  { id: genId(), sku: 'AP-003', name: 'Waterproof Jacket',        category: 'Apparel',        unit: 'pcs', unit_cost: 38.00,  selling_price: 89.99,  stock_qty: 0,   reorder_level: 10,  status: 'discontinued' },
  { id: genId(), sku: 'FB-003', name: 'Whey Protein 1kg',         category: 'Food & Beverage',unit: 'kg',  unit_cost: 14.50,  selling_price: 32.99,  stock_qty: 22,  reorder_level: 25,  status: 'active' },
];

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
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const lowStock = products.filter(p => p.stock_qty <= p.reorder_level).length;
  const totalInventoryValue = products.reduce((s, p) => s + p.unit_cost * p.stock_qty, 0);

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

  function handleSave() {
    if (!form.sku.trim()) { toast.error('SKU is required'); return; }
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const parsed: Omit<Product, 'id'> = {
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
    if (editing) {
      setProducts(ps => ps.map(p => p.id === editing.id ? { ...parsed, id: editing.id } : p));
      toast.success('Product updated');
    } else {
      setProducts(ps => [...ps, { ...parsed, id: genId() }]);
      toast.success('Product added');
    }
    setSheetOpen(false);
  }

  function handleDelete(id: string) {
    setProducts(ps => ps.filter(p => p.id !== id));
    toast.success('Product removed');
  }

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

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
                    <TableCell>{formatCurrency(p.unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell>{p.stock_qty}</TableCell>
                    <TableCell>{p.reorder_level}</TableCell>
                    <TableCell><StockDot qty={p.stock_qty} reorder={p.reorder_level} /></TableCell>
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
