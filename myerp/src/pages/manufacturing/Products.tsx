import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Factory, Package, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type ProductStatus = 'active' | 'inactive' | 'discontinued';

interface MfgProduct extends Record<string, unknown> {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unit_cost: number;
  status: ProductStatus;
}

type MfgProductForm = { name: string; sku: string; category: string; unit: string; unit_cost: number; status: ProductStatus; };

const BLANK: MfgProductForm = {
  name: '', sku: '', category: '', unit: 'each', unit_cost: 0, status: 'active',
};

const statusVariant: Record<ProductStatus, 'success' | 'secondary' | 'outline'> = {
  active: 'success', inactive: 'secondary', discontinued: 'outline',
};

export default function MfgProducts() {
  const { rows: items, loading, insert, update, remove } = useTable<MfgProduct>('myerp_mfg_products');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MfgProduct | null>(null);
  const [form, setForm] = useState<MfgProductForm>(BLANK);

  const activeCount       = items.filter(p => p.status === 'active').length;
  const inactiveCount     = items.filter(p => p.status === 'inactive').length;
  const discontinuedCount = items.filter(p => p.status === 'discontinued').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(product: MfgProduct) {
    setEditing(product);
    setForm({ name: product.name, sku: product.sku, category: product.category, unit: product.unit, unit_cost: product.unit_cost, status: product.status });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Product updated');
      } else {
        await insert(form);
        toast.success('Product created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Product removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof MfgProductForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Manufactured Products">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Manufactured Products">
      <PageHeader title="Manufactured Products" subtitle="Define finished goods and sub-assemblies that go through your production process." action={{ label: 'New Product', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: items.length,     icon: Package,      color: 'text-primary'     },
          { label: 'Active',         value: activeCount,      icon: CheckCircle2, color: 'text-success'     },
          { label: 'Inactive',       value: inactiveCount,    icon: Factory,      color: 'text-warning'     },
          { label: 'Discontinued',   value: discontinuedCount,icon: XCircle,      color: 'text-destructive' },
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
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>{formatCurrency(product.unit_cost)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[product.status]} className="capitalize">{product.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(product)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
            <SheetTitle>{editing ? 'Edit Product' : 'New Product'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => field('name', e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => field('sku', e.target.value)} placeholder="e.g. WGT-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => field('category', e.target.value)} placeholder="e.g. Assemblies" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => field('unit', e.target.value)} placeholder="e.g. each, kg, m" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Cost</Label>
              <Input type="number" value={form.unit_cost} onChange={e => field('unit_cost', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Product'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
