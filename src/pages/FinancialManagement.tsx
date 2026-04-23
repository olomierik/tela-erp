import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import CompanySwitcher from '@/components/company/CompanySwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  CreditCard,
  FileText,
  Landmark,
  PiggyBank,
  Receipt,
  Scale,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

type ReportRow = {
  account_code: string | null;
  account_id: string | null;
  account_name: string | null;
  account_type: string | null;
  running_balance: number | null;
  total_credit: number | null;
  total_debit: number | null;
  tenant_id: string | null;
};

type ModuleCard = {
  key: string;
  name: string;
  description: string;
  route: string;
  icon: typeof BookOpen;
  metric: string;
  detail: string;
};

type IntegrationStatus = 'connected' | 'partial' | 'idle';

type IntegrationPoint = {
  source: string;
  target: string;
  status: IntegrationStatus;
  detail: string;
};

const REALTIME_TABLES = [
  'sales_orders',
  'purchase_orders',
  'invoices',
  'transactions',
  'budgets',
  'budget_lines',
  'fixed_assets',
  'expense_claims',
  'expense_items',
  'payroll_runs',
  'tax_rates',
  'chart_of_accounts',
  'accounting_vouchers',
  'accounting_voucher_entries',
  'production_orders',
  'customers',
  'suppliers',
  'inventory_items',
  'inventory_transactions',
  'inventory_adjustments',
] as const;

