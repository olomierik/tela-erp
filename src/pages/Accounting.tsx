import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Calculator, TrendingUp, TrendingDown, Wallet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const demoFinData = [
  { month: 'Jan', income: 42000, expenses: 28000 },
  { month: 'Feb', income: 48000, expenses: 31000 },
  { month: 'Mar', income: 55000, expenses: 35000 },
];

const demoCashFlow = [
  { month: 'Jan', cashflow: 14000 },
  { month: 'Feb', cashflow: 17000 },
  { month: 'Mar', cashflow: 20000 },
];

const demoRows = [
  ['Mar 18', 'INV-2847 Payment', 'Income', 'Sales', '$12,450', <StatusBadge status="Income" variant="success" />, null],
  ['Mar 17', 'Office Supplies', 'Expense', 'Operations', '$340', <StatusBadge status="Expense" variant="destructive" />, null],
];

const fields = [
  { name: 'description', label: 'Description', required: true },
  { name: 'type', label: 'Type', type: 'select' as const, defaultValue: 'expense', options: [
    { label: 'Income', value: 'income' }, { label: 'Expense', value: 'expense' },
  ]},
  { name: 'category', label: 'Category', required: true },
  { name: 'amount', label: 'Amount', type: 'number' as const, required: true },
  { name: 'date', label: 'Date', type: 'date' as const, required: true },
  { name: 'reference_number', label: 'Reference #' },
];

export default function Accounting() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useTenantQuery('transactions');
  const insert = useTenantInsert('transactions');
  const remove = useTenantDelete('transactions');
  useRealtimeSync('transactions');

  const txns = data ?? [];
  const income = txns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const netProfit = income - expenses;

  // Build monthly P&L from real data
  const monthlyData = isDemo ? demoFinData : (() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    txns.forEach((t: any) => {
      const m = new Date(t.date).toLocaleDateString('en-US', { month: 'short' });
      if (!months[m]) months[m] = { income: 0, expenses: 0 };
      if (t.type === 'income') months[m].income += Number(t.amount);
      else months[m].expenses += Number(t.amount);
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  })();

  // Cash flow trend
  const cashFlowData = isDemo ? demoCashFlow : monthlyData.map((m) => ({ month: m.month, cashflow: m.income - m.expenses }));

  const rows = isDemo ? demoRows : txns.map((t: any) => {
    const autoTag = t.reference_number?.startsWith('#') ? '' : (t.custom_fields?.auto ? ' 🤖' : '');
    return [
      new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      t.description + autoTag,
      t.type.charAt(0).toUpperCase() + t.type.slice(1),
      t.category,
      `$${Number(t.amount).toLocaleString()}`,
      <StatusBadge status={t.type === 'income' ? 'Income' : 'Expense'} variant={t.type === 'income' ? 'success' : 'destructive'} />,
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  return (
    <AppLayout title="Accounting" subtitle="Invoices, expenses, and cash-flow">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (MTD)" value={isDemo ? '$89,400' : `$${income.toLocaleString()}`} change={12.5} icon={TrendingUp} />
        <StatCard title="Expenses (MTD)" value={isDemo ? '$52,300' : `$${expenses.toLocaleString()}`} change={8} icon={TrendingDown} />
        <StatCard title="Net Profit" value={isDemo ? '$37,100' : `$${netProfit.toLocaleString()}`} change={18.2} icon={Calculator} />
        <StatCard title="Cash Balance" value={isDemo ? '$142,800' : `$${netProfit.toLocaleString()}`} change={5.4} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-card-foreground mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" stroke="hsl(215, 16%, 47%)" />
              <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-card-foreground mb-4">Cash Flow Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashFlowData}>
              <defs>
                <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" stroke="hsl(215, 16%, 47%)" />
              <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Cash Flow']} />
              <Area type="monotone" dataKey="cashflow" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#cfGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Recent Transactions</h3>
        {!isDemo && <CreateDialog title="Add Transaction" buttonLabel="+ Add Transaction" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['Date', 'Description', 'Type', 'Category', 'Amount', 'Status', ...(isDemo ? [] : [''])]} rows={rows} />
      )}
    </AppLayout>
  );
}
