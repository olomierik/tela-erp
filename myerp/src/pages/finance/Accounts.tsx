import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock';

type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

const ACCOUNTS: Account[] = [
  { id: '1',  code: '1001', name: 'Cash – Operating Account',    type: 'asset',     balance:  182000.00, currency: 'USD' },
  { id: '2',  code: '1002', name: 'Cash – Savings Account',      type: 'asset',     balance:   94500.00, currency: 'USD' },
  { id: '3',  code: '1100', name: 'Accounts Receivable',         type: 'asset',     balance:   34200.00, currency: 'USD' },
  { id: '4',  code: '1200', name: 'Inventory',                   type: 'asset',     balance:  156000.00, currency: 'USD' },
  { id: '5',  code: '1300', name: 'Prepaid Expenses',            type: 'asset',     balance:   12400.00, currency: 'USD' },
  { id: '6',  code: '1500', name: 'Property & Equipment',        type: 'asset',     balance:  413300.00, currency: 'USD' },
  { id: '7',  code: '2001', name: 'Accounts Payable',            type: 'liability', balance:   48200.00, currency: 'USD' },
  { id: '8',  code: '2100', name: 'Accrued Liabilities',         type: 'liability', balance:   21500.00, currency: 'USD' },
  { id: '9',  code: '2200', name: 'Short-term Loan',             type: 'liability', balance:   80000.00, currency: 'USD' },
  { id: '10', code: '2500', name: 'Long-term Debt',              type: 'liability', balance:  260500.00, currency: 'USD' },
  { id: '11', code: '3001', name: "Owner's Capital",             type: 'equity',    balance:  340000.00, currency: 'USD' },
  { id: '12', code: '3100', name: 'Retained Earnings',           type: 'equity',    balance:  142200.00, currency: 'USD' },
  { id: '13', code: '4001', name: 'Product Revenue',             type: 'income',    balance:  998500.00, currency: 'USD' },
  { id: '14', code: '4100', name: 'Service Revenue',             type: 'income',    balance:  250000.00, currency: 'USD' },
  { id: '15', code: '5001', name: 'Cost of Goods Sold',          type: 'expense',   balance:  687200.00, currency: 'USD' },
];

const TYPE_BADGE: Record<AccountType, 'info' | 'destructive' | 'success' | 'warning'> = {
  asset:     'info',
  liability: 'destructive',
  equity:    'success',
  income:    'success',
  expense:   'warning',
};

export default function Accounts() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const totalAssets      = ACCOUNTS.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = ACCOUNTS.filter(a => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
  const netEquity        = totalAssets - totalLiabilities;

  const filtered = ACCOUNTS.filter(a => {
    const matchSearch = a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <AppLayout title="Accounts">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your general ledger accounts and balances."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{ACCOUNTS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Assets</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-info">{formatCurrency(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Equity</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-success">{formatCurrency(netEquity)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search code or account name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="sm:max-w-[160px]">
          <option value="all">All Types</option>
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="equity">Equity</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Currency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No accounts match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(acct => (
                  <TableRow key={acct.id}>
                    <TableCell className="font-mono text-sm">{acct.code}</TableCell>
                    <TableCell className="font-medium">{acct.name}</TableCell>
                    <TableCell>
                      <Badge variant={TYPE_BADGE[acct.type]} className="capitalize">{acct.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(acct.balance)}</TableCell>
                    <TableCell className="text-muted-foreground">{acct.currency}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
