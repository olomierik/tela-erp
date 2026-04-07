import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import DataTable, { Column } from '@/components/erp/DataTable';
import { ShoppingCart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  paused: 'Paused',
};

const STATUSES = ['open', 'paused', 'closed'];

export default function PointOfSale() {
  const { isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    cashier_name: '',
    opening_cash: '',
    status: 'open',
    opened_at: new Date().toISOString().slice(0, 16),
  });

  const { data: rawData, isLoading } = useTenantQuery('pos_sessions' as any);
  const insertSession = useTenantInsert('pos_sessions' as any);

  const today = new Date().toISOString().slice(0, 10);

  const demoData = [
    {
      id: '1', session_number: 'POS-001', cashier: 'Alice Boateng',
      opening_cash: 500, total_sales: 4320, total_orders: 38,
      status: 'open', opened_at: new Date().toISOString(),
    },
    {
      id: '2', session_number: 'POS-002', cashier: 'James Asante',
      opening_cash: 500, total_sales: 2890, total_orders: 24,
      status: 'open', opened_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: '3', session_number: 'POS-003', cashier: 'Grace Mensah',
      opening_cash: 200, total_sales: 5100, total_orders: 51,
      status: 'closed', opened_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '4', session_number: 'POS-004', cashier: 'Samuel Owusu',
      opening_cash: 300, total_sales: 1750, total_orders: 16,
      status: 'closed', opened_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: '5', session_number: 'POS-005', cashier: 'Ama Frimpong',
      opening_cash: 500, total_sales: 980, total_orders: 9,
      status: 'paused', opened_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const sessions: any[] = (isDemo ? demoData : rawData) ?? [];

  const openSessions = sessions.filter(s => s.status === 'open').length;
  const totalSalesToday = sessions
    .filter(s => s.opened_at?.slice(0, 10) === today)
    .reduce((sum, s) => sum + Number(s.total_sales ?? 0), 0);
  const totalOrders = sessions.reduce((sum, s) => sum + Number(s.total_orders ?? 0), 0);
  const avgOrderValue = totalOrders > 0
    ? sessions.reduce((sum, s) => sum + Number(s.total_sales ?? 0), 0) / totalOrders
    : 0;

  const handleCreate = async () => {
    if (isDemo) { toast.success('POS session opened (demo)'); setCreateOpen(false); return; }
    if (!form.cashier_name) {
      toast.error('Cashier name is required');
      return;
    }
    await insertSession.mutateAsync({
      cashier: form.cashier_name,
      opening_cash: Number(form.opening_cash) || 0,
      status: form.status,
      opened_at: form.opened_at,
      session_number: `POS-${Date.now().toString(36).toUpperCase()}`,
      total_sales: 0,
      total_orders: 0,
    });
    toast.success('POS session opened');
    setCreateOpen(false);
    setForm({ cashier_name: '', opening_cash: '', status: 'open', opened_at: new Date().toISOString().slice(0, 16) });
  };

  const columns: Column[] = [
    { key: 'session_number', label: 'Session #', className: 'font-mono text-xs' },
    { key: 'cashier', label: 'Cashier', render: v => <span className="font-medium">{v}</span> },
    { key: 'opening_cash', label: 'Opening Cash', render: v => <span className="text-sm">{formatMoney(v)}</span> },
    { key: 'total_sales', label: 'Total Sales', render: v => <span className="font-semibold">{formatMoney(v)}</span> },
    { key: 'total_orders', label: 'Orders', className: 'text-sm text-center' },
    {
      key: 'status', label: 'Status',
      render: v => (
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[v] ?? STATUS_COLORS.closed)}>
          {STATUS_LABELS[v] ?? v}
        </span>
      ),
    },
    {
      key: 'opened_at', label: 'Opened At',
      render: v => <span className="text-sm">{v ? new Date(v).toLocaleString() : '—'}</span>,
    },
  ];

  return (
    <AppLayout title="Point of Sale" subtitle="POS sessions and retail orders">
      <div className="max-w-7xl">
        <PageHeader
          title="Point of Sale"
          subtitle="Manage POS sessions, cashiers, and retail transactions"
          icon={ShoppingCart}
          breadcrumb={[{ label: 'Sales' }, { label: 'Point of Sale' }]}
          actions={[
            { label: 'Open Session', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Open Sessions', value: openSessions, color: 'text-emerald-600' },
            { label: "Today's Sales", value: formatMoney(totalSalesToday), color: 'text-indigo-600' },
            { label: 'Total Orders', value: totalOrders },
            { label: 'Avg Order Value', value: formatMoney(avgOrderValue) },
          ]}
        />

        <DataTable
          data={sessions}
          columns={columns}
          loading={isLoading && !isDemo}
          searchPlaceholder="Search sessions..."
          emptyTitle="No POS sessions yet"
          emptyDescription="Open a new POS session to start processing sales."
          emptyAction={{ label: 'Open Session', onClick: () => setCreateOpen(true) }}
        />

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" /> Open POS Session
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label>Cashier Name *</Label>
                <Input
                  value={form.cashier_name}
                  onChange={e => setForm(f => ({ ...f, cashier_name: e.target.value }))}
                  placeholder="e.g. Alice Boateng"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Opening Cash</Label>
                <Input
                  type="number"
                  value={form.opening_cash}
                  onChange={e => setForm(f => ({ ...f, opening_cash: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Opened At</Label>
                <Input
                  type="datetime-local"
                  value={form.opened_at}
                  onChange={e => setForm(f => ({ ...f, opened_at: e.target.value }))}
                />
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={insertSession.isPending} onClick={handleCreate}>
                {insertSession.isPending ? 'Opening...' : 'Open Session'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
