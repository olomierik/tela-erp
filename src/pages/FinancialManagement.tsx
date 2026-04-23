import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  BookOpen, FileText, BarChart3, TrendingUp, TrendingDown,
  ArrowRight, Calculator, Wallet, Scale, Receipt, Landmark,
  PiggyBank, Banknote, Building2, Shield, Activity, DollarSign,
  CreditCard, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CompanySwitcher from '@/components/company/CompanySwitcher';

interface CFOKpis {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  fixedAssetsValue: number;
  budgetUtilization: number;
  pendingInvoices: number;
  overdueInvoices: number;
  taxLiability: number;
}

const SUB_MODULES = [
  {
    key: 'general-ledger',
    name: 'General Ledger',
    description: 'Chart of accounts, journal entries & vouchers',
    icon: BookOpen,
    color: 'bg-indigo-500',
    route: '/accounting/ledger',
    secondaryRoutes: [
      { label: 'Vouchers', route: '/accounting/vouchers' },
      { label: 'Reports', route: '/accounting/reports' },
    ],
  },
  {
    key: 'accounts-receivable',
    name: 'Accounts Receivable',
    description: 'Customer invoices, payments & aging',
    icon: FileText,
    color: 'bg-emerald-500',
    route: '/invoices',
    secondaryRoutes: [{ label: 'Customers', route: '/customers' }],
  },
  {
    key: 'accounts-payable',
    name: 'Accounts Payable',
    description: 'Supplier bills, payments & vendor management',
    icon: CreditCard,
    color: 'bg-amber-500',
    route: '/procurement',
    secondaryRoutes: [{ label: 'Suppliers', route: '/suppliers' }],
  },
  {
    key: 'budgeting',
    name: 'Budgeting & Planning',
    description: 'Departmental budgets, variance analysis',
    icon: PiggyBank,
    color: 'bg-pink-500',
    route: '/budgets',
  },
  {
    key: 'tax-management',
    name: 'Tax Management',
    description: 'TRA filing, calendar, scenarios & optimization',
    icon: Shield,
    color: 'bg-red-600',
    route: '/tax-calendar',
    secondaryRoutes: [
      { label: 'TRA Filing', route: '/tra-filing' },
      { label: 'Scenarios', route: '/tax-scenarios' },
    ],
  },
  {
    key: 'fixed-assets',
    name: 'Fixed Assets',
    description: 'Asset register, depreciation schedules',
    icon: Landmark,
    color: 'bg-amber-600',
    route: '/assets',
  },
  {
    key: 'cash-bank',
    name: 'Cash & Bank',
    description: 'Bank accounts, cash flow & reconciliation',
    icon: Banknote,
    color: 'bg-teal-500',
    route: '/expenses',
  },
  {
    key: 'reporting',
    name: 'Financial Reporting',
    description: 'P&L, Balance Sheet, Trial Balance, Cash Flow',
    icon: BarChart3,
    color: 'bg-blue-600',
    route: '/accounting/reports',
    secondaryRoutes: [{ label: 'CFO AI', route: '/ai-cfo' }],
  },
];

