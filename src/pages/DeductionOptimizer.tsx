import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, CheckCircle2, TrendingUp, Zap, RefreshCw,
  BookOpen, Clock, ShieldAlert, ShieldCheck, Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery, useTenantUpdate } from '@/hooks/use-tenant-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Finding {
  id: string;
  finding: string;
  potential_saving_tzs: number;
  regulation: string;
  actioned: boolean;
  created_at: string;
}

function formatTZS(amount: number): string {
  return 'TZS ' + new Intl.NumberFormat('en-TZ').format(Math.round(amount));
}

const DEMO_FINDINGS: Finding[] = [
  {
    id: '1',
    finding: 'Staff training costs of TZS 2.3M appear to be expensed incorrectly. These qualify as deductible under ITA Cap 332 S.17',
    potential_saving_tzs: 690000,
    regulation: 'ITA Cap 332, Section 17',
    actioned: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    finding: 'Vehicle depreciation on 3 company vehicles has not been claimed. Capital allowance of 37.5% in year 1 applies',
    potential_saving_tzs: 1406250,
    regulation: 'ITA Cap 332, Section 27',
    actioned: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    finding: 'Office equipment purchased Q2 2025 (TZS 4.8M) qualifies for accelerated capital allowance',
    potential_saving_tzs: 432000,
    regulation: 'ITA Cap 332, Section 27(3)',
    actioned: true,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: '4',
    finding: 'Input VAT on professional services (legal/audit fees TZS 1.2M) appears unclaimed for Q2 2025',
    potential_saving_tzs: 216000,
    regulation: 'VAT Act Cap 148, Section 11',
    actioned: false,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '5',
    finding: 'SDL exemption may apply: your employee count dropped below 10 in Q3. Verify with TRA',
    potential_saving_tzs: 0,
    regulation: 'SDL Act',
    actioned: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'verify';

function getSeverity(saving: number): Severity {
  if (saving === 0) return 'verify';
  if (saving > 1_000_000) return 'critical';
  if (saving > 500_000) return 'high';
  if (saving > 100_000) return 'medium';
  return 'low';
}

const SEVERITY_CONFIG: Record<Severity, { label: string; icon: typeof AlertTriangle; color: string; bg: string; badgeClass: string }> = {
  critical: { label: 'Critical', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: 'High', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  medium: { label: 'Medium', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Low', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  verify: { label: 'Verify', icon: CheckCircle2, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

type TabFilter = 'all' | 'pending' | 'actioned';

interface FindingCardProps {
  finding: Finding;
  onAction: (id: string) => void;
  actioning: boolean;
}

function FindingCard({ finding, onAction, actioning }: FindingCardProps) {
  const severity = getSeverity(finding.potential_saving_tzs);
  const cfg = SEVERITY_CONFIG[severity];
  const SeverityIcon = cfg.icon;
  const dateLabel = new Date(finding.created_at).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Card className={cn(
      'border-border rounded-xl transition-all',
      finding.actioned && 'opacity-70',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
            <SeverityIcon className={cn('w-4 h-4', cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border-0', cfg.badgeClass)}>
                {cfg.label}
              </Badge>
              {finding.actioned && (
                <Badge className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Actioned
                </Badge>
              )}
            </div>

            <p className="text-sm text-foreground leading-relaxed mb-3">{finding.finding}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {finding.potential_saving_tzs > 0 ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {formatTZS(finding.potential_saving_tzs)} potential saving
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verify with TRA
                </span>
              )}

              <span className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="w-3 h-3" />
                {finding.regulation}
              </span>

              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                Found {dateLabel}
              </span>
            </div>

            {!finding.actioned && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAction(finding.id)}
                  disabled={actioning}
                >
                  {actioning ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark as Actioned
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeductionOptimizer() {
  const { isDemo, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [demoFindings, setDemoFindings] = useState<Finding[]>(DEMO_FINDINGS);

  const { data: rawData, isLoading } = useTenantQuery('tax_optimization_findings' as any);
  const updateFinding = useTenantUpdate('tax_optimization_findings' as any);

  const findings: Finding[] = useMemo(() => {
    if (isDemo) return demoFindings;
    return (rawData as Finding[]) ?? [];
  }, [isDemo, demoFindings, rawData]);

  const filtered = useMemo(() => {
    if (activeTab === 'pending') return findings.filter(f => !f.actioned);
    if (activeTab === 'actioned') return findings.filter(f => f.actioned);
    return findings;
  }, [findings, activeTab]);

  const stats = useMemo(() => ({
    totalSaving: findings.filter(f => !f.actioned).reduce((sum, f) => sum + f.potential_saving_tzs, 0),
    total: findings.length,
    actioned: findings.filter(f => f.actioned).length,
  }), [findings]);

  const runAnalysis = async () => {
    if (isDemo) {
      setAnalysisLoading(true);
      await new Promise(r => setTimeout(r, 1500));
      setAnalysisLoading(false);
      toast.success('Analysis complete (demo)');
      return;
    }

    setAnalysisLoading(true);
    try {
      const { error } = await supabase.functions.invoke('tax-optimizer', {
        body: { tenantId: tenant?.id },
      });
      if (error) throw error;
      toast.success('Analysis complete — new findings loaded');
    } catch {
      toast.error('Failed to run analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAction = async (id: string) => {
    setActioningId(id);
    if (isDemo) {
      await new Promise(r => setTimeout(r, 600));
      setDemoFindings(prev => prev.map(f => f.id === id ? { ...f, actioned: true } : f));
      toast.success('Finding marked as actioned');
      setActioningId(null);
      return;
    }

    try {
      await updateFinding.mutateAsync({ id, actioned: true });
    } catch {
      toast.error('Failed to update finding');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <AppLayout title="Deduction Optimizer" subtitle="AI-identified tax savings and missed deductions">
      <div className="max-w-4xl">
        <PageHeader
          title="Deduction Optimizer"
          subtitle="AI-identified tax savings and missed deductions"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          breadcrumb={[{ label: 'Tax Intelligence' }, { label: 'Deduction Optimizer' }]}
          actions={[
            {
              label: analysisLoading ? 'Analyzing...' : 'Run Analysis',
              icon: Zap,
              onClick: runAnalysis,
              disabled: analysisLoading,
            },
          ]}
          stats={[
            { label: 'Total Potential Savings', value: formatTZS(stats.totalSaving), color: 'text-emerald-600' },
            { label: 'Findings', value: stats.total },
            { label: 'Actioned', value: stats.actioned, color: 'text-emerald-600' },
          ]}
        />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(['all', 'pending', 'actioned'] as TabFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab} {tab === 'all' ? `(${stats.total})` : tab === 'pending' ? `(${stats.total - stats.actioned})` : `(${stats.actioned})`}
            </button>
          ))}
        </div>

        {/* Findings grid */}
        {(isLoading && !isDemo) ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <Card key={i} className="border-border rounded-xl">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted rounded animate-pulse w-full" />
                      <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No findings in this category</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeTab === 'actioned'
                ? 'No findings have been actioned yet.'
                : 'Run analysis to discover potential tax savings.'}
            </p>
            {activeTab !== 'actioned' && (
              <Button onClick={runAnalysis} disabled={analysisLoading} className="gap-1.5">
                <Zap className="w-4 h-4" />
                {analysisLoading ? 'Running Analysis...' : 'Run Analysis'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(finding => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onAction={handleAction}
                actioning={actioningId === finding.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
