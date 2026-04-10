import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Calculator, TrendingUp, Users, DollarSign, Lightbulb, BarChart3,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ScenarioResult {
  paye_annual: number;
  sdl_annual: number;
  vat_annual: number;
  corporate_tax_annual: number;
  total_burden: number;
  burden_pct: number;
  ai_commentary: string;
}

function formatTZS(amount: number): string {
  return 'TZS ' + new Intl.NumberFormat('en-TZ').format(Math.round(amount));
}

function computePAYEMonthly(salary: number): number {
  if (salary <= 270000) return 0;
  if (salary <= 520000) return 0.08 * (salary - 270000);
  if (salary <= 760000) return 20000 + 0.20 * (salary - 520000);
  if (salary <= 1000000) return 68000 + 0.25 * (salary - 760000);
  return 128000 + 0.30 * (salary - 1000000);
}

function computeScenario(
  monthlyRevenue: number,
  numEmployees: number,
  avgSalary: number,
  capex: number,
): Omit<ScenarioResult, 'ai_commentary'> {
  const payeMonthly = computePAYEMonthly(avgSalary) * numEmployees;
  const paye_annual = payeMonthly * 12;

  const sdl_annual = numEmployees > 10
    ? 0.035 * avgSalary * numEmployees * 12
    : 0;

  const annualRevenue = monthlyRevenue * 12;
  const outputVAT = 0.18 * annualRevenue * 0.8;
  const inputVAT = 0.18 * annualRevenue * 0.3;
  const vat_annual = Math.max(0, outputVAT - inputVAT);

  const annualPayroll = numEmployees * avgSalary * 12;
  const annualCosts = annualRevenue * 0.3;
  const capexAllowance = capex / 5;
  const netProfit = annualRevenue - annualPayroll - annualCosts - capexAllowance;
  const corporate_tax_annual = netProfit > 0 ? 0.30 * netProfit : 0;

  const total_burden = paye_annual + sdl_annual + vat_annual + corporate_tax_annual;
  const burden_pct = annualRevenue > 0 ? (total_burden / annualRevenue) * 100 : 0;

  return { paye_annual, sdl_annual, vat_annual, corporate_tax_annual, total_burden, burden_pct };
}

const DEMO_COMMENTARY =
  "Your effective tax burden of 34.2% is within the typical range for Tanzanian SMEs in your revenue bracket. The largest contributor is VAT at TZS 12.9M annually — consider reviewing your input VAT credits to ensure all eligible purchases are captured. With 5 employees you are below the SDL threshold, saving approximately TZS 840,000/year.";

interface MetricCardProps {
  label: string;
  amount: number;
  pct?: number;
  icon: typeof DollarSign;
  color: string;
  bg: string;
  loading?: boolean;
}

