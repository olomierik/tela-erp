import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Calculator, TrendingUp, TrendingDown, Wallet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const demoFinData = [
  { month: 'Jan', income: 42000, expenses: 28000 },
  { month: 'Feb', income: 48000, expenses: 31000 },
  { month: 'Mar', income: 55000, expenses: 35000 },
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

  const txns = data ?? [];
  const income = txns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);

  const rows = isDemo ? demoRows : txns.map((t: any) => [
    new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    t.description,
    t.type.charAt(0).toUpperCase() + t.type.slice(1),
    t.category,
    `$${Number(t.amount).toLocaleString()}`,
    <StatusBadge status={t.type === 'income' ? 'Income' : 'Expense'} variant={t.type === 'income' ? 'success' : 'destructive'} />,
    <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
  ]);

  return (
    <AppLayout title="Accounting" subtitle="Financial overview and transactions">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (MTD)" value={isDemo ? '$89,400' : `$${income.toLocaleString()}`} change={12.5} icon={TrendingUp} />
        <StatCard title="Expenses (MTD)" value={isDemo ? '$52,300' : `$${expenses.toLocaleString()}`} change={8} icon={TrendingDown} />
        <StatCard title="Net Profit" value={isDemo ? '$37,100' : `$${(income - expenses).toLocaleString()}`} change={18.2} icon={Calculator} />
        <StatCard title="Cash Balance" value={isDemo ? '$142,800' : `$${(income - expenses).toLocaleString()}`} change={5.4} icon={Wallet} />
      </div>

      {isDemo && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="font-semibold text-card-foreground mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={demoFinData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" stroke="hsl(215, 16%, 47%)" />
              <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
