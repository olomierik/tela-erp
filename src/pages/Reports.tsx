import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import AppLayout from '@/components/layout/AppLayout';
import { FileDown, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useStore } from '@/contexts/StoreContext';
import { generatePDFReport } from '@/lib/pdf-reports';
import { cn } from '@/lib/utils';

type ReportType = 'sales' | 'inventory' | 'production' | 'trial_balance' | 'profit_loss' | 'balance_sheet' | 'general_ledger';

export default function Reports() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const { selectedStore } = useStore();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 86400000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data: salesData } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const { data: productionData } = useTenantQuery('production_orders');
  const { data: transactionData } = useTenantQuery('transactions');
  const { data: coaData } = useTenantQuery('chart_of_accounts');
  const { data: journalData } = useTenantQuery('journal_entries', 'entry_date');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const production = productionData ?? [];
  const transactions = transactionData ?? [];
  const coa = coaData ?? [];
  const journals = journalData ?? [];

  const filterByDate = (items: any[], dateField: string) =>
    items.filter((i: any) => {
      const d = new Date(i[dateField]);
      return d >= startDate && d <= endDate;
    });

  const filteredSales = filterByDate(sales, 'created_at');
  const filteredProduction = filterByDate(production, 'created_at');
  const filteredTransactions = filterByDate(transactions, 'date');
  const filteredJournals = filterByDate(journals, 'entry_date');

  // Accounting computations
  const accountingData = useMemo(() => {
    const incomeTotal = filteredTransactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expenseTotal = filteredTransactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const netProfit = incomeTotal - expenseTotal;

    // Group transactions by category for P&L
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    filteredTransactions.forEach((t: any) => {
      const cat = t.category || 'Uncategorized';
      if (t.type === 'income') incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(t.amount);
      else expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(t.amount);
    });

    // Trial balance from chart of accounts
    const trialBalance = coa.map((a: any) => {
      const debits = filteredJournals.filter((j: any) => j.debit_account_id === a.id).reduce((s: number, j: any) => s + Number(j.amount), 0);
      const credits = filteredJournals.filter((j: any) => j.credit_account_id === a.id).reduce((s: number, j: any) => s + Number(j.amount), 0);
      return { ...a, debits, credits, net: debits - credits };
    }).filter((a: any) => a.debits > 0 || a.credits > 0);

    // Balance sheet categories
    const inventoryValue = inventory.reduce((s: number, i: any) => s + (i.quantity * Number(i.unit_cost)), 0);

    return { incomeTotal, expenseTotal, netProfit, incomeByCategory, expenseByCategory, trialBalance, inventoryValue };
  }, [filteredTransactions, filteredJournals, coa, inventory]);

  const getPreviewData = (): { headers: string[]; rows: (string | number)[][]; count: number; stats: { label: string; value: string }[] } => {
    switch (reportType) {
      case 'sales': {
        const totalRevenue = filteredSales.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
        const totalQty = filteredSales.reduce((s: number, o: any) => s + (Number(o.quantity) || 1), 0);
        return {
          headers: ['Order #', 'Customer', 'Qty', 'Amount', 'Status', 'Date'],
          rows: [
            ...filteredSales.slice(0, 20).map((o: any) => [o.order_number, o.customer_name, o.quantity || 1, formatMoney(Number(o.total_amount)), o.status, new Date(o.created_at).toLocaleDateString()]),
            ['', '', '', '', '', ''],
            ['', 'TOTAL', totalQty, formatMoney(totalRevenue), `${filteredSales.length} orders`, ''],
          ],
          count: filteredSales.length,
          stats: [
            { label: 'Total Revenue', value: formatMoney(totalRevenue) },
            { label: 'Total Orders', value: String(filteredSales.length) },
            { label: 'Total Qty Sold', value: String(totalQty) },
            { label: 'Avg Order Value', value: formatMoney(filteredSales.length ? totalRevenue / filteredSales.length : 0) },
          ],
        };
      }
      case 'inventory': {
        const totalValue = inventory.reduce((s: number, i: any) => s + (i.quantity * Number(i.unit_cost)), 0);
        const totalQty = inventory.reduce((s: number, i: any) => s + i.quantity, 0);
        const lowStock = inventory.filter((i: any) => i.quantity <= i.reorder_level).length;
        return {
          headers: ['SKU', 'Name', 'Category', 'Qty', 'Unit Cost', 'Value', 'Status'],
          rows: [
            ...inventory.slice(0, 20).map((i: any) => [i.sku, i.name, i.category, i.quantity, formatMoney(Number(i.unit_cost)), formatMoney(i.quantity * Number(i.unit_cost)), i.status]),
            ['', '', '', '', '', '', ''],
            ['', 'TOTAL', '', totalQty, '', formatMoney(totalValue), ''],
          ],
          count: inventory.length,
          stats: [
            { label: 'Total Stock Value', value: formatMoney(totalValue) },
            { label: 'Total Items', value: String(inventory.length) },
            { label: 'Total Units', value: String(totalQty) },
            { label: 'Low Stock Items', value: String(lowStock) },
          ],
        };
      }
      case 'production': {
        const totalQty = filteredProduction.reduce((s: number, o: any) => s + o.quantity, 0);
        const completed = filteredProduction.filter((o: any) => o.status === 'completed').length;
        return {
          headers: ['Order #', 'Product', 'Qty', 'Status', 'Start', 'End'],
          rows: [
            ...filteredProduction.slice(0, 20).map((o: any) => [o.order_number, o.product_name, o.quantity, o.status, o.start_date || '—', o.end_date || '—']),
            ['', '', '', '', '', ''],
            ['', 'TOTAL', totalQty, `${completed} completed`, '', ''],
          ],
          count: filteredProduction.length,
          stats: [
            { label: 'Total Orders', value: String(filteredProduction.length) },
            { label: 'Total Qty Produced', value: String(totalQty) },
            { label: 'Completed', value: String(completed) },
            { label: 'Pending', value: String(filteredProduction.length - completed) },
          ],
        };
      }
      case 'trial_balance': {
        const totalDebits = accountingData.trialBalance.reduce((s: number, a: any) => s + a.debits, 0);
        const totalCredits = accountingData.trialBalance.reduce((s: number, a: any) => s + a.credits, 0);
        return {
          headers: ['Code', 'Account Name', 'Type', 'Debit', 'Credit'],
          rows: [
            ...accountingData.trialBalance.map((a: any) => [a.code, a.name, a.account_type, formatMoney(a.debits), formatMoney(a.credits)]),
            ['', '', '', '', ''],
            ['', 'TOTAL', '', formatMoney(totalDebits), formatMoney(totalCredits)],
          ],
          count: accountingData.trialBalance.length,
          stats: [
            { label: 'Total Debits', value: formatMoney(totalDebits) },
            { label: 'Total Credits', value: formatMoney(totalCredits) },
            { label: 'Difference', value: formatMoney(totalDebits - totalCredits) },
            { label: 'Accounts', value: String(accountingData.trialBalance.length) },
          ],
        };
      }
      case 'profit_loss': {
        const incomeRows = Object.entries(accountingData.incomeByCategory).map(([cat, amt]) => ['', cat, '', formatMoney(amt as number), '']);
        const expenseRows = Object.entries(accountingData.expenseByCategory).map(([cat, amt]) => ['', cat, '', '', formatMoney(amt as number)]);
        return {
          headers: ['', 'Category', '', 'Income', 'Expense'],
          rows: [
            ['', '── REVENUE ──', '', '', ''],
            ...incomeRows,
            ['', 'Total Revenue', '', formatMoney(accountingData.incomeTotal), ''],
            ['', '', '', '', ''],
            ['', '── EXPENSES ──', '', '', ''],
            ...expenseRows,
            ['', 'Total Expenses', '', '', formatMoney(accountingData.expenseTotal)],
            ['', '', '', '', ''],
            ['', 'NET PROFIT / (LOSS)', '', formatMoney(accountingData.netProfit), ''],
          ],
          count: Object.keys(accountingData.incomeByCategory).length + Object.keys(accountingData.expenseByCategory).length,
          stats: [
            { label: 'Total Revenue', value: formatMoney(accountingData.incomeTotal) },
            { label: 'Total Expenses', value: formatMoney(accountingData.expenseTotal) },
            { label: 'Net Profit', value: formatMoney(accountingData.netProfit) },
            { label: 'Margin', value: accountingData.incomeTotal > 0 ? `${((accountingData.netProfit / accountingData.incomeTotal) * 100).toFixed(1)}%` : '0%' },
          ],
        };
      }
      case 'balance_sheet': {
        const totalAR = filteredTransactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
        const totalAP = filteredTransactions.filter((t: any) => t.type === 'expense' && t.category !== 'Cost of Goods Sold').reduce((s: number, t: any) => s + Number(t.amount), 0);
        const equity = accountingData.inventoryValue + totalAR - totalAP;
        return {
          headers: ['', 'Account', 'Amount', '', ''],
          rows: [
            ['', '── ASSETS ──', '', '', ''],
            ['', 'Inventory', formatMoney(accountingData.inventoryValue), '', ''],
            ['', 'Accounts Receivable', formatMoney(totalAR), '', ''],
            ['', 'Total Assets', formatMoney(accountingData.inventoryValue + totalAR), '', ''],
            ['', '', '', '', ''],
            ['', '── LIABILITIES ──', '', '', ''],
            ['', 'Accounts Payable', formatMoney(totalAP), '', ''],
            ['', 'Total Liabilities', formatMoney(totalAP), '', ''],
            ['', '', '', '', ''],
            ['', '── EQUITY ──', '', '', ''],
            ['', 'Retained Earnings', formatMoney(equity), '', ''],
            ['', 'Total Equity', formatMoney(equity), '', ''],
          ],
          count: 3,
          stats: [
            { label: 'Total Assets', value: formatMoney(accountingData.inventoryValue + totalAR) },
            { label: 'Total Liabilities', value: formatMoney(totalAP) },
            { label: 'Total Equity', value: formatMoney(equity) },
          ],
        };
      }
      case 'general_ledger': {
        return {
          headers: ['Date', 'Description', 'Ref Type', 'Ref #', 'Amount'],
          rows: [
            ...filteredJournals.slice(0, 30).map((j: any) => [
              new Date(j.entry_date).toLocaleDateString(), j.description, j.reference_type || '—', j.reference_id || '—', formatMoney(Number(j.amount)),
            ]),
            ['', '', '', '', ''],
            ['', 'TOTAL', '', '', formatMoney(filteredJournals.reduce((s: number, j: any) => s + Number(j.amount), 0))],
          ],
          count: filteredJournals.length,
          stats: [
            { label: 'Total Entries', value: String(filteredJournals.length) },
            { label: 'Total Amount', value: formatMoney(filteredJournals.reduce((s: number, j: any) => s + Number(j.amount), 0)) },
          ],
        };
      }
      default:
        return {
          headers: [],
          rows: [],
          count: 0,
          stats: [],
        };
    }
  };

  const preview = getPreviewData();

  const reportLabel = {
    sales: 'Sales Report', inventory: 'Inventory Report', production: 'Production Report',
    trial_balance: 'Trial Balance', profit_loss: 'Profit & Loss', balance_sheet: 'Balance Sheet', general_ledger: 'General Ledger',
  }[reportType];

  const handleDownload = () => {
    const data = getPreviewData();
    // For PDF, get all rows (not sliced)
    generatePDFReport({
      title: reportLabel,
      subtitle: `${format(startDate, 'MMM d, yyyy')} — ${format(endDate, 'MMM d, yyyy')} · ${tenant?.name || 'TELA-ERP'} · Store: ${selectedStore?.name || 'All Stores'}`,
      tenantName: tenant?.name,
      headers: data.headers,
      rows: data.rows,
      stats: data.stats,
    });
  };

  const isAccounting = ['trial_balance', 'profit_loss', 'balance_sheet', 'general_ledger'].includes(reportType);

  return (
    <AppLayout title="Reports" subtitle="Generate & download reports">
      {/* Report category tabs */}
      <Tabs value={isAccounting ? 'accounting' : reportType} onValueChange={(v) => {
        if (v === 'accounting') setReportType('trial_balance');
        else setReportType(v as ReportType);
      }} className="mb-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="hr">HR</TabsTrigger>
          <TabsTrigger value="crm">CRM Pipeline</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* HR Summary */}
      {reportType === ('hr' as any) && (
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Headcount</p>
            <p className="text-2xl font-bold text-foreground mt-1">24</p>
            <p className="text-xs text-muted-foreground mt-1">+3 this month</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Monthly Payroll</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{formatMoney(28500)}</p>
            <p className="text-xs text-muted-foreground mt-1">Net after deductions</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Avg Salary</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatMoney(5800)}</p>
            <p className="text-xs text-muted-foreground mt-1">Per employee/month</p>
          </div>
          <div className="col-span-full rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Department</th>
                <th className="text-center px-4 py-3 font-medium">Headcount</th>
                <th className="text-right px-4 py-3 font-medium">Payroll Cost</th>
                <th className="text-right px-4 py-3 font-medium">% of Total</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {[
                  { dept: 'Engineering', count: 8, cost: 9200 },
                  { dept: 'Sales', count: 5, cost: 6100 },
                  { dept: 'Finance', count: 3, cost: 3800 },
                  { dept: 'Marketing', count: 4, cost: 4600 },
                  { dept: 'HR', count: 2, cost: 2400 },
                  { dept: 'Operations', count: 2, cost: 2400 },
                ].map(row => (
                  <tr key={row.dept} className="hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">{row.dept}</td>
                    <td className="px-4 py-3 text-center">{row.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatMoney(row.cost)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{Math.round((row.cost / 28500) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRM Pipeline Summary */}
      {reportType === ('crm' as any) && (
        <div className="mb-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Pipeline</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{formatMoney(187000)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Won (MTD)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(310000)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Avg Deal Size</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatMoney(31167)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-foreground mt-1">42%</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Stage</th>
                <th className="text-center px-4 py-3 font-medium">Deals</th>
                <th className="text-right px-4 py-3 font-medium">Value</th>
                <th className="text-right px-4 py-3 font-medium">Avg Probability</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {[
                  { stage: 'Lead', count: 3, value: 27600, prob: '18%' },
                  { stage: 'Qualified', count: 1, value: 12000, prob: '45%' },
                  { stage: 'Proposal', count: 1, value: 48000, prob: '65%' },
                  { stage: 'Negotiation', count: 1, value: 89000, prob: '80%' },
                  { stage: 'Won', count: 1, value: 310000, prob: '100%' },
                ].map(row => (
                  <tr key={row.stage} className="hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">{row.stage}</td>
                    <td className="px-4 py-3 text-center">{row.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatMoney(row.value)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.prob}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accounting sub-tabs */}
      {isAccounting && (
        <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)} className="mb-4">
          <TabsList>
            <TabsTrigger value="trial_balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="profit_loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance_sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="general_ledger">General Ledger</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Date & Download controls */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-start text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(startDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-start text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(endDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <Button className="h-9 gap-2" onClick={handleDownload}>
              <FileDown className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats summary cards */}
      {preview.stats && preview.stats.length > 0 && (
        <div className={cn("grid gap-3 mb-5", preview.stats.length <= 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4")}>
          {preview.stats.map((stat, i) => (
            <div key={i} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{reportLabel} ({preview.count} records)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {preview.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {preview.rows.map((row, i) => {
                  const isTotal = row.some((c: any) => typeof c === 'string' && c.includes('TOTAL'));
                  const isSectionHeader = row.some((c: any) => typeof c === 'string' && c.includes('──'));
                  const isEmpty = row.every((c: any) => c === '' || c === undefined);
                  if (isEmpty) return <tr key={i} className="h-2" />;
                  return (
                    <tr key={i} className={cn(
                      "border-b border-border last:border-0",
                      isTotal && "bg-muted/60 font-bold",
                      isSectionHeader && "bg-muted/30 font-semibold",
                      !isTotal && !isSectionHeader && "hover:bg-muted/20",
                    )}>
                      {row.map((cell: any, j: number) => (
                        <td key={j} className={cn("px-4 py-2.5 text-sm", isTotal ? "text-foreground font-bold" : "text-foreground")}>{cell}</td>
                      ))}
                    </tr>
                  );
                })}
                {preview.rows.length === 0 && (
                  <tr><td colSpan={preview.headers.length} className="px-4 py-8 text-center text-sm text-muted-foreground">No data for selected date range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
