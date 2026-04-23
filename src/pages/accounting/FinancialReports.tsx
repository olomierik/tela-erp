import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Scale, Download, RefreshCw } from 'lucide-react';
import { generatePDFReport } from '@/lib/pdf-reports';
import { toast } from 'sonner';

interface ReportRow {
  tenant_id: string;
  account_id?: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  running_balance: number;
}

export default function FinancialReports() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [tab, setTab] = useState('trial-balance');
  const [trialData, setTrialData] = useState<ReportRow[]>([]);
  const [plData, setPlData] = useState<ReportRow[]>([]);
  const [bsData, setBsData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    if (!tenant?.id || isDemo) { setLoading(false); return; }
    setLoading(true);
    const [tb, pl, bs] = await Promise.all([
      (supabase as any).from('trial_balance_view').select('*').eq('tenant_id', tenant.id).order('account_code'),
      (supabase as any).from('profit_loss_view').select('*').eq('tenant_id', tenant.id).order('account_code'),
      (supabase as any).from('balance_sheet_view').select('*').eq('tenant_id', tenant.id).order('account_code'),
    ]);
    setTrialData(tb.data ?? []);
    setPlData(pl.data ?? []);
    setBsData(bs.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, [tenant?.id]);

  // Realtime: refresh whenever any voucher is posted (manual or auto from sales/purchases/production)
  useEffect(() => {
    if (!tenant?.id || isDemo) return;
    const channel = supabase
      .channel('financial-reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounting_vouchers', filter: `tenant_id=eq.${tenant.id}` }, () => loadReports())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounting_voucher_entries', filter: `tenant_id=eq.${tenant.id}` }, () => loadReports())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, isDemo]);

  // P&L summary
  const totalIncome = plData.filter(r => r.account_type === 'revenue' || r.account_type === 'income')
    .reduce((s, r) => s + Math.abs(Number(r.running_balance)), 0);
  const totalExpenses = plData.filter(r => r.account_type === 'expense')
    .reduce((s, r) => s + Math.abs(Number(r.running_balance)), 0);
  const netPL = totalIncome - totalExpenses;

  // BS summary
  const totalAssets = bsData.filter(r => r.account_type === 'asset')
    .reduce((s, r) => s + Number(r.running_balance), 0);
  const totalLiabilities = bsData.filter(r => r.account_type === 'liability')
    .reduce((s, r) => s + Math.abs(Number(r.running_balance)), 0);
  const totalEquity = bsData.filter(r => r.account_type === 'equity')
    .reduce((s, r) => s + Math.abs(Number(r.running_balance)), 0);

  // TB totals
  const tbTotalDebit = trialData.reduce((s, r) => s + Number(r.total_debit), 0);
  const tbTotalCredit = trialData.reduce((s, r) => s + Number(r.total_credit), 0);

  // ── PDF download helpers ────────────────────────────────────────────────
  const today = new Date().toLocaleDateString();
  const tenantName = tenant?.name || 'TELA-ERP';

  const downloadTrialBalance = () => {
    if (!trialData.length) { toast.error('No data to export'); return; }
    generatePDFReport({
      title: 'Trial Balance',
      subtitle: `As at ${today}`,
      tenantName,
      headers: ['Code', 'Account', 'Type', 'Debit', 'Credit', 'Balance'],
      rows: trialData.map(r => [
        r.account_code, r.account_name, r.account_type,
        formatMoney(Number(r.total_debit)),
        formatMoney(Number(r.total_credit)),
        formatMoney(Number(r.running_balance)),
      ]),
      stats: [
        { label: 'Total Debit', value: formatMoney(tbTotalDebit) },
        { label: 'Total Credit', value: formatMoney(tbTotalCredit) },
        { label: 'Status', value: Math.abs(tbTotalDebit - tbTotalCredit) < 0.01 ? 'Balanced' : 'Out of balance' },
      ],
      numericColumns: [3, 4, 5],
    });
    toast.success('Trial Balance PDF downloaded');
  };

  const downloadProfitLoss = () => {
    if (!plData.length) { toast.error('No data to export'); return; }
    generatePDFReport({
      title: 'Profit & Loss Statement',
      subtitle: `As at ${today}`,
      tenantName,
      headers: ['Code', 'Account', 'Type', 'Amount'],
      rows: plData.map(r => [
        r.account_code, r.account_name, r.account_type,
        formatMoney(Math.abs(Number(r.running_balance))),
      ]),
      stats: [
        { label: 'Total Revenue', value: formatMoney(totalIncome) },
        { label: 'Total Expenses', value: formatMoney(totalExpenses) },
        { label: 'Net Profit', value: formatMoney(netPL) },
      ],
      numericColumns: [3],
    });
    toast.success('Profit & Loss PDF downloaded');
  };

  const downloadBalanceSheet = () => {
    if (!bsData.length) { toast.error('No data to export'); return; }
    generatePDFReport({
      title: 'Balance Sheet',
      subtitle: `As at ${today}`,
      tenantName,
      headers: ['Code', 'Account', 'Type', 'Amount'],
      rows: bsData.map(r => [
        r.account_code, r.account_name, r.account_type,
        formatMoney(Number(r.running_balance)),
      ]),
      stats: [
        { label: 'Total Assets', value: formatMoney(totalAssets) },
        { label: 'Total Liabilities', value: formatMoney(totalLiabilities) },
        { label: 'Total Equity', value: formatMoney(totalEquity) },
      ],
      numericColumns: [3],
    });
    toast.success('Balance Sheet PDF downloaded');
  };

  const ReportTable = ({ data, showType = false }: { data: ReportRow[]; showType?: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Code</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Account</th>
            {showType && <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>}
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Debit</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Credit</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.account_code}</td>
              <td className="px-4 py-2 text-sm font-medium">{r.account_name}</td>
              {showType && (
                <td className="px-4 py-2">
                  <span className="text-xs capitalize text-muted-foreground">{r.account_type}</span>
                </td>
              )}
              <td className="px-4 py-2 text-right tabular-nums text-sm">
                {Number(r.total_debit) > 0 ? formatMoney(Number(r.total_debit)) : '—'}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-sm">
                {Number(r.total_credit) > 0 ? formatMoney(Number(r.total_credit)) : '—'}
              </td>
              <td className={cn("px-4 py-2 text-right tabular-nums text-sm font-semibold",
                Number(r.running_balance) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
              )}>
                {formatMoney(Number(r.running_balance))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppLayout title="Financial Reports">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-sm text-muted-foreground">Real-time statements from all posted vouchers (manual + auto from Sales, Purchases, Production)</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={tab === 'trial-balance' ? downloadTrialBalance : tab === 'profit-loss' ? downloadProfitLoss : downloadBalanceSheet}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
            <Button size="sm" variant="outline" onClick={loadReports} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trial-balance" className="gap-1.5"><Scale className="w-3.5 h-3.5" /> Trial Balance</TabsTrigger>
            <TabsTrigger value="profit-loss" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance-sheet" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Balance Sheet</TabsTrigger>
          </TabsList>

          {/* Trial Balance */}
          <TabsContent value="trial-balance">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  Trial Balance
                  <div className="flex gap-4 text-sm font-normal">
                    <span>Total Dr: <strong className="tabular-nums">{formatMoney(tbTotalDebit)}</strong></span>
                    <span>Total Cr: <strong className="tabular-nums">{formatMoney(tbTotalCredit)}</strong></span>
                    <span className={cn(Math.abs(tbTotalDebit - tbTotalCredit) < 0.01 ? "text-green-600" : "text-destructive")}>
                      {Math.abs(tbTotalDebit - tbTotalCredit) < 0.01 ? '✓ Balanced' : `Diff: ${formatMoney(Math.abs(tbTotalDebit - tbTotalCredit))}`}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> : (
                  trialData.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No data — post vouchers to generate the trial balance</p>
                    </div>
                  ) : <ReportTable data={trialData} showType />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit & Loss */}
          <TabsContent value="profit-loss">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Revenue</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatMoney(totalIncome)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Expenses</p>
                <p className="text-xl font-bold text-destructive">{formatMoney(totalExpenses)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Net Profit</p>
                <p className={cn("text-xl font-bold", netPL >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>{formatMoney(netPL)}</p>
              </CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                {loading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> : (
                  plData.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No income/expense data yet</p>
                    </div>
                  ) : <ReportTable data={plData} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance-sheet">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Assets</p>
                <p className="text-xl font-bold text-foreground">{formatMoney(totalAssets)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Liabilities</p>
                <p className="text-xl font-bold text-destructive">{formatMoney(totalLiabilities)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Equity</p>
                <p className="text-xl font-bold text-foreground">{formatMoney(totalEquity)}</p>
              </CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                {loading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> : (
                  bsData.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No balance sheet data yet</p>
                    </div>
                  ) : <ReportTable data={bsData} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
