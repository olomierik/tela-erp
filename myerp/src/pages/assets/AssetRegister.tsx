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
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Package, DollarSign, TrendingDown, BarChart3, Loader2 } from 'lucide-react';

type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor';
type AssetStatus    = 'active' | 'disposed' | 'under_maintenance';

interface Asset extends Record<string, unknown> {
  id: string;
  asset_number: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  location: string;
  condition: AssetCondition;
  status: AssetStatus;
}

type AssetForm = { asset_number: string; name: string; category: string; purchase_date: string; purchase_cost: number; current_value: number; location: string; condition: AssetCondition; status: AssetStatus; };

const BLANK: AssetForm = {
  asset_number: '', name: '', category: 'IT Equipment', purchase_date: '',
  purchase_cost: 0, current_value: 0, location: '', condition: 'good', status: 'active',
};

const conditionVariant: Record<AssetCondition, 'success' | 'info' | 'warning' | 'destructive'> = {
  excellent: 'success', good: 'info', fair: 'warning', poor: 'destructive',
};

const statusVariant: Record<AssetStatus, 'success' | 'outline' | 'warning'> = {
  active: 'success', disposed: 'outline', under_maintenance: 'warning',
};

const statusLabel: Record<AssetStatus, string> = {
  active: 'Active', disposed: 'Disposed', under_maintenance: 'Maintenance',
};

export default function AssetRegister() {
  const { rows: assets, loading, insert, update, remove } = useTable<Asset>('myerp_assets');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetForm>(BLANK);

  const totalAssets       = assets.length;
  const totalPurchaseCost = assets.reduce((s, a) => s + a.purchase_cost, 0);
  const totalCurrentValue = assets.reduce((s, a) => s + a.current_value, 0);
  const totalDepreciated  = totalPurchaseCost - totalCurrentValue;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(asset: Asset) {
    setEditing(asset);
    setForm({ asset_number: asset.asset_number, name: asset.name, category: asset.category, purchase_date: asset.purchase_date, purchase_cost: asset.purchase_cost, current_value: asset.current_value, location: asset.location, condition: asset.condition, status: asset.status });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Asset name is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Asset updated');
      } else {
        await insert(form);
        toast.success('Asset added');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Asset removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof AssetForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Asset Register">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Asset Register">
      <PageHeader title="Asset Register" subtitle="Maintain and track all company fixed assets" action={{ label: 'Add Asset', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Assets',        value: totalAssets,                      icon: Package,      color: 'text-primary'     },
          { label: 'Total Purchase Cost', value: formatCurrency(totalPurchaseCost), icon: DollarSign,   color: 'text-info'        },
          { label: 'Current Book Value',  value: formatCurrency(totalCurrentValue), icon: BarChart3,    color: 'text-success'     },
          { label: 'Total Depreciated',   value: formatCurrency(totalDepreciated),  icon: TrendingDown, color: 'text-destructive' },
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
                <TableHead>Asset #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Purchase Cost</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-xs">{asset.asset_number}</TableCell>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{formatDate(asset.purchase_date)}</TableCell>
                  <TableCell>{formatCurrency(asset.purchase_cost)}</TableCell>
                  <TableCell>{formatCurrency(asset.current_value)}</TableCell>
                  <TableCell>{asset.location}</TableCell>
                  <TableCell>
                    <Badge variant={conditionVariant[asset.condition]} className="capitalize">{asset.condition}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[asset.status]}>{statusLabel[asset.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(asset)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(asset.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
            <SheetTitle>{editing ? 'Edit Asset' : 'Add Asset'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Asset #</Label>
              <Input value={form.asset_number} onChange={e => field('asset_number', e.target.value)} placeholder="AST-011" />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => field('name', e.target.value)} placeholder="Asset name" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onChange={e => field('category', e.target.value)}>
                {['IT Equipment', 'Vehicles', 'Furniture', 'Machinery', 'Buildings'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={e => field('purchase_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Cost</Label>
              <Input type="number" value={form.purchase_cost} onChange={e => field('purchase_cost', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Value</Label>
              <Input type="number" value={form.current_value} onChange={e => field('current_value', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => field('location', e.target.value)} placeholder="e.g. Office Floor 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={form.condition} onChange={e => field('condition', e.target.value as AssetCondition)}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value as AssetStatus)}>
                <option value="active">Active</option>
                <option value="disposed">Disposed</option>
                <option value="under_maintenance">Under Maintenance</option>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Asset'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
