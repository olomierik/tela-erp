import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Users,
  TrendingUp,
  DollarSign,
  UserX,
  Pencil,
  Trash2,
  Loader2,
  PauseCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubStatus = 'trial' | 'active' | 'paused' | 'cancelled' | 'expired';
type Currency = 'USD' | 'EUR' | 'GBP' | 'KES';
type BillingPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface Subscription extends Record<string, unknown> {
  id: string;
  user_id: string;
  subscription_number: string;
  customer_name: string;
  customer_email: string;
  plan_id: string;
  plan_name: string;
  price: number;
  currency: Currency;
  billing_period: BillingPeriod;
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
  status: SubStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  billing_period: BillingPeriod;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface SubForm {
  customer_name: string;
  customer_email: string;
  plan_id: string;
  plan_name: string;
  price: number | '';
  currency: Currency;
  billing_period: BillingPeriod;
  start_date: string;
  end_date: string;
  next_billing_date: string;
  status: SubStatus;
  notes: string;
}

const emptySubForm: SubForm = {
  customer_name: '',
  customer_email: '',
  plan_id: '',
  plan_name: '',
  price: '',
  currency: 'USD',
  billing_period: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  next_billing_date: '',
  status: 'active',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info';

const STATUS_VARIANTS: Record<SubStatus, BadgeVariant> = {
  trial: 'secondary',
  active: 'success',
  paused: 'warning',
  cancelled: 'outline',
  expired: 'destructive',
};

const STATUS_LABELS: Record<SubStatus, string> = {
  trial: 'Trial',
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KES ',
};

function fmtPrice(price: number, currency: Currency, period: BillingPeriod) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  const periodShort: Record<BillingPeriod, string> = {
    weekly: '/wk',
    monthly: '/mo',
    quarterly: '/qtr',
    yearly: '/yr',
  };
  return `${sym}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${periodShort[period] ?? ''}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

/**
 * Generate subscription number SUB-YYYY-NNN based on current count.
 */
function generateSubNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(3, '0');
  return `SUB-${year}-${seq}`;
}

/**
 * Compute MRR from active/trial subscriptions.
 * monthly → price as-is; yearly → price/12; quarterly → price/3; weekly → price*4.33
 */
function computeMrr(rows: Subscription[]): number {
  return rows
    .filter(s => s.status === 'active' || s.status === 'trial')
    .reduce((sum, s) => {
      const p = s.price || 0;
      switch (s.billing_period) {
        case 'monthly':
          return sum + p;
        case 'yearly':
          return sum + p / 12;
        case 'quarterly':
          return sum + p / 3;
        case 'weekly':
          return sum + p * (52 / 12);
        default:
          return sum + p;
      }
    }, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Subscriptions() {
  const { rows: subs, loading, insert, update, remove } =
    useTable<Subscription>('myerp_subscriptions');

  const [plans, setPlans] = useState<PlanOption[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SubForm>(emptySubForm);
  const [saving, setSaving] = useState(false);

  // ── Fetch plans ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from('myerp_subscription_plans')
        .select('id, name, price, currency, billing_period')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setPlans((data ?? []) as PlanOption[]);
    }
    fetchPlans();
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalSubs = subs.length;
  const activeSubs = subs.filter(s => s.status === 'active').length;
  const mrr = computeMrr(subs);
  const churned = subs.filter(
    s => s.status === 'cancelled' || s.status === 'expired',
  ).length;

  // ── Filtered rows ─────────────────────────────────────────────────────────

  const filtered = subs.filter(s => {
    const matchSearch =
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      s.subscription_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchPlan = planFilter === 'all' || s.plan_id === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  // ── Sheet open/close ──────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setForm(emptySubForm);
    setSheetOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditId(sub.id);
    setForm({
      customer_name: sub.customer_name,
      customer_email: sub.customer_email,
      plan_id: sub.plan_id ?? '',
      plan_name: sub.plan_name ?? '',
      price: sub.price,
      currency: sub.currency,
      billing_period: sub.billing_period,
      start_date: sub.start_date ? sub.start_date.slice(0, 10) : '',
      end_date: sub.end_date ? sub.end_date.slice(0, 10) : '',
      next_billing_date: sub.next_billing_date
        ? sub.next_billing_date.slice(0, 10)
        : '',
      status: sub.status,
      notes: sub.notes ?? '',
    });
    setSheetOpen(true);
  }

  // ── When plan changes, auto-fill price/currency/period ───────────────────

  function handlePlanChange(planId: string) {
    const found = plans.find(p => p.id === planId);
    setForm(f => ({
      ...f,
      plan_id: planId,
      plan_name: found?.name ?? '',
      price: found?.price ?? '',
      currency: found?.currency ?? 'USD',
      billing_period: found?.billing_period ?? 'monthly',
    }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.customer_name.trim() || !form.customer_email.trim()) {
      toast.error('Customer name and email are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        plan_id: form.plan_id || null,
        plan_name: form.plan_name,
        price: Number(form.price) || 0,
        currency: form.currency,
        billing_period: form.billing_period,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        next_billing_date: form.next_billing_date || null,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editId) {
        await update(editId, payload);
        toast.success('Subscription updated');
      } else {
        const subNumber = generateSubNumber(subs.length);
        await insert({
          ...payload,
          subscription_number: subNumber,
        });
        toast.success('Subscription created');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Subscription deleted');
    } catch {
      toast.error('Failed to delete subscription');
    }
  }

  // ── Status transitions ────────────────────────────────────────────────────

  async function handleSetStatus(sub: Subscription, status: SubStatus) {
    try {
      await update(sub.id, { status });
      toast.success(
        `Subscription ${STATUS_LABELS[status].toLowerCase()}`,
      );
    } catch {
      toast.error('Failed to update status');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Subscriptions">
      <PageHeader
        title="Subscriptions"
        subtitle="Track and manage customer subscriptions and recurring billing."
        action={{ label: 'New Subscription', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{totalSubs}</span>
              <Users className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{activeSubs}</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">
                ${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <DollarSign className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Churned
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{churned}</span>
              <UserX className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search by customer or sub #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="sm:max-w-[160px]"
        >
          <option value="all">All Statuses</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </Select>
        <Select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="sm:max-w-[200px]"
        >
          <option value="all">All Plans</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price / Period</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-10"
                      >
                        No subscriptions found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {sub.subscription_number}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sub.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.customer_email}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.plan_name || '—'}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {fmtPrice(sub.price, sub.currency, sub.billing_period)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {fmtDate(sub.start_date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {fmtDate(sub.next_billing_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[sub.status]}>
                          {STATUS_LABELS[sub.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {sub.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              title="Pause"
                              onClick={() => handleSetStatus(sub, 'paused')}
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {sub.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              title="Resume"
                              onClick={() => handleSetStatus(sub, 'active')}
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(sub.status === 'active' ||
                            sub.status === 'trial' ||
                            sub.status === 'paused') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Cancel"
                              onClick={() => handleSetStatus(sub, 'cancelled')}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(sub)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(sub.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Subscription Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editId ? 'Edit Subscription' : 'New Subscription'}
            </SheetTitle>
            <SheetDescription>
              {editId
                ? 'Update the subscription details.'
                : 'Create a new customer subscription.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="s-cname">Customer Name *</Label>
                <Input
                  id="s-cname"
                  placeholder="Jane Doe"
                  value={form.customer_name}
                  onChange={e =>
                    setForm(f => ({ ...f, customer_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="s-cemail">Customer Email *</Label>
                <Input
                  id="s-cemail"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.customer_email}
                  onChange={e =>
                    setForm(f => ({ ...f, customer_email: e.target.value }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Plan selector */}
            <div className="space-y-1.5">
              <Label htmlFor="s-plan">Plan</Label>
              <Select
                id="s-plan"
                value={form.plan_id}
                onChange={e => handlePlanChange(e.target.value)}
              >
                <option value="">— Select a plan —</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Price / currency / period (auto-filled but editable) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-price">Price</Label>
                <Input
                  id="s-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      price:
                        e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-currency">Currency</Label>
                <Select
                  id="s-currency"
                  value={form.currency}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      currency: e.target.value as Currency,
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KES">KES</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-period">Billing Period</Label>
                <Select
                  id="s-period"
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
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-start">Start Date</Label>
                <Input
                  id="s-start"
                  type="date"
                  value={form.start_date}
                  onChange={e =>
                    setForm(f => ({ ...f, start_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-end">End Date</Label>
                <Input
                  id="s-end"
                  type="date"
                  value={form.end_date}
                  onChange={e =>
                    setForm(f => ({ ...f, end_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-nextbill">Next Billing Date</Label>
                <Input
                  id="s-nextbill"
                  type="date"
                  value={form.next_billing_date}
                  onChange={e =>
                    setForm(f => ({ ...f, next_billing_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-status">Status</Label>
                <Select
                  id="s-status"
                  value={form.status}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      status: e.target.value as SubStatus,
                    }))
                  }
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="s-notes">Notes</Label>
              <Textarea
                id="s-notes"
                placeholder="Any additional notes about this subscription…"
                rows={3}
                value={form.notes}
                onChange={e =>
                  setForm(f => ({ ...f, notes: e.target.value }))
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
              {editId ? 'Save Changes' : 'Create Subscription'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
