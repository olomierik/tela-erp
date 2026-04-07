import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import {
  Layers,
  CheckCircle2,
  DollarSign,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Currency = 'USD' | 'EUR' | 'GBP' | 'KES';
type BillingPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface SubscriptionPlan extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  billing_period: BillingPeriod;
  trial_days: number;
  is_active: boolean;
  features: string;
  created_at: string;
  updated_at: string;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface PlanForm {
  name: string;
  description: string;
  price: number | '';
  currency: Currency;
  billing_period: BillingPeriod;
  trial_days: number | '';
  is_active: boolean;
  features: string;
}

const emptyPlanForm: PlanForm = {
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  billing_period: 'monthly',
  trial_days: '',
  is_active: true,
  features: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KES ',
};

const PERIOD_LABELS: Record<BillingPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function fmtPrice(price: number, currency: Currency) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${sym}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Plans() {
  const { rows: plans, loading, insert, update, remove } =
    useTable<SubscriptionPlan>('myerp_subscription_plans');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyPlanForm);
  const [saving, setSaving] = useState(false);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.is_active).length;
  const avgPrice =
    plans.length
      ? plans.reduce((s, p) => s + (p.price || 0), 0) / plans.length
      : 0;

  // ── Sheet open/close ──────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setForm(emptyPlanForm);
    setSheetOpen(true);
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price,
      currency: plan.currency,
      billing_period: plan.billing_period,
      trial_days: plan.trial_days ?? '',
      is_active: plan.is_active,
      features: plan.features ?? '',
    });
    setSheetOpen(true);
  }

  // ── Inline is_active toggle ───────────────────────────────────────────────

  async function handleToggleActive(plan: SubscriptionPlan) {
    try {
      await update(plan.id, { is_active: !plan.is_active });
      toast.success(
        `Plan ${!plan.is_active ? 'activated' : 'deactivated'}`,
      );
    } catch {
      toast.error('Failed to update plan status');
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.price === '' || Number(form.price) < 0) {
      toast.error('A valid price is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        currency: form.currency,
        billing_period: form.billing_period,
        trial_days: form.trial_days === '' ? 0 : Number(form.trial_days),
        is_active: form.is_active,
        features: form.features.trim(),
      };
      if (editId) {
        await update(editId, payload);
        toast.success('Plan updated');
      } else {
        await insert(payload);
        toast.success('Plan created');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Plan deleted');
    } catch {
      toast.error('Failed to delete plan');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Subscription Plans">
      <PageHeader
        title="Subscription Plans"
        subtitle="Define pricing tiers and billing periods for your subscription products."
        action={{ label: 'New Plan', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{totalPlans}</span>
              <Layers className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{activePlans}</span>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Avg Price
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">
                {avgPrice > 0
                  ? `$${avgPrice.toFixed(2)}`
                  : '—'}
              </span>
              <DollarSign className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead className="text-right">Trial Days</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-10"
                    >
                      No plans found. Create your first plan.
                    </TableCell>
                  </TableRow>
                )}
                {plans.map(plan => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      {plan.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {plan.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {fmtPrice(plan.price, plan.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PERIOD_LABELS[plan.billing_period] ?? plan.billing_period}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {plan.trial_days > 0 ? `${plan.trial_days}d` : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={() => handleToggleActive(plan)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(plan)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Plan Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Plan' : 'New Plan'}</SheetTitle>
            <SheetDescription>
              {editId
                ? 'Update the subscription plan details.'
                : 'Create a new subscription pricing plan.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Plan Name *</Label>
              <Input
                id="p-name"
                placeholder="Pro Monthly"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                placeholder="Brief description of this plan…"
                rows={2}
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price *</Label>
                <Input
                  id="p-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="29.99"
                  value={form.price}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      price: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-currency">Currency</Label>
                <Select
                  id="p-currency"
                  value={form.currency}
                  onChange={e =>
                    setForm(f => ({ ...f, currency: e.target.value as Currency }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KES">KES</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-period">Billing Period</Label>
                <Select
                  id="p-period"
                  value={form.billing_period}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      billing_period: e.target.value as BillingPeriod,
                    }))
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-trial">Trial Days</Label>
                <Input
                  id="p-trial"
                  type="number"
                  min="0"
                  placeholder="14"
                  value={form.trial_days}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      trial_days:
                        e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="p-features">
                Features{' '}
                <span className="text-muted-foreground font-normal text-xs">
                  (one feature per line)
                </span>
              </Label>
              <Textarea
                id="p-features"
                placeholder={'Unlimited users\nPriority support\nCustom domain'}
                rows={5}
                value={form.features}
                onChange={e =>
                  setForm(f => ({ ...f, features: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive plans are hidden from new subscriptions.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={val =>
                  setForm(f => ({ ...f, is_active: val }))
                }
              />
            </div>
          </div>

          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              )}
              {editId ? 'Save Changes' : 'Create Plan'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