const moneySum = (rows: any[], field: string) => rows.reduce((sum, row) => sum + Number(row?.[field] || 0), 0);
const countWhere = (rows: any[], predicate: (row: any) => boolean) => rows.filter(predicate).length;

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${value.toFixed(2)}x`;
}

function percent(part: number, whole: number) {
  if (!whole || !Number.isFinite(part) || !Number.isFinite(whole)) return 0;
  return Math.max(0, Math.round((part / whole) * 100));
}

function moneyOrDash(formatMoney: (value: number) => string, value: number) {
  return Number.isFinite(value) ? formatMoney(value) : '—';
}

function integrationStatus(sourceCount: number, financeCount: number): IntegrationStatus {
  if (sourceCount === 0) return 'idle';
  if (financeCount === 0) return 'partial';
  return financeCount < sourceCount ? 'partial' : 'connected';
}

export default function FinancialManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, isDemo } = useAuth();
  const { formatMoney, displayCurrency } = useCurrency();

  const { data: salesData } = useTenantQuery('sales_orders');
  const { data: purchaseData } = useTenantQuery('purchase_orders');
  const { data: invoiceData } = useTenantQuery('invoices');
  const { data: transactionData } = useTenantQuery('transactions');
  const { data: budgetData } = useTenantQuery('budgets');
  const { data: budgetLineData } = useTenantQuery('budget_lines');
  const { data: fixedAssetData } = useTenantQuery('fixed_assets' as any);
  const { data: expenseClaimData } = useTenantQuery('expense_claims' as any);
  const { data: payrollRunData } = useTenantQuery('payroll_runs' as any);
  const { data: taxRateData } = useTenantQuery('tax_rates' as any);
  const { data: customerData } = useTenantQuery('customers');
  const { data: supplierData } = useTenantQuery('suppliers');
  const { data: productionData } = useTenantQuery('production_orders');
  const { data: coaData } = useTenantQuery('chart_of_accounts');
  const { data: voucherData } = useTenantQuery('accounting_vouchers' as any);
  const { data: voucherEntryData } = useTenantQuery('accounting_voucher_entries' as any);
  const { data: inventoryData } = useTenantQuery('inventory_items');

  const sales = salesData ?? [];
  const purchases = purchaseData ?? [];
  const invoices = invoiceData ?? [];
  const transactions = transactionData ?? [];
  const budgets = budgetData ?? [];
  const budgetLines = budgetLineData ?? [];
  const fixedAssets = (fixedAssetData ?? []) as any[];
  const expenseClaims = (expenseClaimData ?? []) as any[];
  const payrollRuns = (payrollRunData ?? []) as any[];
  const taxRates = (taxRateData ?? []) as any[];
  const customers = customerData ?? [];
  const suppliers = supplierData ?? [];
  const productionOrders = productionData ?? [];
  const coa = (coaData ?? []) as any[];
  const vouchers = (voucherData ?? []) as any[];
  const voucherEntries = (voucherEntryData ?? []) as any[];
  const inventory = (inventoryData ?? []) as any[];

  const isLoading = [
    salesData,
    purchaseData,
    invoiceData,
    transactionData,
    budgetData,
    budgetLineData,
    fixedAssetData,
    expenseClaimData,
    payrollRunData,
    taxRateData,
    customerData,
    supplierData,
    productionData,
    coaData,
    voucherData,
    voucherEntryData,
    inventoryData,
  ].some((value) => value === undefined);

  useEffect(() => {
    if (!tenant?.id || isDemo) return;

    const invalidate = (table: string) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      if (table === 'accounting_vouchers' || table === 'accounting_voucher_entries' || table === 'chart_of_accounts') {
        queryClient.invalidateQueries({ queryKey: ['accounting_vouchers'] });
        queryClient.invalidateQueries({ queryKey: ['accounting_voucher_entries'] });
        queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
      }
    };

    const channel = REALTIME_TABLES.reduce((acc, table) => {
      acc.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenant.id}` },
        () => invalidate(table),
      );
      return acc;
    }, supabase.channel(`financial-management-${tenant.id}`));

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, isDemo, queryClient]);

  const finance = useMemo(() => {
    const postedVoucherIds = new Set(vouchers.filter((voucher) => voucher.status === 'posted').map((voucher) => voucher.id));
    const accountMap = Object.fromEntries(coa.map((account: any) => [account.id, account]));
    const rollup = new Map<string, { debit: number; credit: number; account: any }>();

    for (const entry of voucherEntries) {
      if (!postedVoucherIds.has(entry.voucher_id)) continue;
      const account = accountMap[entry.account_id];
      if (!account) continue;

      const current = rollup.get(entry.account_id) ?? { debit: 0, credit: 0, account };
      current.debit += Number(entry.debit || 0);
      current.credit += Number(entry.credit || 0);
      rollup.set(entry.account_id, current);
    }

    const trialBalance: ReportRow[] = Array.from(rollup.values())
      .map(({ debit, credit, account }) => ({
        account_code: account.code,
        account_id: account.id,
        account_name: account.name,
        account_type: account.account_type,
        running_balance: debit - credit,
        total_credit: credit,
        total_debit: debit,
        tenant_id: account.tenant_id,
      }))
      .sort((left, right) => String(left.account_code ?? '').localeCompare(String(right.account_code ?? '')));

    const byType = (types: string[]) => trialBalance.filter((row) => types.includes(String(row.account_type ?? '')));
    const sumRunning = (rows: ReportRow[]) => rows.reduce((sum, row) => sum + Number(row.running_balance || 0), 0);
    const sumAbsRunning = (rows: ReportRow[]) => rows.reduce((sum, row) => sum + Math.abs(Number(row.running_balance || 0)), 0);
    const findBalance = (matchers: RegExp[]) => trialBalance
      .filter((row) => matchers.some((matcher) => matcher.test(`${row.account_code ?? ''} ${row.account_name ?? ''}`)))
      .reduce((sum, row) => sum + Number(row.running_balance || 0), 0);

    const revenue = sumAbsRunning(byType(['revenue', 'income']));
    const expenses = sumAbsRunning(byType(['expense']));
    const assets = sumRunning(byType(['asset']));
    const liabilities = sumAbsRunning(byType(['liability']));
    const equity = sumAbsRunning(byType(['equity']));
    const cashBalance = findBalance([/\b1000\b/i, /\b1010\b/i, /cash/i, /bank/i, /mobile money/i]);
    const receivablesBalance = Math.abs(findBalance([/accounts receivable/i, /\b1100\b/i]));
    const payablesBalance = Math.abs(findBalance([/accounts payable/i, /\b2000\b/i]));
    const taxBalance = Math.abs(findBalance([/vat/i, /tax/i, /paye/i, /nssf/i, /sdl/i, /wcf/i]));

    return {
      postedVoucherIds,
      trialBalance,
      totalRevenue: revenue,
      totalExpenses: expenses,
      totalAssets: assets,
      totalLiabilities: liabilities,
      totalEquity: equity,
      cashBalance,
      receivablesBalance,
      payablesBalance,
      taxBalance,
      trialDifference: Math.abs(
        trialBalance.reduce((sum, row) => sum + Number(row.total_debit || 0), 0) -
        trialBalance.reduce((sum, row) => sum + Number(row.total_credit || 0), 0),
      ),
    };
  }, [coa, voucherEntries, vouchers]);

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const openInvoices = invoices.filter((invoice: any) => !['paid', 'cancelled'].includes(String(invoice.status ?? '')));
    const overdueInvoices = openInvoices.filter((invoice: any) => invoice.due_date && invoice.due_date < today);
    const receivedPurchases = purchases.filter((po: any) => String(po.status ?? '').toLowerCase() === 'received');
    const approvedExpenses = expenseClaims.filter((claim) => ['approved', 'paid'].includes(String(claim.status ?? '')));
    const submittedExpenses = expenseClaims.filter((claim) => String(claim.status ?? '') === 'submitted');
    const finalizedPayroll = payrollRuns.filter((run) => String(run.status ?? '') !== 'draft');
    const activeBudget = moneySum(budgets, 'total_budget');
    const budgetActuals = budgetLines.reduce((sum, line: any) => sum + Number(line.actual_amount || 0), 0);
    const expenseTotalFromTransactions = transactions
      .filter((txn: any) => String(txn.type ?? '') === 'expense')
      .reduce((sum: number, txn: any) => sum + Number(txn.amount || 0), 0);
    const actualSpend = budgetActuals > 0 ? budgetActuals : expenseTotalFromTransactions;
    const netProfit = finance.totalRevenue - finance.totalExpenses;
    const profitMargin = percent(netProfit, finance.totalRevenue);
    const expenseRatio = percent(finance.totalExpenses, finance.totalRevenue || 1);
    const currentRatio = finance.totalLiabilities > 0 ? finance.totalAssets / finance.totalLiabilities : 0;
    const budgetUtilization = percent(actualSpend, activeBudget || 1);
    const payrollGross = finalizedPayroll.reduce((sum, run) => sum + Number(run.total_gross || 0), 0);
    const payrollNet = finalizedPayroll.reduce((sum, run) => sum + Number(run.total_net || 0), 0);
    const fixedAssetValue = moneySum(fixedAssets, 'current_value');
    const depreciationTotal = moneySum(fixedAssets, 'accumulated_depreciation');
    // Inventory stock value = sum(qty × unit_cost) — true operational stock asset
    const sellableInventory = inventory.filter((item: any) => String(item.status ?? 'good') === 'good');
    const inventoryStockValue = inventory.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
      0,
    );
    const inventorySellableValue = sellableInventory.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
      0,
    );
    const inventoryRetailValue = inventory.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.selling_price || 0),
      0,
    );
    const inventoryUnits = inventory.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
    const lowStockCount = inventory.filter(
      (item: any) => Number(item.quantity || 0) > 0 && Number(item.quantity || 0) <= Number(item.reorder_level || 0),
    ).length;
    const outOfStockCount = inventory.filter((item: any) => Number(item.quantity || 0) <= 0).length;
    // Ledger inventory (accounting view) — match common stock/inventory accounts
    const inventoryLedgerBalance = finance.trialBalance
      .filter((row) => /\b1400\b|\b1410\b|\b1420\b|inventory|stock|finished goods|raw materials|work in progress/i
        .test(`${row.account_code ?? ''} ${row.account_name ?? ''}`))
      .reduce((sum, row) => sum + Number(row.running_balance || 0), 0);
    const inventoryVariance = inventoryStockValue - inventoryLedgerBalance;
    const salesDelivered = sales.filter((order: any) => ['delivered', 'shipped'].includes(String(order.status ?? '').toLowerCase()));
    const salesDeliveredTotal = moneySum(salesDelivered, 'total_amount');
    const purchaseReceivedTotal = moneySum(receivedPurchases, 'total_amount');
    const expenseTransactions = transactions.filter((txn: any) => String(txn.category ?? '') === 'Employee Expenses');
    const payrollTransactions = transactions.filter((txn: any) => ['Salary Expense', 'Payroll Deductions'].includes(String(txn.category ?? '')));
    const depreciationTransactions = transactions.filter((txn: any) => /depreciation/i.test(String(txn.category ?? '')));
    const sourceModuleCounts = vouchers.reduce((acc: Record<string, number>, voucher: any) => {
      const moduleKey = String(voucher.source_module ?? 'manual');
      acc[moduleKey] = (acc[moduleKey] || 0) + 1;
      return acc;
    }, {});

    const moduleCards: ModuleCard[] = [
      {
        key: 'general-ledger',
        name: 'General Ledger',
        description: 'Live chart of accounts, posted vouchers, and balancing control.',
        route: '/accounting/ledger',
        icon: BookOpen,
        metric: `${finance.trialBalance.length} active accounts`,
        detail: `${vouchers.filter((voucher) => voucher.status === 'posted').length} posted vouchers`,
      },
      {
        key: 'accounts-receivable',
        name: 'Accounts Receivable',
        description: 'Outstanding customer invoices and collection exposure.',
        route: '/invoices',
        icon: FileText,
        metric: moneyOrDash(formatMoney, openInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount || 0), 0)),
        detail: `${overdueInvoices.length} overdue · ${customers.length} customers`,
      },
      {
        key: 'accounts-payable',
        name: 'Accounts Payable',
        description: 'Received procurement commitments and supplier exposure.',
        route: '/procurement',
        icon: CreditCard,
        metric: moneyOrDash(formatMoney, finance.payablesBalance || purchaseReceivedTotal),
        detail: `${receivedPurchases.length} received POs · ${suppliers.length} suppliers`,
      },
      {
        key: 'budgeting',
        name: 'Budgeting & Planning',
        description: 'Budget envelopes, actuals, and utilization trends.',
        route: '/budgets',
        icon: PiggyBank,
        metric: `${budgets.length} budgets`,
        detail: `${budgetUtilization}% utilized · ${moneyOrDash(formatMoney, activeBudget)}`,
      },
      {
        key: 'tax-management',
        name: 'Tax Management',
        description: 'Tax settings and live liability visibility from finance flows.',
        route: '/tax-calendar',
        icon: Shield,
        metric: moneyOrDash(formatMoney, finance.taxBalance),
        detail: `${taxRates.length} tax rules configured`,
      },
      {
        key: 'fixed-assets',
        name: 'Fixed Assets',
        description: 'Asset register, net book value, and depreciation activity.',
        route: '/assets',
        icon: Landmark,
        metric: moneyOrDash(formatMoney, fixedAssetValue),
        detail: `${fixedAssets.length} assets · ${moneyOrDash(formatMoney, depreciationTotal)} depreciation`,
      },
      {
        key: 'inventory',
        name: 'Inventory (Stock Asset)',
        description: 'Live stock-on-hand value at cost — the largest current asset for trading & manufacturing.',
        route: '/inventory',
        icon: Boxes,
        metric: moneyOrDash(formatMoney, inventoryStockValue),
        detail: `${inventoryUnits.toLocaleString()} units · ${inventory.length} SKUs · ${lowStockCount} low · ${outOfStockCount} out`,
      },
      {
        key: 'cash-bank',
        name: 'Cash & Bank',
        description: 'Liquidity from finance-ledger cash and bank accounts.',
        route: '/expenses',
        icon: Banknote,
        metric: moneyOrDash(formatMoney, finance.cashBalance),
        detail: `${transactions.length} cash-impacting finance transactions`,
      },
      {
        key: 'reporting',
        name: 'Financial Reporting',
        description: 'Real-time statements backed by posted accounting activity.',
        route: '/accounting/reports',
        icon: BarChart3,
        metric: finance.trialDifference < 0.01 ? 'Trial balance matched' : 'Trial balance needs review',
        detail: `${postedStatementsCount(sourceModuleCounts)} auto-posted module feeds`,
      },
    ];

    const integrationPoints: IntegrationPoint[] = [
      {
        source: 'Sales / POS',
        target: 'General Ledger + AR',
        status: integrationStatus(salesDelivered.length, sourceModuleCounts.sales || 0),
        detail: `${salesDelivered.length} delivered orders · ${(sourceModuleCounts.sales || 0)} finance postings · ${moneyOrDash(formatMoney, salesDeliveredTotal)}`,
      },
      {
        source: 'Procurement',
        target: 'General Ledger + AP',
        status: integrationStatus(receivedPurchases.length, sourceModuleCounts.procurement || 0),
        detail: `${receivedPurchases.length} received POs · ${(sourceModuleCounts.procurement || 0)} finance postings · ${moneyOrDash(formatMoney, purchaseReceivedTotal)}`,
      },
      {
        source: 'Production',
        target: 'Inventory + General Ledger',
        status: integrationStatus(
          countWhere(productionOrders, (order) => String(order.status ?? '').toLowerCase() === 'completed'),
          sourceModuleCounts.production || 0,
        ),
        detail: `${countWhere(productionOrders, (order) => String(order.status ?? '').toLowerCase() === 'completed')} completed orders · ${(sourceModuleCounts.production || 0)} finance postings`,
      },
      {
        source: 'HR / Payroll',
        target: 'Expense + Statutory Liability',
        status: integrationStatus(finalizedPayroll.length, payrollTransactions.length),
        detail: `${finalizedPayroll.length} payroll runs · ${payrollTransactions.length} payroll finance entries · ${moneyOrDash(formatMoney, payrollNet || payrollGross)}`,
      },
      {
        source: 'Expense Claims',
        target: 'Operating Expense',
        status: integrationStatus(approvedExpenses.length, expenseTransactions.length),
        detail: `${approvedExpenses.length} approved claims · ${expenseTransactions.length} finance entries · ${submittedExpenses.length} awaiting approval`,
      },
      {
        source: 'Fixed Assets',
        target: 'Depreciation + Balance Sheet',
        status: integrationStatus(fixedAssets.length, depreciationTransactions.length),
        detail: `${fixedAssets.length} assets · ${moneyOrDash(formatMoney, depreciationTotal)} accumulated depreciation · ${depreciationTransactions.length} finance entries`,
      },
      {
        source: 'Inventory (Stock Asset)',
        target: 'Balance Sheet · Current Assets',
        status: inventory.length === 0
          ? 'idle'
          : Math.abs(inventoryVariance) > Math.max(inventoryStockValue * 0.05, 1000)
            ? 'partial'
            : 'connected',
        detail: `${inventory.length} SKUs · ${inventoryUnits.toLocaleString()} units · stock@cost ${moneyOrDash(formatMoney, inventoryStockValue)} · GL inventory ${moneyOrDash(formatMoney, inventoryLedgerBalance)}${Math.abs(inventoryVariance) > 1 ? ` · variance ${moneyOrDash(formatMoney, inventoryVariance)}` : ''}`,
      },
    ];

    return {
      activeBudget,
      approvedExpenses,
      budgetUtilization,
      currentRatio,
      depreciationTotal,
      expenseRatio,
      expenseTransactions,
      fixedAssetValue,
      integrationPoints,
      moduleCards,
      netProfit,
      openInvoices,
      overdueInvoices,
      payrollGross,
      payrollNet,
      payrollTransactions,
      profitMargin,
      receivables: finance.receivablesBalance || openInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount || 0), 0),
      payables: finance.payablesBalance || purchaseReceivedTotal,
      salesDelivered,
      salesDeliveredTotal,
      submittedExpenses,
      taxLiability: finance.taxBalance,
      totalAssets: finance.totalAssets,
      totalExpenses: finance.totalExpenses,
      totalLiabilities: finance.totalLiabilities,
      totalEquity: finance.totalEquity,
      totalRevenue: finance.totalRevenue,
      inventoryStockValue,
      inventorySellableValue,
      inventoryRetailValue,
      inventoryUnits,
      inventoryLedgerBalance,
      inventoryVariance,
      lowStockCount,
      outOfStockCount,
    };
  }, [
    budgets,
    budgetLines,
    coa,
    expenseClaims,
    finance.cashBalance,
    finance.payablesBalance,
    finance.receivablesBalance,
    finance.taxBalance,
    finance.totalAssets,
    finance.totalEquity,
    finance.totalExpenses,
    finance.totalLiabilities,
    finance.totalRevenue,
    finance.trialBalance,
    finance.trialDifference,
    fixedAssets,
    formatMoney,
    inventory,
    invoices,
    payrollRuns,
    productionOrders,
    purchases,
    sales,
    suppliers.length,
    taxRates.length,
    transactions,
    vouchers,
    customers.length,
  ]);

  return (
    <AppLayout title="Financial Management" subtitle="Live CFO visibility across the connected finance engine">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connected finance data from operations, accounting, and reporting</p>
              <p className="text-xs text-muted-foreground">Reporting currency: <span className="font-medium text-foreground">{displayCurrency}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompanySwitcher />
            <Button variant="outline" size="sm" onClick={() => navigate('/accounting/reports')}>
              <BarChart3 className="mr-1.5 h-4 w-4" /> Reports
            </Button>
            <Button size="sm" onClick={() => navigate('/ai-cfo')}>
              <Activity className="mr-1.5 h-4 w-4" /> CFO AI
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto flex-wrap bg-muted/40">
            <TabsTrigger value="overview">CFO Overview</TabsTrigger>
            <TabsTrigger value="modules">Sub-Modules</TabsTrigger>
            <TabsTrigger value="health">Financial Health</TabsTrigger>
            <TabsTrigger value="integration">Integration Map</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label="Net Profit" value={isLoading ? null : formatMoney(metrics.netProfit)} icon={metrics.netProfit >= 0 ? TrendingUp : TrendingDown} hint={`${metrics.profitMargin}% margin`} />
              <KpiCard label="Total Revenue" value={isLoading ? null : formatMoney(metrics.totalRevenue)} icon={Receipt} hint={`${metrics.salesDelivered.length} delivered sales orders`} />
              <KpiCard label="Total Expenses" value={isLoading ? null : formatMoney(metrics.totalExpenses)} icon={Calculator} hint={`${metrics.budgetUtilization}% of budget used`} />
              <KpiCard label="Cash & Bank" value={isLoading ? null : formatMoney(finance.cashBalance)} icon={Wallet} hint="Live cash-account balance" />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label="Accounts Receivable" value={isLoading ? null : formatMoney(metrics.receivables)} icon={FileText} hint={`${metrics.overdueInvoices.length} overdue invoices`} />
              <KpiCard label="Accounts Payable" value={isLoading ? null : formatMoney(metrics.payables)} icon={CreditCard} hint={`${metrics.salesDelivered.length > 0 ? metrics.salesDelivered.length : purchases.length} finance-linked source docs`} />
              <KpiCard label="Fixed Assets" value={isLoading ? null : formatMoney(metrics.fixedAssetValue)} icon={Landmark} hint={`${fixedAssets.length} tracked assets`} />
              <KpiCard label="Tax Liability" value={isLoading ? null : formatMoney(metrics.taxLiability)} icon={Shield} hint={`${taxRates.length} configured tax rates`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-4 w-4 text-primary" /> Balance Sheet Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <BalanceRow label="Total Assets" value={isLoading ? '—' : formatMoney(metrics.totalAssets)} />
                  <BalanceRow label="Total Liabilities" value={isLoading ? '—' : formatMoney(metrics.totalLiabilities)} />
                  <BalanceRow label="Total Equity" value={isLoading ? '—' : formatMoney(metrics.totalEquity)} />
                  <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                    <span>Current Ratio</span>
                    <span className="font-mono text-foreground">{formatRatio(metrics.currentRatio)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">CFO Signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AlertRow label={`${metrics.overdueInvoices.length} overdue invoices need follow-up`} onClick={() => navigate('/invoices')} />
                  <AlertRow label={`${metrics.submittedExpenses.length} expense claims pending approval`} onClick={() => navigate('/expenses')} />
                  <AlertRow label={`${metrics.budgetUtilization}% budget utilization across active budgets`} onClick={() => navigate('/budgets')} />
                  <AlertRow label={finance.trialDifference < 0.01 ? 'Trial balance is matched in real time' : 'Trial balance difference needs review'} onClick={() => navigate('/accounting/reports')} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="modules">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.moduleCards.map((module) => (
                <Card key={module.key} className="cursor-pointer transition-shadow hover:shadow-sm" onClick={() => navigate(module.route)}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <module.icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{module.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    <div className="space-y-1 border-t pt-3">
                      <p className="text-sm font-semibold text-foreground">{module.metric}</p>
                      <p className="text-xs text-muted-foreground">{module.detail}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profitability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthBar label="Profit Margin" value={metrics.profitMargin} max={100} suffix="%" />
                  <HealthBar label="Expense Ratio" value={metrics.expenseRatio} max={100} suffix="%" inverse />
                  <HealthBar label="Budget Utilization" value={metrics.budgetUtilization} max={100} suffix="%" inverse />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Liquidity & Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthBar label="Cash Coverage" value={percent(finance.cashBalance, metrics.totalExpenses || 1)} max={100} suffix="%" />
                  <HealthBar label="AR / AP Ratio" value={percent(metrics.receivables, metrics.payables || 1)} max={200} suffix="%" />
                  <HealthBar label="Payroll as Expense Share" value={percent(metrics.payrollGross, metrics.totalExpenses || 1)} max={100} suffix="%" inverse />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integration">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Module Integration Points</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.integrationPoints.map((point) => (
                  <IntegrationRow key={point.source} point={point} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function postedStatementsCount(sourceModuleCounts: Record<string, number>) {
  return ['sales', 'procurement', 'production'].reduce((sum, key) => sum + Number(sourceModuleCounts[key] || 0), 0);
}

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | null;
  icon: typeof Activity;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {value === null ? <Skeleton className="h-7 w-28" /> : <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>}
        {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function BalanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function AlertRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-md border bg-muted/30 p-2 text-left text-xs transition-colors hover:bg-muted/60">
      <ArrowRight className="h-3.5 w-3.5 text-primary" />
      <span className="flex-1 text-foreground">{label}</span>
    </button>
  );
}

function HealthBar({
  label,
  value,
  max,
  suffix,
  inverse,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  inverse?: boolean;
}) {
  const safeValue = Math.max(0, Math.min(value, max));
  const width = `${Math.max(6, Math.round((safeValue / max) * 100))}%`;
  const tone = inverse && safeValue > max * 0.75 ? 'bg-destructive' : 'bg-primary';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground">{value}{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full transition-all', tone)} style={{ width }} />
      </div>
    </div>
  );
}

function IntegrationRow({ point }: { point: IntegrationPoint }) {
  const variant = point.status === 'connected' ? 'default' : point.status === 'partial' ? 'secondary' : 'outline';
  const label = point.status === 'connected' ? 'Connected' : point.status === 'partial' ? 'Needs review' : 'No activity yet';

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{point.source}</Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="secondary">{point.target}</Badge>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground md:max-w-[60%] md:text-right">{point.detail}</p>
    </div>
  );
}