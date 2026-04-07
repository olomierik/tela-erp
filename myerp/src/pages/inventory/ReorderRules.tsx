import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Pencil, Trash2, ListOrdered, CheckCircle2, AlertTriangle, Zap, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReorderRule extends Record<string, unknown> {
  id: string;
  product_name: string;
  product_sku: string;
  min_qty: number;
  max_qty: number;
  reorder_qty: number;
  vendor: string;
  is_active: boolean;
  last_triggered_at: string | null;
}

interface ReorderRuleForm {
  product_name: string;
  product_sku: string;
  min_qty: string;
  max_qty: string;
  reorder_qty: string;
  vendor: string;
  is_active: boolean;
}

const BLANK_FORM: ReorderRuleForm = {
  product_name: '',
  product_sku: '',
  min_qty: '0',
  max_qty: '100',
  reorder_qty: '50',
  vendor: '',
  is_active: true,
};

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReorderRules() {
  const { rows: rules, loading, insert, update, remove, setRows } =
    useTable<ReorderRule>('myerp_reorder_rules', 'created_at', false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ReorderRule | null>(null);
  const [form, setForm] = useState<ReorderRuleForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [belowMin, setBelowMin] = useState(0);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Fetch products below reorder level (stock_qty < reorder_level)
  useEffect(() => {
    async function fetchBelowMin() {
      const { data: products } = await supabase
        .from('myerp_products')
        .select('stock_qty, reorder_level');
      if (products) {
        const count = (products as { stock_qty: number; reorder_level: number }[]).filter(
          p => Number(p.stock_qty) < Number(p.reorder_level),
        ).length;
        setBelowMin(count);
      }
    }
    fetchBelowMin();
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalRules = rules.length;
  const activeRules = rules.filter(r => r.is_active).length;
  const triggeredThisWeek = rules.filter(r => {
    if (!r.last_triggered_at) return false;
    return new Date(r.last_triggered_at) >= sevenDaysAgo();
  }).length;

  // ── Sheet helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(BLANK_FORM);
    setSheetOpen(true);
  }

  function openEdit(rule: ReorderRule) {
    setEditing(rule);
    setForm({
      product_name: rule.product_name,
      product_sku: rule.product_sku,
      min_qty: String(rule.min_qty),
      max_qty: String(rule.max_qty),
      reorder_qty: String(rule.reorder_qty),
      vendor: rule.vendor ?? '',
      is_active: rule.is_active,
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.product_name.trim()) { toast.error('Product name is required.'); return; }
    if (!form.product_sku.trim()) { toast.error('Product SKU is required.'); return; }
    const payload = {
      product_name: form.product_name.trim(),
      product_sku: form.product_sku.trim(),
      min_qty: parseInt(form.min_qty) || 0,
      max_qty: parseInt(form.max_qty) || 0,
      reorder_qty: parseInt(form.reorder_qty) || 0,
      vendor: form.vendor.trim(),
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Reorder rule updated.');
      } else {
        await insert(payload);
        toast.success('Reorder rule created.');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Reorder rule deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rule.');
    }
  }

  async function handleToggleActive(rule: ReorderRule) {
    setToggleLoading(rule.id);
    try {
      const updated = await update(rule.id, { is_active: !rule.is_active });
      setRows(prev => prev.map(r => r.id === rule.id ? updated : r));
      toast.success(
        rule.is_active
          ? `Rule for ${rule.product_name} deactivated.`
          : `Rule for ${rule.product_name} activated.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update rule.');
    } finally {
      setToggleLoading(null);
    }
  }

  async function handleTrigger(rule: ReorderRule) {
    setTriggerLoading(rule.id);
    try {
      const now = new Date().toISOString();
      const updated = await update(rule.id, { last_triggered_at: now });
      setRows(prev => prev.map(r => r.id === rule.id ? updated : r));
      toast.success(
        `Recommendation: Order ${rule.reorder_qty} units of ${rule.product_name} from ${rule.vendor || 'your vendor'}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger rule.');
    } finally {
      setTriggerLoading(null);
    }
  }

  const set = (key: keyof Omit<ReorderRuleForm, 'is_active'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Reorder Rules">
      <PageHeader
        title="Reorder Rules"
        subtitle="Automate stock replenishment with min/max reorder thresholds."
        action={{ label: 'New Rule', onClick: openCreate }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Rules</CardTitle>
            <ListOrdered className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{totalRules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Rules</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums text-success">{activeRules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Products Below Min</CardTitle>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums text-warning">{belowMin}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Triggered This Week</CardTitle>
            <Zap className="w-4 h-4 text-info" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{triggeredThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Min Qty</TableHead>
                    <TableHead className="text-right">Max Qty</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                        No reorder rules configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.product_name}</TableCell>
                        <TableCell className="font-mono text-sm">{rule.product_sku}</TableCell>
                        <TableCell className="text-right tabular-nums">{rule.min_qty}</TableCell>
                        <TableCell className="text-right tabular-nums">{rule.max_qty}</TableCell>
                        <TableCell className="text-right tabular-nums">{rule.reorder_qty}</TableCell>
                        <TableCell>
                          {rule.vendor || <span className="text-muted-foreground italic text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                            {rule.is_active ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rule.last_triggered_at
                            ? formatDate(rule.last_triggered_at)
                            : <span className="text-muted-foreground italic text-xs">Never</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {/* Trigger Now */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleTrigger(rule)}
                              disabled={triggerLoading === rule.id || !rule.is_active}
                              title="Trigger reorder recommendation"
                            >
                              {triggerLoading === rule.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Zap className="w-3.5 h-3.5" />}
                              Trigger
                            </Button>

                            {/* Toggle Active */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleToggleActive(rule)}
                              disabled={toggleLoading === rule.id}
                              title={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
                            >
                              {toggleLoading === rule.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : rule.is_active ? 'Deactivate' : 'Activate'}
                            </Button>

                            {/* Edit */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => openEdit(rule)}
                              title="Edit rule"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            {/* Delete */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(rule.id)}
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Reorder Rule' : 'New Reorder Rule'}</SheetTitle>
          </SheetHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="rr-product">Product Name *</Label>
              <Input
                id="rr-product"
                value={form.product_name}
                onChange={set('product_name')}
                placeholder="e.g. Widget A"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rr-sku">Product SKU *</Label>
              <Input
                id="rr-sku"
                value={form.product_sku}
                onChange={set('product_sku')}
                placeholder="e.g. WGT-001"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="rr-min">Min Qty</Label>
                <Input
                  id="rr-min"
                  type="number"
                  min="0"
                  value={form.min_qty}
                  onChange={set('min_qty')}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rr-max">Max Qty</Label>
                <Input
                  id="rr-max"
                  type="number"
                  min="0"
                  value={form.max_qty}
                  onChange={set('max_qty')}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rr-reorder">Reorder Qty</Label>
                <Input
                  id="rr-reorder"
                  type="number"
                  min="1"
                  value={form.reorder_qty}
                  onChange={set('reorder_qty')}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rr-vendor">Vendor</Label>
              <Input
                id="rr-vendor"
                value={form.vendor}
                onChange={set('vendor')}
                placeholder="Supplier name"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="rr-active"
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 cursor-pointer accent-primary"
              />
              <Label htmlFor="rr-active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