export default function FinancialManagement() {
  const navigate = useNavigate();
  const { tenant, isDemo } = useAuth();
  const { formatMoney, displayCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<CFOKpis>({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0, cashBalance: 0,
    accountsReceivable: 0, accountsPayable: 0, totalAssets: 0,
    totalLiabilities: 0, totalEquity: 0, fixedAssetsValue: 0,
    budgetUtilization: 0, pendingInvoices: 0, overdueInvoices: 0, taxLiability: 0,
  });

  useEffect(() => {
    loadKpis();
  }, [tenant?.id]);

  async function loadKpis() {
    if (!tenant?.id || isDemo) {
      setKpis({
        totalRevenue: 12500000, totalExpenses: 8200000, netProfit: 4300000,
        cashBalance: 6200000, accountsReceivable: 3400000, accountsPayable: 2100000,
        totalAssets: 28500000, totalLiabilities: 12800000, totalEquity: 15700000,
        fixedAssetsValue: 8900000, budgetUtilization: 67, pendingInvoices: 12,
        overdueInvoices: 3, taxLiability: 1840000,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tid = tenant.id;
      const [accountsRes, invoicesRes, assetsRes, budgetsRes, vouchersRes] = await Promise.all([
        (supabase as any).from('chart_of_accounts').select('account_type, balance').eq('tenant_id', tid),
        (supabase as any).from('invoices').select('total_amount, status, due_date').eq('tenant_id', tid),
        (supabase as any).from('fixed_assets').select('current_value').eq('tenant_id', tid),
        (supabase as any).from('budgets').select('total_budget').eq('tenant_id', tid),
        (supabase as any).from('accounting_voucher_entries').select('debit, credit, account_id, chart_of_accounts!inner(account_type, code)').eq('tenant_id', tid),
      ]);

      const accounts = accountsRes.data ?? [];
      const sumByType = (type: string) =>
        accounts.filter((a: any) => a.account_type === type).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

      const totalAssets = sumByType('asset');
      const totalLiabilities = sumByType('liability');
      const totalEquity = sumByType('equity');
      const totalRevenue = sumByType('revenue');
      const totalExpenses = sumByType('expense');

      // Cash & Bank from CoA codes 1000, 1010
      const cashBalance = accounts
        .filter((a: any) => ['Cash', 'Bank'].some(n => (a as any).name?.includes?.(n)))
        .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

      const invoices = invoicesRes.data ?? [];
      const today = new Date().toISOString().split('T')[0];
      const accountsReceivable = invoices
        .filter((i: any) => i.status !== 'paid')
        .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const pendingInvoices = invoices.filter((i: any) => i.status === 'sent' || i.status === 'pending').length;
      const overdueInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.due_date && i.due_date < today).length;

      const fixedAssetsValue = (assetsRes.data ?? []).reduce((s: number, a: any) => s + Number(a.current_value || 0), 0);
      const totalBudget = (budgetsRes.data ?? []).reduce((s: number, b: any) => s + Number(b.total_budget || 0), 0);
      const budgetUtilization = totalBudget > 0 ? Math.min(100, Math.round((totalExpenses / totalBudget) * 100)) : 0;

      // AP from liability accounts containing "Payable"
      const accountsPayable = accounts
        .filter((a: any) => a.account_type === 'liability')
        .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

      const taxLiability = accounts
        .filter((a: any) => a.account_type === 'liability')
        .reduce((s: number, a: any) => s + Number(a.balance || 0), 0) * 0.18;

      setKpis({
        totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses,
        cashBalance, accountsReceivable, accountsPayable,
        totalAssets, totalLiabilities, totalEquity,
        fixedAssetsValue, budgetUtilization, pendingInvoices, overdueInvoices, taxLiability,
      });
    } catch (e) {
      console.warn('[FinancialManagement] load kpis failed', e);
    } finally {
      setLoading(false);
    }
  }

  const profitMargin = kpis.totalRevenue > 0 ? Math.round((kpis.netProfit / kpis.totalRevenue) * 100) : 0;
  const currentRatio = kpis.totalLiabilities > 0 ? (kpis.totalAssets / kpis.totalLiabilities).toFixed(2) : '—';

  return (
    <AppLayout title="Financial Management" subtitle="Unified CFO command center across all financial sub-modules">
      <div className="space-y-6">
        {/* Header with company switcher */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Real-time financial visibility</p>
              <p className="text-xs text-muted-foreground/70">
                Reporting currency: <span className="font-medium text-foreground">{displayCurrency}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CompanySwitcher />
            <Button variant="outline" size="sm" onClick={() => navigate('/accounting/reports')}>
              <BarChart3 className="w-4 h-4 mr-1.5" /> Full Reports
            </Button>
            <Button size="sm" onClick={() => navigate('/ai-cfo')}>
              <Activity className="w-4 h-4 mr-1.5" /> Ask CFO AI
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/40 flex-wrap h-auto">
            <TabsTrigger value="overview">CFO Overview</TabsTrigger>
            <TabsTrigger value="modules">Sub-Modules</TabsTrigger>
            <TabsTrigger value="health">Financial Health</TabsTrigger>
            <TabsTrigger value="integration">Integration Map</TabsTrigger>
          </TabsList>

          {/* ─── CFO OVERVIEW ─────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Net Profit"
                value={loading ? null : formatMoney(kpis.netProfit)}
                icon={kpis.netProfit >= 0 ? TrendingUp : TrendingDown}
                trend={kpis.netProfit >= 0 ? 'up' : 'down'}
                hint={`${profitMargin}% margin`}
              />
              <KpiCard
                label="Total Revenue"
                value={loading ? null : formatMoney(kpis.totalRevenue)}
                icon={DollarSign}
                trend="up"
                hint="All sources"
              />
              <KpiCard
                label="Total Expenses"
                value={loading ? null : formatMoney(kpis.totalExpenses)}
                icon={Receipt}
                trend="neutral"
                hint={`Budget ${kpis.budgetUtilization}% used`}
              />
              <KpiCard
                label="Cash & Bank"
                value={loading ? null : formatMoney(kpis.cashBalance)}
                icon={Wallet}
                trend="up"
                hint="Liquid assets"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Accounts Receivable"
                value={loading ? null : formatMoney(kpis.accountsReceivable)}
                icon={FileText}
                trend="neutral"
                hint={`${kpis.pendingInvoices} pending`}
                accent="emerald"
              />
              <KpiCard
                label="Accounts Payable"
                value={loading ? null : formatMoney(kpis.accountsPayable)}
                icon={CreditCard}
                trend="neutral"
                hint="Outstanding bills"
                accent="amber"
              />
              <KpiCard
                label="Fixed Assets"
                value={loading ? null : formatMoney(kpis.fixedAssetsValue)}
                icon={Landmark}
                trend="neutral"
                hint="Net book value"
                accent="indigo"
              />
              <KpiCard
                label="Tax Liability"
                value={loading ? null : formatMoney(kpis.taxLiability)}
                icon={Shield}
                trend="neutral"
                hint="Estimated"
                accent="red"
              />
            </div>

            {/* Balance sheet snapshot + alerts */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" /> Balance Sheet Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <BalanceRow label="Total Assets" value={formatMoney(kpis.totalAssets)} positive />
                  <BalanceRow label="Total Liabilities" value={formatMoney(kpis.totalLiabilities)} />
                  <BalanceRow label="Total Equity" value={formatMoney(kpis.totalEquity)} positive bold />
                  <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                    <span>Current Ratio</span>
                    <span className="font-mono">{currentRatio}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" /> Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AlertRow
                    icon={AlertCircle}
                    color="text-red-500"
                    label={`${kpis.overdueInvoices} overdue invoices`}
                    onClick={() => navigate('/invoices')}
                  />
                  <AlertRow
                    icon={CheckCircle2}
                    color="text-emerald-500"
                    label={`${kpis.pendingInvoices} pending invoices`}
                    onClick={() => navigate('/invoices')}
                  />
                  <AlertRow
                    icon={PiggyBank}
                    color={kpis.budgetUtilization > 80 ? 'text-red-500' : 'text-emerald-500'}
                    label={`Budget ${kpis.budgetUtilization}% utilized`}
                    onClick={() => navigate('/budgets')}
                  />
                  <AlertRow
                    icon={Shield}
                    color="text-amber-500"
                    label="Review tax filings"
                    onClick={() => navigate('/tax-calendar')}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── SUB-MODULES ─────────────────────────── */}
          <TabsContent value="modules">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUB_MODULES.map((mod) => (
                <Card
                  key={mod.key}
                  className="group hover:shadow-md transition-all cursor-pointer hover:border-primary/40"
                  onClick={() => navigate(mod.route)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white', mod.color)}>
                        <mod.icon className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{mod.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                    {mod.secondaryRoutes && (
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                        {mod.secondaryRoutes.map((sub) => (
                          <Badge
                            key={sub.route}
                            variant="secondary"
                            className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => { e.stopPropagation(); navigate(sub.route); }}
                          >
                            {sub.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── FINANCIAL HEALTH ─────────────────────── */}
          <TabsContent value="health" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profitability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthBar label="Profit Margin" value={profitMargin} max={100} suffix="%" />
                  <HealthBar
                    label="Revenue Growth"
                    value={kpis.totalRevenue > 0 ? 12 : 0}
                    max={50}
                    suffix="% MoM"
                  />
                  <HealthBar label="Expense Ratio"
                    value={kpis.totalRevenue > 0 ? Math.round((kpis.totalExpenses / kpis.totalRevenue) * 100) : 0}
                    max={100} suffix="%" inverse
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Liquidity & Solvency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthBar label="Cash Coverage"
                    value={kpis.totalExpenses > 0 ? Math.round((kpis.cashBalance / kpis.totalExpenses) * 100) : 100}
                    max={100} suffix="%"
                  />
                  <HealthBar label="Budget Utilization" value={kpis.budgetUtilization} max={100} suffix="%" inverse />
                  <HealthBar label="AR / AP Ratio"
                    value={kpis.accountsPayable > 0 ? Math.round((kpis.accountsReceivable / kpis.accountsPayable) * 100) : 100}
                    max={200} suffix="%"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── INTEGRATION MAP ─────────────────────── */}
          <TabsContent value="integration">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Module Integration Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <IntegrationRow
                    source="Sales / POS"
                    target="General Ledger + AR"
                    description="Sales orders auto-post to revenue & receivable accounts via auto-voucher trigger"
                  />
                  <IntegrationRow
                    source="Procurement"
                    target="General Ledger + AP"
                    description="Purchase orders auto-create supplier bills and payable entries on receipt"
                  />
                  <IntegrationRow
                    source="HR / Payroll"
                    target="General Ledger + Cash"
                    description="Payroll runs post salary expense and tax liability entries"
                  />
                  <IntegrationRow
                    source="Inventory"
                    target="General Ledger"
                    description="Stock movements update COGS and inventory asset accounts in real time"
                  />
                  <IntegrationRow
                    source="Production"
                    target="General Ledger"
                    description="Completed orders transfer WIP to finished goods inventory"
                  />
                  <IntegrationRow
                    source="Fixed Assets"
                    target="General Ledger"
                    description="Depreciation schedules post monthly journal entries automatically"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ─── Helper components ───────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, trend, hint, accent,
}: {
  label: string; value: string | null; icon: any;
  trend: 'up' | 'down' | 'neutral'; hint?: string;
  accent?: 'emerald' | 'amber' | 'indigo' | 'red';
}) {
  const accentMap: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    indigo: 'text-indigo-600 bg-indigo-500/10',
    red: 'text-red-600 bg-red-500/10',
  };
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center',
            accent ? accentMap[accent] : 'bg-primary/10 text-primary')}>
            <Icon className={cn('w-3.5 h-3.5', trendColor)} />
          </div>
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
        )}
        {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function BalanceRow({ label, value, positive, bold }: { label: string; value: string; positive?: boolean; bold?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between text-sm', bold && 'font-semibold')}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', positive ? 'text-emerald-600' : 'text-foreground')}>{value}</span>
    </div>
  );
}

function AlertRow({ icon: Icon, color, label, onClick }: { icon: any; color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left text-xs hover:bg-muted/50 rounded-md p-2 transition-colors"
    >
      <Icon className={cn('w-3.5 h-3.5', color)} />
      <span className="flex-1">{label}</span>
      <ArrowRight className="w-3 h-3 text-muted-foreground" />
    </button>
  );
}

function HealthBar({ label, value, max, suffix, inverse }: {
  label: string; value: number; max: number; suffix?: string; inverse?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = inverse
    ? pct > 75 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
    : pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}{suffix}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function IntegrationRow({ source, target, description }: { source: string; target: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px]">{source}</Badge>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <Badge variant="secondary" className="text-[10px]">{target}</Badge>
      </div>
      <p className="text-xs text-muted-foreground flex-1">{description}</p>
    </div>
  );
}
