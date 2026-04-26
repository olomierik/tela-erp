import { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Plus, Users, TrendingUp, XCircle, AlertTriangle, CheckCircle2, FileText, Loader2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTenantQuery, useTenantInsert } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePeriod } from '@/contexts/PeriodContext';

const STATUS_COLORS: Record<string, string> = {
  trial:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused:    'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const INV_STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  overdue:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600',
};

const EMPTY_FORM = {
  customer_name: '',
  customer_email: '',
  plan_id: '',
  plan_name: '',
  price: '',
  currency: 'USD',
  billing_period: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
  status: 'active',
  notes: '',
};

type SubInvoice = {
  id: string; subscription_id: string; tenant_id: string;
  invoice_number: string; period: string; period_start: string; period_end: string;
  due_date: string; amount: number; currency: string; status: string;
  paid_at: string | null;
};

export default function Subscriptions() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { month: globalMonth } = usePeriod();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Record<string, SubInvoice[]>>({});
  const [loadingInv, setLoadingInv] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rawSubs, isLoading, refetch } = useTenantQuery('subscriptions' as any);
  const { data: services = [] } = useTenantQuery('inventory_items' as any);
  const { data: customers = [] } = useTenantQuery('customers' as any);
  const insert = useTenantInsert('subscriptions' as any);

  const subs: any[] = (rawSubs as any[]) ?? [];
  const customerList: any[] = ((customers as any[]) ?? []).filter((c: any) => c?.is_active !== false);

  // Service catalog: inventory items whose category indicates a service
  const serviceCatalog = useMemo(() => {
    const SERVICE_KEYWORDS = ['service', 'consult', 'subscription', 'filing', 'accounting', 'compliance', 'maintenance'];
    return ((services as any[]) || []).filter((it: any) => {
      const cat = String(it?.category || '').toLowerCase();
      return SERVICE_KEYWORDS.some(k => cat.includes(k));
    });
  }, [services]);

  // ── Load all invoices for all subscriptions, plus auto-refresh overdue ────
  useEffect(() => {
    if (isDemo || !tenant?.id) return;
    let cancelled = false;
    (async () => {
      // 1. ensure overdue is up-to-date
      try { await (supabase as any).rpc('refresh_subscription_invoice_overdue'); } catch { /* non-fatal */ }
      // 2. load all invoices for this tenant in one query
      const { data } = await (supabase as any).from('subscription_invoices')
        .select('*').eq('tenant_id', tenant.id).order('period', { ascending: true });
      if (cancelled) return;
      const map: Record<string, SubInvoice[]> = {};
      (data ?? []).forEach((row: SubInvoice) => {
        (map[row.subscription_id] ||= []).push(row);
      });
      setInvoices(map);
    })();
    return () => { cancelled = true; };
  }, [tenant?.id, isDemo, subs.length]);

  const filtered = subs.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search || s.subscription_number?.toLowerCase().includes(q)
      || s.customer_name?.toLowerCase().includes(q)
      || s.plan_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active    = subs.filter(s => s.status === 'active');
  const trial     = subs.filter(s => s.status === 'trial');
  const cancelled = subs.filter(s => s.status === 'cancelled');
  const mrr = active.filter(s => s.billing_period === 'monthly').reduce((sum, s) => sum + (s.price ?? 0), 0)
            + active.filter(s => s.billing_period === 'yearly').reduce((sum, s) => sum + (s.price ?? 0) / 12, 0);

  // Aggregate alerts across all subscriptions
  const alertSummary = useMemo(() => {
    let overdueCount = 0, overdueAmount = 0, pendingCount = 0;
    Object.values(invoices).flat().forEach(inv => {
      if (inv.status === 'overdue') { overdueCount++; overdueAmount += Number(inv.amount || 0); }
      if (inv.status === 'pending') pendingCount++;
    });
    return { overdueCount, overdueAmount, pendingCount };
  }, [invoices]);

  const subAlerts = (subId: string) => {
    const list = invoices[subId] || [];
    return {
      overdue: list.filter(i => i.status === 'overdue').length,
      pending: list.filter(i => i.status === 'pending').length,
      total: list.length,
      paid: list.filter(i => i.status === 'paid').length,
    };
  };

  // ── Selecting a plan from inventory catalog auto-fills price and name ────
  const onSelectPlan = (planId: string) => {
    const plan = serviceCatalog.find((p: any) => p.id === planId);
    if (!plan) { setForm(f => ({ ...f, plan_id: '', plan_name: '' })); return; }
    setForm(f => ({
      ...f,
      plan_id: plan.id,
      plan_name: plan.name,
      price: String(plan.selling_price || plan.unit_cost || ''),
    }));
  };

  // ── Selecting a customer from Customers module auto-fills name & email ──
  const onSelectCustomer = (customerId: string) => {
    if (customerId === '__manual__') {
      setForm(f => ({ ...f, customer_name: '', customer_email: '' }));
      return;
    }
    const c = customerList.find((x: any) => x.id === customerId);
    if (!c) return;
    setForm(f => ({
      ...f,
      customer_name: c.name || '',
      customer_email: c.email || '',
    }));
  };

  const handleSubmit = async () => {
    if (!form.customer_name || !form.plan_name) { toast.error('Customer name and plan are required'); return; }
    if (isDemo) { toast.success('Demo mode — not saved'); setCreateOpen(false); return; }
    try {
      const payload: any = {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        plan_id: form.plan_id || null,
        plan_name: form.plan_name,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        billing_period: form.billing_period,
        start_date: form.start_date,
        status: form.status,
        notes: form.notes,
        subscription_number: `SUB-${Date.now().toString().slice(-5)}`,
      };
      const created: any = await insert.mutateAsync(payload);
      // Auto-generate the 12 monthly invoices
      const newId = Array.isArray(created) ? created[0]?.id : created?.id;
      if (newId) {
        await (supabase as any).rpc('generate_subscription_invoices', { _subscription_id: newId });
        toast.success('Subscription created with 12-month billing cycle');
      }
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const generateForExisting = async (subId: string) => {
    if (isDemo) { toast.info('Demo mode'); return; }
    setBusyId(subId);
    try {
      const { data } = await (supabase as any).rpc('generate_subscription_invoices', { _subscription_id: subId });
      toast.success(`Generated ${data ?? 0} new monthly invoice(s)`);
      const { data: rows } = await (supabase as any).from('subscription_invoices')
        .select('*').eq('subscription_id', subId).order('period');
      setInvoices(prev => ({ ...prev, [subId]: rows ?? [] }));
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const togglePaid = async (inv: SubInvoice) => {
    if (isDemo) { toast.info('Demo mode'); return; }
    const next = inv.status === 'paid' ? 'pending' : 'paid';
    setBusyId(inv.id);
    try {
      await (supabase as any).rpc('set_subscription_invoice_status',
        { _invoice_id: inv.id, _status: next });
      setInvoices(prev => {
        const list = (prev[inv.subscription_id] || []).map(i =>
          i.id === inv.id ? { ...i, status: next, paid_at: next === 'paid' ? new Date().toISOString() : null } : i);
        return { ...prev, [inv.subscription_id]: list };
      });
      toast.success(next === 'paid' ? 'Marked as paid' : 'Marked as unpaid');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const stats = [
    { label: 'Active', value: active.length, icon: Users, color: 'text-emerald-500' },
    { label: 'Trial', value: trial.length, icon: RefreshCw, color: 'text-yellow-500' },
    { label: 'MRR', value: formatMoney(mrr), icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Cancelled', value: cancelled.length, icon: XCircle, color: 'text-red-500' },
  ];

  // ── Export annual subscription revenue report (PDF) ──────────────────────
  const exportRevenuePDF = () => {
    const year = new Date().getFullYear();
    const fmt = (n: number) => Math.round(n).toLocaleString();

    // Per-customer annual expected revenue
    const perCustomer = subs.map((s: any) => {
      const monthly = s.billing_period === 'yearly'    ? (s.price ?? 0) / 12
                    : s.billing_period === 'quarterly' ? (s.price ?? 0) / 3
                    : s.billing_period === 'weekly'    ? (s.price ?? 0) * 4
                    : (s.price ?? 0);
      const annual = monthly * 12;
      const list = invoices[s.id] || [];
      const paid    = list.filter(i => i.status === 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
      const overdue = list.filter(i => i.status === 'overdue').reduce((a, i) => a + Number(i.amount || 0), 0);
      const pending = list.filter(i => i.status === 'pending').reduce((a, i) => a + Number(i.amount || 0), 0);
      const collected_pct = annual > 0 ? (paid / annual) * 100 : 0;
      return { ...s, monthly, annual, paid, overdue, pending, collected_pct };
    });

    const totalAnnual  = perCustomer.reduce((a, c) => a + c.annual, 0);
    const totalPaid    = perCustomer.reduce((a, c) => a + c.paid, 0);
    const totalOverdue = perCustomer.reduce((a, c) => a + c.overdue, 0);
    const totalPending = perCustomer.reduce((a, c) => a + c.pending, 0);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Subscription Revenue Report', 40, 28);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Year ${year} · ${tenant?.name || 'Company'}`, 40, 46);
    doc.text(new Date().toLocaleDateString(), pageW - 40, 46, { align: 'right' });

    autoTable(doc, {
      startY: 76,
      head: [['Summary', 'Amount']],
      body: [
        ['Total expected annual revenue', fmt(totalAnnual)],
        ['Collected (paid invoices)',     fmt(totalPaid)],
        ['Pending',                        fmt(totalPending)],
        ['Overdue',                        fmt(totalOverdue)],
        ['Active subscriptions',           String(active.length)],
        ['Total customers',                String(perCustomer.length)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 40, right: 40 },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Customer', 'Plan', 'Billing', 'Monthly', 'Annual Expected', 'Paid', 'Pending', 'Overdue', '% Collected', 'Status']],
      body: perCustomer.map(c => [
        c.customer_name || '—',
        c.plan_name || '—',
        c.billing_period || '—',
        fmt(c.monthly),
        fmt(c.annual),
        fmt(c.paid),
        fmt(c.pending),
        fmt(c.overdue),
        c.collected_pct.toFixed(0) + '%',
        c.status || '—',
      ]),
      foot: [[
        'TOTALS', '', '', '', fmt(totalAnnual), fmt(totalPaid), fmt(totalPending), fmt(totalOverdue),
        totalAnnual > 0 ? ((totalPaid / totalAnnual) * 100).toFixed(0) + '%' : '0%', '',
      ]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
        6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' },
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`subscription-revenue-${year}.pdf`);
    toast.success(`Subscription revenue report for ${year} downloaded`);
  };

  return (
    <AppLayout title="Subscriptions" subtitle="Manage recurring customer subscriptions & 12-month billing">
      <div className="space-y-6">

        {/* Overdue alert banner */}
        {alertSummary.overdueCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {alertSummary.overdueCount} overdue invoice{alertSummary.overdueCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                Total overdue: {formatMoney(alertSummary.overdueAmount)} — review the rows below and mark paid where applicable.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={cn('w-8 h-8', s.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search subscriptions..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="ml-auto gap-2" onClick={exportRevenuePDF} disabled={subs.length === 0}>
            <Download className="w-4 h-4" /> Export Revenue PDF
          </Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Subscription</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Paid / Total</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && !isDemo ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No subscriptions found</TableCell></TableRow>
                  ) : filtered.map(s => {
                    const a = subAlerts(s.id);
                    const isOpen = expanded === s.id;
                    return (
                      <>
                        <TableRow key={s.id} className={cn(a.overdue > 0 && 'bg-red-50/40 dark:bg-red-950/10')}>
                          <TableCell className="font-mono text-xs font-medium">{s.subscription_number}</TableCell>
                          <TableCell><div className="font-medium">{s.customer_name}</div><div className="text-xs text-muted-foreground">{s.customer_email}</div></TableCell>
                          <TableCell>{s.plan_name}</TableCell>
                          <TableCell>{formatMoney(s.price ?? 0)}</TableCell>
                          <TableCell className="capitalize">{s.billing_period}</TableCell>
                          <TableCell>
                            {a.total > 0 ? (
                              <span className="text-xs"><span className="font-semibold text-emerald-600">{a.paid}</span> / {a.total}</span>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                disabled={busyId === s.id || isDemo}
                                onClick={() => generateForExisting(s.id)}>
                                {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generate 12-mo'}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            {a.overdue > 0 ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {a.overdue} overdue
                              </Badge>
                            ) : a.pending > 0 ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {a.pending} pending
                              </Badge>
                            ) : a.total > 0 ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Up to date
                              </Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><Badge className={cn('capitalize', STATUS_COLORS[s.status] ?? '')}>{s.status}</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setExpanded(isOpen ? null : s.id)}
                              title={isOpen ? 'Hide invoices' : 'Show monthly invoices'}>
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow key={s.id + '-inv'} className="bg-muted/30">
                            <TableCell colSpan={9} className="p-0">
                              <div className="px-6 py-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> 12-Month Billing Cycle
                                  </h4>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                  {(invoices[s.id] || []).map(inv => (
                                    <div key={inv.id}
                                      className={cn('rounded-md border p-2 text-xs',
                                        inv.status === 'overdue' && 'border-red-300 bg-red-50/60 dark:bg-red-950/20',
                                        inv.status === 'paid' && 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20',
                                        inv.status === 'pending' && 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20',
                                      )}>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold">{inv.period}</span>
                                        <Badge className={cn('text-[10px] px-1.5 py-0 h-4 capitalize', INV_STATUS_COLORS[inv.status])}>
                                          {inv.status}
                                        </Badge>
                                      </div>
                                      <p className="text-muted-foreground text-[11px]">Due {inv.due_date}</p>
                                      <p className="font-semibold">{formatMoney(inv.amount)}</p>
                                      <Button size="sm" variant="outline"
                                        className="h-6 text-[10px] w-full mt-1.5"
                                        disabled={busyId === inv.id || isDemo}
                                        onClick={() => togglePaid(inv)}>
                                        {busyId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                          inv.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                                      </Button>
                                    </div>
                                  ))}
                                  {(invoices[s.id] || []).length === 0 && (
                                    <p className="col-span-full text-xs text-muted-foreground">No invoices generated yet.</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>New Subscription</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Pick existing customer from CRM */}
              <div className="col-span-2 space-y-1.5">
                <Label>Customer (from Customers module)</Label>
                {customerList.length > 0 ? (
                  <Select
                    value={customerList.find((c: any) => c.name === form.customer_name)?.id || ''}
                    onValueChange={onSelectCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a customer or type a new one below" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">— Enter manually —</SelectItem>
                      {customerList.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.email ? ` · ${c.email}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No customers in your Customers module yet — fill the fields below.</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Customer Name *</Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Customer Email</Label>
                <Input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="billing@acme.com" />
              </div>

              {/* Plan from inventory service catalog */}
              <div className="col-span-2 space-y-1.5">
                <Label>Service / Plan *</Label>
                {serviceCatalog.length > 0 ? (
                  <Select value={form.plan_id} onValueChange={onSelectPlan}>
                    <SelectTrigger><SelectValue placeholder="Choose a service from your catalog" /></SelectTrigger>
                    <SelectContent>
                      {serviceCatalog.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatMoney(p.selling_price || p.unit_cost || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} placeholder="No services in catalog — type plan name" />
                )}
                <p className="text-[11px] text-muted-foreground">
                  Pulled from inventory items tagged as services (Consulting, Service, Filing, Accounting, Compliance…).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Monthly Price</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="99.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Billing Period</Label>
                <Select value={form.billing_period} onValueChange={v => setForm(f => ({ ...f, billing_period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              On save, 12 monthly invoices will be auto-generated starting from the start date.
              You can mark each one paid or unpaid from the table.
            </p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={insert.isPending}>{insert.isPending ? 'Saving...' : 'Save & Generate Cycle'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