function MetricCard({ label, amount, pct, icon: Icon, color, bg, loading }: MetricCardProps) {
  return (
    <Card className="border-border rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            {loading ? (
              <>
                <Skeleton className="h-5 w-28 mb-1" />
                <Skeleton className="h-3 w-16" />
              </>
            ) : (
              <>
                <p className="text-base font-bold text-foreground">{formatTZS(amount)}</p>
                {pct !== undefined && (
                  <p className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(1)}% of revenue</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaxScenarios() {
  const { isDemo, tenant } = useAuth();

  const [monthlyRevenue, setMonthlyRevenue] = useState(5_000_000);
  const [numEmployees, setNumEmployees] = useState(5);
  const [avgSalary, setAvgSalary] = useState(800_000);
  const [capex, setCapex] = useState(0);
  const [results, setResults] = useState<ScenarioResult | null>(null);
  const [computing, setComputing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runComputation = useCallback(async (rev: number, emp: number, sal: number, cx: number) => {
    setComputing(true);
    const nums = computeScenario(rev, emp, sal, cx);

    if (isDemo) {
      await new Promise(r => setTimeout(r, 400));
      setResults({ ...nums, ai_commentary: DEMO_COMMENTARY });
      setComputing(false);
      return;
    }

    // Get AI commentary
    try {
      const { data } = await supabase.functions.invoke('tax-consultant', {
        body: {
          mode: 'scenario',
          scenario: {
            monthlyRevenue: rev,
            numEmployees: emp,
            avgSalary: sal,
            capex: cx,
            ...nums,
          },
          tenantId: tenant?.id,
        },
      });
      setResults({
        ...nums,
        ai_commentary: data?.message ?? data?.content ?? 'Analysis complete.',
      });
    } catch {
      setResults({ ...nums, ai_commentary: 'AI commentary unavailable. Tax figures above are calculated locally.' });
    }
    setComputing(false);
  }, [isDemo, tenant?.id]);

  // Debounce recompute whenever inputs change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runComputation(monthlyRevenue, numEmployees, avgSalary, capex);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [monthlyRevenue, numEmployees, avgSalary, capex, runComputation]);

  const annualRevenue = monthlyRevenue * 12;

  const metrics = results
    ? [
        { label: 'PAYE (Annual)', amount: results.paye_annual, pct: (results.paye_annual / annualRevenue) * 100, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        { label: 'SDL (Annual)', amount: results.sdl_annual, pct: (results.sdl_annual / annualRevenue) * 100, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        { label: 'VAT (Annual)', amount: results.vat_annual, pct: (results.vat_annual / annualRevenue) * 100, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        { label: 'Corporate Tax (Annual)', amount: results.corporate_tax_annual, pct: (results.corporate_tax_annual / annualRevenue) * 100, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
      ]
    : [];

  return (
    <AppLayout title="Tax Scenarios" subtitle="Model your tax exposure under different business scenarios">
      <div className="max-w-7xl">
        <PageHeader
          title="Tax Scenarios"
          subtitle="Model your tax exposure under different business scenarios"
          icon={Calculator}
          iconColor="text-violet-600"
          breadcrumb={[{ label: 'Tax Intelligence' }, { label: 'Tax Scenarios' }]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left: inputs */}
          <div className="xl:col-span-2 space-y-5">
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  Business Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Monthly Revenue */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Monthly Revenue</Label>
                    <span className="text-sm font-semibold text-foreground">{formatTZS(monthlyRevenue)}</span>
                  </div>
                  <Slider
                    min={0}
                    max={50_000_000}
                    step={500_000}
                    value={[monthlyRevenue]}
                    onValueChange={([v]) => setMonthlyRevenue(v)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>TZS 0</span>
                    <span>TZS 50M</span>
                  </div>
                </div>

                {/* Number of Employees */}
                <div className="space-y-2">
                  <Label className="text-sm">Number of Employees</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={numEmployees}
                      onChange={e => setNumEmployees(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                      className="w-28 text-sm"
                    />
                    {numEmployees <= 10 && (
                      <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 border-0">
                        SDL exempt
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">SDL applies when {'>'} 10 employees</p>
                </div>

                {/* Average Monthly Salary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Avg Monthly Salary</Label>
                    <span className="text-sm font-semibold text-foreground">{formatTZS(avgSalary)}</span>
                  </div>
                  <Slider
                    min={200_000}
                    max={5_000_000}
                    step={50_000}
                    value={[avgSalary]}
                    onValueChange={([v]) => setAvgSalary(v)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>TZS 200K</span>
                    <span>TZS 5M</span>
                  </div>
                </div>

                {/* Capex */}
                <div className="space-y-2">
                  <Label className="text-sm">Planned Capital Expenditure (annual)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={100000}
                    value={capex}
                    onChange={e => setCapex(Math.max(0, Number(e.target.value) || 0))}
                    className="text-sm"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-muted-foreground">Depreciated over 5 years for corporate tax</p>
                </div>

                {/* PAYE bands reference */}
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tanzania PAYE Bands</p>
                  {[
                    ['0 – 270,000', '0%'],
                    ['270,001 – 520,000', '8%'],
                    ['520,001 – 760,000', '20%'],
                    ['760,001 – 1,000,000', '25%'],
                    ['> 1,000,000', '30%'],
                  ].map(([band, rate]) => (
                    <div key={band} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{band}</span>
                      <span className="font-medium text-foreground">{rate}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: results */}
          <div className="xl:col-span-3 space-y-4">
            {/* 4 metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {computing || !results
                ? [0, 1, 2, 3].map(i => (
                    <Card key={i} className="border-border rounded-xl">
                      <CardContent className="p-4">
                        <Skeleton className="h-9 w-9 rounded-lg mb-2" />
                        <Skeleton className="h-3 w-24 mb-1.5" />
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </CardContent>
                    </Card>
                  ))
                : metrics.map(m => (
                    <MetricCard key={m.label} {...m} loading={computing} />
                  ))
              }
            </div>

            {/* Total burden card */}
            <Card className={cn(
              'border-border rounded-xl',
              results && results.burden_pct > 40 ? 'border-red-200 dark:border-red-800/50' : '',
              results && results.burden_pct <= 25 ? 'border-emerald-200 dark:border-emerald-800/50' : '',
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Annual Tax Burden</p>
                    {computing || !results ? (
                      <>
                        <Skeleton className="h-7 w-40 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-foreground">{formatTZS(results.total_burden)}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          <span className={cn(
                            'font-semibold',
                            results.burden_pct > 40 ? 'text-red-600' : results.burden_pct <= 25 ? 'text-emerald-600' : 'text-amber-600'
                          )}>
                            {results.burden_pct.toFixed(1)}%
                          </span>
                          {' '}of annual revenue
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Annual Revenue</p>
                    <p className="text-sm font-semibold text-foreground">{formatTZS(annualRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Commentary */}
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  AI Commentary
                  <Badge variant="secondary" className="text-[10px]">Tax Consultant AI</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {computing || !results ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground">{results.ai_commentary}</p>
                )}
              </CardContent>
            </Card>

            {/* Summary table */}
            {results && !computing && (
              <Card className="border-border rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Tax Summary Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 text-muted-foreground font-medium">Tax Type</th>
                        <th className="text-right pb-2 text-muted-foreground font-medium">Annual Amount</th>
                        <th className="text-right pb-2 text-muted-foreground font-medium">% Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {[
                        { label: 'PAYE', amount: results.paye_annual },
                        { label: 'SDL', amount: results.sdl_annual },
                        { label: 'VAT (net)', amount: results.vat_annual },
                        { label: 'Corporate Tax', amount: results.corporate_tax_annual },
                      ].map(row => (
                        <tr key={row.label}>
                          <td className="py-2 text-foreground">{row.label}</td>
                          <td className="py-2 text-right font-medium text-foreground">{formatTZS(row.amount)}</td>
                          <td className="py-2 text-right text-muted-foreground">
                            {annualRevenue > 0 ? ((row.amount / annualRevenue) * 100).toFixed(1) : '0.0'}%
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border">
                        <td className="pt-2 font-bold text-foreground">Total</td>
                        <td className="pt-2 text-right font-bold text-foreground">{formatTZS(results.total_burden)}</td>
                        <td className="pt-2 text-right font-bold text-foreground">{results.burden_pct.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
