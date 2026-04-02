import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  BookOpen, FileText, BarChart3, TrendingUp, TrendingDown,
  ArrowRight, Calculator, Wallet, Scale, Terminal,
  CheckCircle2, Clock, AlertTriangle, Plus,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CompanySwitcher from '@/components/company/CompanySwitcher';

interface VoucherSummary {
  total: number;
  posted: number;
  draft: number;
  totalValue: number;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashBalance: number;
  receivables: number;
  payables: number;
}

interface RecentVoucher {
  id: string;
  voucher_number: string;
  voucher_type: string;
  narration: string;
  voucher_date: string;
  status: string;
  is_auto: boolean;
  total_debit: number;
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(var(--accent-foreground))',
  'hsl(152, 69%, 38%)',
  'hsl(38, 92%, 50%)',
];

export default function Accounting() {
  const navigate = useNavigate();
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [voucherSummary, setVoucherSummary] = useState<VoucherSummary>({ total: 0, posted: 0, draft: 0, totalValue: 0 });
  const [financial, setFinancial] = useState<FinancialSummary>({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0,
    totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
    cashBalance: 0, receivables: 0, payables: 0,
  });
  const [recentVouchers, setRecentVouchers] = useState<RecentVoucher[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    if (!tenant?.id || isDemo) {
      // Demo data
      setVoucherSummary({ total: 156, posted: 142, draft: 14, totalValue: 4850000 });
      setFinancial({
        totalRevenue: 12500000, totalExpenses: 8200000, netProfit: 4300000,
        totalAssets: 28500000, totalLiabilities: 12800000, totalEquity: 15700000,
        cashBalance: 6200000, receivables: 3400000, payables: 2100000,
      });
      setRecentVouchers([
        { id: '1', voucher_number: 'SAL-26-00045', voucher_type: 'sale', narration: 'Sales: SO-1234 — ABC Ltd', voucher_date: '2026-04-01', status: 'posted', is_auto: true, total_debit: 590000 },
        { id: '2', voucher_number: 'PUR-26-00023', voucher_type: 'purchase', narration: 'Purchase: PO-0087 — Supplier X', voucher_date: '2026-04-01', status: 'posted', is_auto: true, total_debit: 320000 },
        { id: '3', voucher_number: 'JOU-26-00012', voucher_type: 'journal', narration: 'Monthly depreciation', voucher_date: '2026-03-31', status: 'draft', is_auto: false, total_debit: 85000 },
        { id: '4', voucher_number: 'PAY-26-00018', voucher_type: 'payment', narration: 'Payment to Vendor Y', voucher_date: '2026-03-30', status: 'posted', is_auto: false, total_debit: 450000 },
        { id: '5', voucher_number: 'REC-26-00009', voucher_type: 'receipt', narration: 'Receipt from Customer Z', voucher_date: '2026-03-29', status: 'posted', is_auto: false, total_debit: 280000 },
      ]);
      setMonthlyData([
        { month: 'Jan', revenue: 1800000, expenses: 1200000 },
        { month: 'Feb', revenue: 2100000, expenses: 1400000 },
        { month: 'Mar', revenue: 2500000, expenses: 1600000 },
      ]);
      setLoading(false);
      return;
    }

    loadData();
  }, [tenant?.id, isDemo]);

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);

    const [vouchersRes, balancesRes, accountsRes] = await Promise.all([
      (supabase as any).from('accounting_vouchers')
        .select('id, voucher_number, voucher_type, narration, voucher_date, status, is_auto, entries:accounting_voucher_entries(debit)')
        .eq('tenant_id', tenant.id)
        .order('voucher_date', { ascending: false })
        .limit(500),
      (supabase as any).from('accounting_ledger_balances')
        .select('account_id, total_debit, total_credit, running_balance')
        .eq('tenant_id', tenant.id),
      (supabase as any).from('chart_of_accounts')
        .select('id, name, account_type')
        .eq('tenant_id', tenant.id),
    ]);

    const vouchers = vouchersRes.data ?? [];
    const balances = balancesRes.data ?? [];
    const accounts = accountsRes.data ?? [];

    // Build account type map
    const accountTypeMap: Record<string, string> = {};
    const accountNameMap: Record<string, string> = {};
    accounts.forEach((a: any) => { accountTypeMap[a.id] = a.account_type; accountNameMap[a.id] = a.name; });

    // Voucher summary
    const posted = vouchers.filter((v: any) => v.status === 'posted');
    const drafts = vouchers.filter((v: any) => v.status === 'draft');
    const totalValue = posted.reduce((s: number, v: any) =>
      s + (v.entries ?? []).reduce((es: number, e: any) => es + Number(e.debit), 0), 0);
    setVoucherSummary({ total: vouchers.length, posted: posted.length, draft: drafts.length, totalValue });

    // Financial summary from balances
    let revenue = 0, expenses = 0, assets = 0, liabilities = 0, equity = 0, cash = 0, receivables = 0, payables = 0;
    balances.forEach((b: any) => {
      const type = accountTypeMap[b.account_id] || '';
      const name = (accountNameMap[b.account_id] || '').toLowerCase();
      const bal = Number(b.running_balance);

      if (type === 'revenue' || type === 'income') revenue += Math.abs(bal);
      else if (type === 'expense') expenses += Math.abs(bal);
      else if (type === 'asset') {
        assets += bal;
        if (name.includes('cash') || name.includes('bank')) cash += bal;
        if (name.includes('receivable')) receivables += bal;
      }
      else if (type === 'liability') {
        liabilities += Math.abs(bal);
        if (name.includes('payable')) payables += Math.abs(bal);
      }
      else if (type === 'equity') equity += Math.abs(bal);
    });

    setFinancial({
      totalRevenue: revenue, totalExpenses: expenses, netProfit: revenue - expenses,
      totalAssets: assets, totalLiabilities: liabilities, totalEquity: equity,
      cashBalance: cash, receivables, payables,
    });

    // Recent vouchers
    setRecentVouchers(vouchers.slice(0, 8).map((v: any) => ({
      ...v,
      total_debit: (v.entries ?? []).reduce((s: number, e: any) => s + Number(e.debit), 0),
    })));

    // Monthly chart data
    const months: Record<string, { revenue: number; expenses: number }> = {};
    vouchers.filter((v: any) => v.status === 'posted').forEach((v: any) => {
      const m = new Date(v.voucher_date).toLocaleDateString('en-US', { month: 'short' });
      if (!months[m]) months[m] = { revenue: 0, expenses: 0 };
      const total = (v.entries ?? []).reduce((s: number, e: any) => s + Number(e.debit), 0);
      if (v.voucher_type === 'sale' || v.voucher_type === 'receipt') months[m].revenue += total;
      else if (v.voucher_type === 'purchase' || v.voucher_type === 'payment') months[m].expenses += total;
    });
    setMonthlyData(Object.entries(months).map(([month, v]) => ({ month, ...v })));

    setLoading(false);
  };

  const TYPE_LABELS: Record<string, string> = {
    sale: 'Sale', purchase: 'Purchase', payment: 'Payment', receipt: 'Receipt',
    journal: 'Journal', contra: 'Contra', credit_note: 'Cr Note', debit_note: 'Dr Note',
  };

  const quickLinks = [
    { label: 'Vouchers', description: 'Create & manage vouchers', icon: FileText, path: '/accounting/vouchers', color: 'text-primary' },
    { label: 'Ledger', description: 'Account-wise transaction view', icon: BookOpen, path: '/accounting/ledger', color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Financial Reports', description: 'P&L, Balance Sheet, Trial Balance', icon: BarChart3, path: '/accounting/reports', color: 'text-purple-600 dark:text-purple-400' },
    { label: 'New Voucher', description: 'Record a journal entry', icon: Plus, path: '/accounting/vouchers/new', color: 'text-green-600 dark:text-green-400' },
  ];

  const bsChartData = [
    { name: 'Assets', value: financial.totalAssets },
    { name: 'Liabilities', value: financial.totalLiabilities },
    { name: 'Equity', value: financial.totalEquity },
  ].filter(d => d.value > 0);

  return (
    <AppLayout title="Accounting" subtitle="Double-entry accounting engine">
      <div className="space-y-5">
        {/* Company Switcher */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Accounting Dashboard</h2>
            <p className="text-xs text-muted-foreground">Active company: {tenant?.name || 'Demo'}</p>
          </div>
          <CompanySwitcher />
        </div>
        {/* Financial KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Revenue', value: financial.totalRevenue, icon: TrendingUp, color: 'text-green-600 dark:text-green-400' },
            { label: 'Expenses', value: financial.totalExpenses, icon: TrendingDown, color: 'text-destructive' },
            { label: 'Net Profit', value: financial.netProfit, icon: Calculator, color: financial.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive' },
            { label: 'Cash Position', value: financial.cashBalance, icon: Wallet, color: 'text-foreground' },
            { label: 'Receivables', value: financial.receivables, icon: ArrowRight, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Payables', value: financial.payables, icon: ArrowRight, color: 'text-orange-600 dark:text-orange-400' },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <kpi.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{kpi.label}</p>
                </div>
                {loading ? <Skeleton className="h-6 w-20" /> : (
                  <p className={cn("text-lg font-bold tabular-nums", kpi.color)}>{formatMoney(kpi.value)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue vs Expenses Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue vs Expenses (Voucher-Based)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[200px] w-full" /> : monthlyData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  <p>Post vouchers to see chart data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => formatMoney(v)} />
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Bar dataKey="revenue" fill="hsl(152, 69%, 38%)" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left"
                >
                  <link.icon className={cn("w-5 h-5 shrink-0", link.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                    <p className="text-[11px] text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Voucher Summary + Balance Sheet Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Voucher Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Voucher Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <Skeleton className="h-20 w-full" /> : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Vouchers</span>
                    <span className="text-sm font-bold">{voucherSummary.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Posted</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{voucherSummary.posted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-600" /> Drafts</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{voucherSummary.draft}</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Posted Value</span>
                      <span className="text-sm font-bold">{formatMoney(voucherSummary.totalValue)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Balance Sheet Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Balance Sheet Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[180px] w-full" /> : bsChartData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  No data yet
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={bsChartData} dataKey="value" cx="50%" cy="50%" outerRadius={60} strokeWidth={2}>
                        {bsChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {bsChartData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <div>
                          <p className="text-xs text-muted-foreground">{d.name}</p>
                          <p className="text-sm font-semibold tabular-nums">{formatMoney(d.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Vouchers */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Vouchers</CardTitle>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/accounting/vouchers')}>
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : recentVouchers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No vouchers yet</div>
              ) : (
                <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                  {recentVouchers.slice(0, 6).map(v => (
                    <button
                      key={v.id}
                      onClick={() => !isDemo && navigate(`/accounting/vouchers/${v.id}`)}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-foreground">{v.voucher_number}</span>
                          {v.is_auto && <Badge variant="outline" className="text-[9px] px-1 py-0">Auto</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{v.narration}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold tabular-nums">{formatMoney(v.total_debit)}</p>
                        <Badge
                          className={cn("text-[9px] px-1 py-0",
                            v.status === 'posted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          )}
                        >{v.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Integration Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">🔗 Module Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { module: 'Sales', event: 'Invoice → Voucher', active: true },
                { module: 'Purchases', event: 'PO Received → Voucher', active: true },
                { module: 'Production', event: 'Completed → Voucher', active: true },
                { module: 'Inventory', event: 'Stock → COGS', active: true },
                { module: 'Payments', event: 'Cash/Bank → Voucher', active: true },
                { module: 'VAT (18%)', event: 'TRA-ready output', active: true },
              ].map(m => (
                <div key={m.module} className="rounded-lg border border-border p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 className={cn("w-3.5 h-3.5", m.active ? "text-green-600" : "text-muted-foreground")} />
                    <span className="text-xs font-semibold">{m.module}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.event}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
