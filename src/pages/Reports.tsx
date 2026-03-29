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

type ReportType = 'sales' | 'inventory' | 'production' | 'trial_balance' | 'profit_loss' | 'balance_sheet' | 'general_ledger' | 'hr' | 'crm';

// Tanzania 2026 PAYE (same formula as HR page)
function calcPAYE(gross: number): number {
  if (gross <= 270000) return 0;
  if (gross <= 520000) return (gross - 270000) * 0.08;
  if (gross <= 760000) return 20000 + (gross - 520000) * 0.20;
  if (gross <= 1000000) return 68000 + (gross - 760000) * 0.25;
  return 128000 + (gross - 1000000) * 0.30;
}

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
  const { data: employeeData } = useTenantQuery('employees');
  const { data: crmDealData } = useTenantQuery('crm_deals');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const production = productionData ?? [];
  const transactions = transactionData ?? [];
  const coa = coaData ?? [];
  const journals = journalData ?? [];
  const employees = (employeeData ?? []) as any[];
  const crmDeals = (crmDealData ?? []) as any[];

  // ── Payroll calculations from real employee data ──────────────────────────
  const activeEmployees = employees.filter((e: any) => e.status === 'active');
  const payrollRows = activeEmployees.map((e: any) => {
    const basic = Number(e.salary) || 0;
    const allowances = Number(e.allowances) || 0;
    const gross = basic + allowances;
    const paye = calcPAYE(gross);
    const nssfEmp = basic * 0.10;
    const nssfEmpr = basic * 0.10;
    const sdl = gross * 0.035;
    const wcf = gross * 0.005;
    const net = gross - paye - nssfEmp;
    return { ...e, basic, allowances, gross, paye, nssfEmp, nssfEmpr, sdl, wcf, net };
  });
  const hrTotals = {
    gross: payrollRows.reduce((s: number, e: any) => s + e.gross, 0),
    paye: payrollRows.reduce((s: number, e: any) => s + e.paye, 0),
    nssfEmp: payrollRows.reduce((s: number, e: any) => s + e.nssfEmp, 0),
    nssfEmpr: payrollRows.reduce((s: number, e: any) => s + e.nssfEmpr, 0),
    sdl: payrollRows.reduce((s: number, e: any) => s + e.sdl, 0),
    wcf: payrollRows.reduce((s: number, e: any) => s + e.wcf, 0),
    net: payrollRows.reduce((s: number, e: any) => s + e.net, 0),
    cost: payrollRows.reduce((s: number, e: any) => s + e.gross + e.nssfEmpr + e.sdl + e.wcf, 0),
  };

  // ── CRM pipeline from real deals ─────────────────────────────────────────
  const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const crmByStage = stageOrder.map(stage => {
    const deals = crmDeals.filter((d: any) => d.stage === stage);
    const value = deals.reduce((s: number, d: any) => s + Number(d.value), 0);
    const avgProb = deals.length ? deals.reduce((s: number, d: any) => s + Number(d.probability || 0), 0) / deals.length : 0;
    return { stage: stage.charAt(0).toUpperCase() + stage.slice(1), count: deals.length, value, avgProb: Math.round(avgProb) };
  }).filter(s => s.count > 0);
  const totalPipeline = crmDeals.filter((d: any) => !['won','lost'].includes(d.stage)).reduce((s: number, d: any) => s + Number(d.value), 0);
  const wonValue = crmDeals.filter((d: any) => d.stage === 'won').reduce((s: number, d: any) => s + Number(d.value), 0);
  const wonCount = crmDeals.filter((d: any) => d.stage === 'won').length;
  const closedCount = crmDeals.filter((d: any) => ['won','lost'].includes(d.stage)).length;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
  const avgDealSize = crmDeals.length > 0 ? (crmDeals.reduce((s: number, d: any) => s + Number(d.value), 0) / crmDeals.length) : 0;

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
      case 'hr': {
        return {
          headers: ['Employee', 'Position', 'Dept', 'Basic', 'Allowances', 'Gross', 'PAYE', 'NSSF Emp', 'Net Pay', 'NSSF Empr', 'SDL 3.5%', 'WCF 0.5%'],
          rows: [
            ...payrollRows.map((e: any) => [
              e.full_name, e.position || '—', e.department || '—',
              formatMoney(e.basic), formatMoney(e.allowances), formatMoney(e.gross),
              formatMoney(e.paye), formatMoney(e.nssfEmp), formatMoney(e.net),
              formatMoney(e.nssfEmpr), formatMoney(e.sdl), formatMoney(e.wcf),
            ]),
            ['', '', '', '', '', '', '', '', '', '', '', ''],
            ['TOTALS', '', '', '', '', formatMoney(hrTotals.gross),
              formatMoney(hrTotals.paye), formatMoney(hrTotals.nssfEmp), formatMoney(hrTotals.net),
              formatMoney(hrTotals.nssfEmpr), formatMoney(hrTotals.sdl), formatMoney(hrTotals.wcf)],
          ],
          count: payrollRows.length,
          stats: [
            { label: 'Total Gross Payroll', value: formatMoney(hrTotals.gross) },
            { label: 'PAYE → TRA', value: formatMoney(hrTotals.paye) },
            { label: 'Net Pay (Take-home)', value: formatMoney(hrTotals.net) },
            { label: 'Total Employer Cost', value: formatMoney(hrTotals.cost) },
          ],
        };
      }
      case 'crm': {
        return {
          headers: ['Stage', 'Deals', 'Pipeline Value', 'Avg Probability'],
          rows: [
            ...crmByStage.map(s => [s.stage, s.count, formatMoney(s.value), `${s.avgProb}%`]),
            ['', '', '', ''],
            ['TOTAL', crmDeals.length, formatMoney(crmDeals.reduce((s: number, d: any) => s + Number(d.value), 0)), `${winRate}% win rate`],
          ],
          count: crmDeals.length,
          stats: [
            { label: 'Open Pipeline', value: formatMoney(totalPipeline) },
            { label: 'Won (All Time)', value: formatMoney(wonValue) },
            { label: 'Avg Deal Size', value: formatMoney(avgDealSize) },
            { label: 'Win Rate', value: `${winRate}%` },
          ],
        };
      }
      default:
        return { headers: [], rows: [], count: 0, stats: [] };
    }
  };

  const preview = getPreviewData();

  const reportLabel: Record<ReportType, string> = {
    sales: 'Sales Report', inventory: 'Inventory Report', production: 'Production Report',
    trial_balance: 'Trial Balance', profit_loss: 'Profit & Loss', balance_sheet: 'Balance Sheet',
    general_ledger: 'General Ledger', hr: 'Payroll Report', crm: 'CRM Pipeline Report',
  };

  const handleDownload = () => {
    const data = getPreviewData();
    const subtitle = reportType === 'hr'
      ? `Payroll for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} · ${tenant?.name || 'TELA-ERP'}`
      : `${format(startDate, 'MMM d, yyyy')} — ${format(endDate, 'MMM d, yyyy')} · ${tenant?.name || 'TELA-ERP'}`;
    generatePDFReport({
      title: reportLabel[reportType],
      subtitle,
      tenantName: tenant?.name,
      headers: data.headers,
      rows: data.rows,
      stats: data.stats,
    });
  };

  const isAccounting = ['trial_balance', 'profit_loss', 'balance_sheet', 'general_ledger'].includes(reportType);
  const isCustomSection = reportType === 'hr' || reportType === 'crm';

  return (
    <AppLayout title="Reports" subtitle="Generate & download reports">
      {/* Report category tabs */}
      <Tabs
        value={isAccounting ? 'accounting' : reportType}
        onValueChange={(v) => {
          if (v === 'accounting') setReportType('trial_balance');
          else setReportType(v as ReportType);
        }}
        className="mb-4"
      >
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="hr">HR / Payroll</TabsTrigger>
          <TabsTrigger value="crm">CRM Pipeline</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* HR Payroll Summary — real data */}
      {reportType === 'hr' && (
        <div className="mb-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Employees', value: String(activeEmployees.length), color: 'text-foreground' },
              { label: 'Total Gross Payroll', value: formatMoney(hrTotals.gross), color: 'text-foreground' },
              { label: 'Net Pay (Take-home)', value: formatMoney(hrTotals.net), color: 'text-indigo-600' },
              { label: 'Total Employer Cost', value: formatMoney(hrTotals.cost), color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          {payrollRows.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-medium">Employee</th>
                      <th className="text-left px-3 py-2.5 font-medium">Dept</th>
                      <th className="text-right px-3 py-2.5 font-medium">Basic</th>
                      <th className="text-right px-3 py-2.5 font-medium">Allowances</th>
                      <th className="text-right px-3 py-2.5 font-medium">Gross</th>
                      <th className="text-right px-3 py-2.5 font-medium text-red-500">PAYE</th>
                      <th className="text-right px-3 py-2.5 font-medium text-orange-500">NSSF (Emp)</th>
                      <th className="text-right px-3 py-2.5 font-medium text-indigo-600">Net Pay</th>
                      <th className="text-right px-3 py-2.5 font-medium text-amber-500">SDL</th>
                      <th className="text-right px-3 py-2.5 font-medium text-amber-500">WCF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payrollRows.map((e: any) => (
                      <tr key={e.id} className="hover:bg-accent/30">
                        <td className="px-4 py-2.5 font-medium text-foreground">{e.full_name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{e.department || '—'}</td>
                        <td className="px-3 py-2.5 text-right">{formatMoney(e.basic)}</td>
                        <td className="px-3 py-2.5 text-right">{formatMoney(e.allowances)}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">{formatMoney(e.gross)}</td>
                        <td className="px-3 py-2.5 text-right text-red-500">{formatMoney(e.paye)}</td>
                        <td className="px-3 py-2.5 text-right text-orange-500">{formatMoney(e.nssfEmp)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-indigo-600">{formatMoney(e.net)}</td>
                        <td className="px-3 py-2.5 text-right text-amber-500">{formatMoney(e.sdl)}</td>
                        <td className="px-3 py-2.5 text-right text-amber-500">{formatMoney(e.wcf)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold text-xs">
                      <td className="px-4 py-2.5">TOTALS</td>
                      <td />
                      <td />
                      <td />
                      <td className="px-3 py-2.5 text-right">{formatMoney(hrTotals.gross)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500">{formatMoney(hrTotals.paye)}</td>
                      <td className="px-3 py-2.5 text-right text-orange-500">{formatMoney(hrTotals.nssfEmp)}</td>
                      <td className="px-3 py-2.5 text-right text-indigo-600">{formatMoney(hrTotals.net)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-500">{formatMoney(hrTotals.sdl)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-500">{formatMoney(hrTotals.wcf)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          {payrollRows.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
              No active employees found. Add employees in HR &amp; Payroll to see this report.
            </div>
          )}
        </div>
      )}

      {/* CRM Pipeline Summary — real data */}
      {reportType === 'crm' && (
        <div className="mb-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Open Pipeline', value: formatMoney(totalPipeline), color: 'text-indigo-600' },
              { label: 'Won (All Time)', value: formatMoney(wonValue), color: 'text-green-600' },
              { label: 'Avg Deal Size', value: formatMoney(avgDealSize), color: 'text-foreground' },
              { label: 'Win Rate', value: `${winRate}%`, color: 'text-foreground' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          {crmByStage.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Stage</th>
                    <th className="text-center px-4 py-3 font-medium">Deals</th>
                    <th className="text-right px-4 py-3 font-medium">Value</th>
                    <th className="text-right px-4 py-3 font-medium">Avg Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {crmByStage.map(row => (
                    <tr key={row.stage} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium text-foreground">{row.stage}</td>
                      <td className="px-4 py-3 text-center">{row.count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatMoney(row.value)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.avgProb}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
              No CRM deals found. Add deals in the CRM module to see pipeline data.
            </div>
          )}
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

      {/* Stats summary cards — only for non-custom-section reports */}
      {!isCustomSection && preview.stats && preview.stats.length > 0 && (
        <div className={cn("grid gap-3 mb-5", preview.stats.length <= 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4")}>
          {preview.stats.map((stat, i) => (
            <div key={i} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview table — hidden for HR and CRM which render their own above */}
      {!isCustomSection && <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{reportLabel[reportType]} ({preview.count} records)</CardTitle>
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
      </Card>}
    </AppLayout>
  );
}
