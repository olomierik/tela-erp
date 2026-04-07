import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Plus, Users, TrendingUp, XCircle } from 'lucide-react';
import { useTenantQuery, useTenantInsert } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const DEMO_DATA = [
  { id: '1', subscription_number: 'SUB-001', customer_name: 'Acme Corp', customer_email: 'billing@acme.com', plan_name: 'Pro', price: 299, currency: 'USD', billing_period: 'monthly', start_date: '2025-01-01', next_billing_date: '2026-05-01', status: 'active', created_at: new Date().toISOString() },
  { id: '2', subscription_number: 'SUB-002', customer_name: 'Beta Ltd', customer_email: 'admin@beta.com', plan_name: 'Starter', price: 49, currency: 'USD', billing_period: 'monthly', start_date: '2025-03-15', next_billing_date: '2026-05-15', status: 'active', created_at: new Date().toISOString() },
  { id: '3', subscription_number: 'SUB-003', customer_name: 'Gamma Inc', customer_email: 'finance@gamma.io', plan_name: 'Enterprise', price: 999, currency: 'USD', billing_period: 'yearly', start_date: '2025-06-01', next_billing_date: '2026-06-01', status: 'trial', created_at: new Date().toISOString() },
  { id: '4', subscription_number: 'SUB-004', customer_name: 'Delta LLC', customer_email: 'hello@delta.co', plan_name: 'Pro', price: 299, currency: 'USD', billing_period: 'monthly', start_date: '2024-11-01', next_billing_date: '', status: 'cancelled', created_at: new Date().toISOString() },
  { id: '5', subscription_number: 'SUB-005', customer_name: 'Epsilon Co', customer_email: 'ops@epsilon.com', plan_name: 'Starter', price: 49, currency: 'USD', billing_period: 'monthly', start_date: '2025-09-01', next_billing_date: '2026-05-01', status: 'paused', created_at: new Date().toISOString() },
];

const EMPTY_FORM = {
  customer_name: '',
  customer_email: '',
  plan_name: '',
  price: '',
  currency: 'USD',
  billing_period: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
  status: 'active',
  notes: '',
};

export default function Subscriptions() {
  const { isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: rawData, isLoading } = useTenantQuery('subscriptions' as any);
  const insert = useTenantInsert('subscriptions' as any);

  const subs: any[] = (isDemo ? DEMO_DATA : rawData) ?? [];

  const filtered = subs.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search || s.subscription_number?.toLowerCase().includes(q) || s.customer_name?.toLowerCase().includes(q) || s.plan_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active = subs.filter(s => s.status === 'active');
  const trial = subs.filter(s => s.status === 'trial');
  const cancelled = subs.filter(s => s.status === 'cancelled');
  const mrr = active.filter(s => s.billing_period === 'monthly').reduce((sum, s) => sum + (s.price ?? 0), 0)
    + active.filter(s => s.billing_period === 'yearly').reduce((sum, s) => sum + (s.price ?? 0) / 12, 0);

  const handleSubmit = async () => {
    if (!form.customer_name || !form.plan_name) { toast.error('Customer name and plan are required'); return; }
    if (isDemo) { toast.success('Demo mode — not saved'); setCreateOpen(false); return; }
    try {
      await insert.mutateAsync({ ...form, subscription_number: `SUB-${Date.now().toString().slice(-5)}`, price: parseFloat(form.price) || 0 });
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (e: any) { toast.error(e.message); }
  };

  const stats = [
    { label: 'Active', value: active.length, icon: Users, color: 'text-emerald-500' },
    { label: 'Trial', value: trial.length, icon: RefreshCw, color: 'text-yellow-500' },
    { label: 'MRR', value: formatMoney(mrr), icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Cancelled', value: cancelled.length, icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <AppLayout title="Subscriptions" subtitle="Manage recurring customer subscriptions">
      <div className="space-y-6">
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
          <Button className="ml-auto" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Subscription</Button>
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
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && !isDemo ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No subscriptions found</TableCell></TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-medium">{s.subscription_number}</TableCell>
                      <TableCell><div className="font-medium">{s.customer_name}</div><div className="text-xs text-muted-foreground">{s.customer_email}</div></TableCell>
                      <TableCell>{s.plan_name}</TableCell>
                      <TableCell>{formatMoney(s.price ?? 0)}</TableCell>
                      <TableCell className="capitalize">{s.billing_period}</TableCell>
                      <TableCell>{s.next_billing_date || '—'}</TableCell>
                      <TableCell><Badge className={cn('capitalize', STATUS_COLORS[s.status] ?? '')}>{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
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
              <div className="col-span-2 space-y-1.5"><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Acme Corp" /></div>
              <div className="col-span-2 space-y-1.5"><Label>Customer Email</Label><Input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="billing@acme.com" /></div>
              <div className="space-y-1.5"><Label>Plan Name *</Label><Input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} placeholder="Pro" /></div>
              <div className="space-y-1.5"><Label>Price</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="99.00" /></div>
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
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={insert.isPending}>{insert.isPending ? 'Saving...' : 'Save Subscription'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
