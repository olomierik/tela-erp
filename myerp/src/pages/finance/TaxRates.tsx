import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Percent, CheckCircle2, ShoppingCart, ShoppingBag, Loader2 } from 'lucide-react';

type TaxType = 'sales' | 'purchase' | 'both';

interface TaxRate extends Record<string, unknown> {
  id: string;
  name: string;
  rate: number;          // stored as decimal in DB, e.g. 0.15 = 15%
  tax_type: TaxType;
  description: string;
  is_active: boolean;
}

type TaxRateForm = {
  name: string;
  rate_display: number;  // percentage shown to user, 0–100
  tax_type: TaxType;
  description: string;
  is_active: boolean;
};

const BLANK: TaxRateForm = {
  name: '',
  rate_display: 0,
  tax_type: 'both',
  description: '',
  is_active: true,
};

const typeLabel: Record<TaxType, string> = {
  sales: 'Sales',
  purchase: 'Purchase',
  both: 'Both',
};

export default function TaxRates() {
  const { rows: taxRates, loading, insert, update, remove, setRows } = useTable<TaxRate>('myerp_tax_rates', 'name', true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<TaxRateForm>(BLANK);
  const [saving, setSaving] = useState(false);

  // KPIs
  const total = taxRates.length;
  const activeCount = taxRates.filter(t => t.is_active).length;
  const salesCount = taxRates.filter(t => t.tax_type === 'sales' || t.tax_type === 'both').length;
  const purchaseCount = taxRates.filter(t => t.tax_type === 'purchase' || t.tax_type === 'both').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(t: TaxRate) {
    setEditing(t);
    setForm({
      name: t.name as string,
      rate_display: Math.round(Number(t.rate) * 100 * 100) / 100, // decimal → percentage, avoid float noise
      tax_type: t.tax_type as TaxType,
      description: t.description as string,
      is_active: t.is_active as boolean,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.rate_display < 0 || form.rate_display > 100) { toast.error('Rate must be between 0 and 100'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      rate: form.rate_display / 100,
      tax_type: form.tax_type,
      description: form.description,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Tax rate updated');
      } else {
        await insert(payload);
        toast.success('Tax rate created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Tax rate deleted');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  async function handleToggleActive(t: TaxRate) {
    const newVal = !t.is_active;
    // Optimistic update
    setRows(prev => prev.map(r => r.id === t.id ? { ...r, is_active: newVal } : r));
    try {
      await update(t.id, { is_active: newVal });
      toast.success(newVal ? 'Tax rate activated' : 'Tax rate deactivated');
    } catch (e) {
      // Revert
      setRows(prev => prev.map(r => r.id === t.id ? { ...r, is_active: t.is_active } : r));
      toast.error((e as Error).message ?? 'Update failed');
    }
  }

  function field<K extends keyof TaxRateForm>(key: K, value: TaxRateForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Tax Rates">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Tax Rates">
      <PageHeader
        title="Tax Rates"
        subtitle="Configure sales and purchase tax rates for your transactions"
        action={{ label: 'New Tax Rate', onClick: openNew }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tax Rates', value: total, icon: Percent, color: 'text-primary' },
          { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'text-success' },
          { label: 'Sales Taxes', value: salesCount, icon: ShoppingCart, color: 'text-info' },
          { label: 'Purchase Taxes', value: purchaseCount, icon: ShoppingBag, color: 'text-warning' },
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No tax rates configured yet. Add your first one.
                  </TableCell>
                </TableRow>
              ) : (
                taxRates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono">
                      {(Math.round(Number(t.rate) * 100 * 100) / 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel[t.tax_type as TaxType]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {t.description || '—'}
                    </TableCell>
                    <TableCell>
                      {/* Toggle switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={Boolean(t.is_active)}
                          onChange={() => handleToggleActive(t)}
                        />
                        <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-success transition-colors
                          after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                          after:rounded-full after:h-4 after:w-4 after:transition-all
                          peer-checked:after:translate-x-4" />
                      </label>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet form */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Tax Rate' : 'New Tax Rate'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="tax-name">Name</Label>
              <Input
                id="tax-name"
                value={form.name}
                onChange={e => field('name', e.target.value)}
                placeholder="e.g. Standard VAT"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-rate">Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.rate_display}
                onChange={e => field('rate_display', Number(e.target.value))}
                placeholder="e.g. 16"
              />
              <p className="text-xs text-muted-foreground">Enter as a percentage (0–100). Stored as decimal in the database.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-type">Tax Type</Label>
              <Select
                id="tax-type"
                value={form.tax_type}
                onChange={e => field('tax_type', e.target.value as TaxType)}
              >
                <option value="sales">Sales</option>
                <option value="purchase">Purchase</option>
                <option value="both">Both</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-desc">Description</Label>
              <Textarea
                id="tax-desc"
                value={form.description}
                onChange={e => field('description', e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.is_active}
                  onChange={e => field('is_active', e.target.checked)}
                />
                <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-success transition-colors
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                  after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-4" />
              </label>
              <Label className="cursor-pointer" onClick={() => field('is_active', !form.is_active)}>
                Active
              </Label>
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Tax Rate'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
