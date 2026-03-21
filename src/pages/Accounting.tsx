import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Calculator, TrendingUp, TrendingDown, Wallet, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('transactions');
  const insert = useTenantInsert('transactions');
  const remove = useTenantDelete('transactions');
  useRealtimeSync('transactions');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const txns = data ?? [];
  const income = txns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const netProfit = income - expenses;

  const filtered = txns.filter((t: any) => {
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  const monthlyData = isDemo
    ? [{ month: 'Jan', income: 42000, expenses: 28000 }, { month: 'Feb', income: 48000, expenses: 31000 }, { month: 'Mar', income: 55000, expenses: 35000 }]
    : (() => {
        const months: Record<string, { income: number; expenses: number }> = {};
        txns.forEach((t: any) => {
          const m = new Date(t.date).toLocaleDateString('en-US', { month: 'short' });
          if (!months[m]) months[m] = { income: 0, expenses: 0 };
          if (t.type === 'income') months[m].income += Number(t.amount);
          else months[m].expenses += Number(t.amount);
        });
        return Object.entries(months).map(([month, v]) => ({ month, ...v }));
      })();

  const cashFlowData = monthlyData.map((m) => ({ month: m.month, cashflow: m.income - m.expenses }));

  return (
    <AppLayout title="Accounting" subtitle="Invoices, expenses & cash-flow">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Revenue (MTD)</p><p className="text-lg font-bold text-success">{isDemo ? formatMoney(89400) : formatMoney(income)}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Expenses (MTD)</p><p className="text-lg font-bold text-destructive">{isDemo ? formatMoney(52300) : formatMoney(expenses)}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Net Profit</p><p className={cn("text-lg font-bold", netProfit >= 0 ? "text-success" : "text-destructive")}>{isDemo ? formatMoney(37100) : formatMoney(netProfit)}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Cash Balance</p><p className="text-lg font-bold text-foreground">{isDemo ? formatMoney(142800) : formatMoney(netProfit)}</p></div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 16%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" tickFormatter={(v) => formatMoney(v)} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="income" fill="hsl(152, 69%, 38%)" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cash Flow Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cashFlowData}>
                <defs><linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(152, 69%, 38%)" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(152, 69%, 38%)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 16%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" tickFormatter={(v) => formatMoney(v)} />
                <Tooltip formatter={(v: number) => [formatMoney(v), 'Cash Flow']} />
                <Area type="monotone" dataKey="cashflow" stroke="hsl(152, 69%, 38%)" strokeWidth={2} fill="url(#cfGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search transactions..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isDemo && <CreateDialog title="Add Transaction" buttonLabel="+ Add Transaction" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
          </div>
        </CardContent>
      </Card>

      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {['Date', 'Description', 'Type', 'Category', 'Amount', 'Status', ...(!isDemo ? [''] : [])].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((t: any) => {
                  const autoTag = (t.custom_fields as any)?.auto ? ' 🤖' : '';
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{t.description}{autoTag}</td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize">{t.type}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{t.category}</td>
                      <td className="px-4 py-2.5 font-medium">{formatMoney(Number(t.amount))}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={t.type === 'income' ? 'Income' : 'Expense'} variant={t.type === 'income' ? 'success' : 'destructive'} /></td>
                      {!isDemo && <td className="px-4 py-2.5"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(t.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></td>}
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
