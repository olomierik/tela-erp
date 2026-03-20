import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Calculator, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const finData = [
  { month: 'Jan', income: 42000, expenses: 28000 },
  { month: 'Feb', income: 48000, expenses: 31000 },
  { month: 'Mar', income: 55000, expenses: 35000 },
  { month: 'Apr', income: 51000, expenses: 33000 },
  { month: 'May', income: 63000, expenses: 38000 },
  { month: 'Jun', income: 71000, expenses: 42000 },
];

const transactions = [
  ['Mar 18', 'INV-2847 Payment', 'Income', 'Sales', '$12,450', <StatusBadge status="Income" variant="success" />],
  ['Mar 17', 'Office Supplies', 'Expense', 'Operations', '$340', <StatusBadge status="Expense" variant="destructive" />],
  ['Mar 16', 'Supplier Payment', 'Expense', 'Procurement', '$8,200', <StatusBadge status="Expense" variant="destructive" />],
  ['Mar 15', 'Client Retainer', 'Income', 'Services', '$5,000', <StatusBadge status="Income" variant="success" />],
  ['Mar 14', 'Software Licenses', 'Expense', 'IT', '$1,250', <StatusBadge status="Expense" variant="destructive" />],
];

export default function Accounting() {
  return (
    <AppLayout title="Accounting" subtitle="Financial overview and transactions">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (MTD)" value="$89,400" change={12.5} icon={TrendingUp} />
        <StatCard title="Expenses (MTD)" value="$52,300" change={8} icon={TrendingDown} />
        <StatCard title="Net Profit" value="$37,100" change={18.2} icon={Calculator} />
        <StatCard title="Cash Balance" value="$142,800" change={5.4} icon={Wallet} />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-card-foreground mb-4">Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={finData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="month" stroke="hsl(215, 16%, 47%)" />
            <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Recent Transactions</h3>
        <Button size="sm">+ Add Transaction</Button>
      </div>
      <DataTable headers={['Date', 'Description', 'Type', 'Category', 'Amount', 'Status']} rows={transactions} />
    </AppLayout>
  );
}
