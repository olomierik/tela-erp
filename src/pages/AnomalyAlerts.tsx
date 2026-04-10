import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  AlertTriangle, DollarSign, Copy, Clock, Shield,
  CheckCircle2, ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTenantQuery, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnomalyAlert {
  id: string;
  transaction_id: string;
  transaction_date: string;
  amount: number;
  alert_type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggested_action: string;
  resolved: boolean;
  created_at: string;
}

const DEMO_DATA: AnomalyAlert[] = [
  {
    id: '1',
    transaction_id: 'TXN-20250912-001',
    transaction_date: '2025-09-12',
    amount: 12500000,
    alert_type: 'large_amount',
    description: 'Cash withdrawal of TZS 12.5M — exceeds 200% of 3-month rolling average (TZS 4.1M)',
    severity: 'high',
    suggested_action: 'Verify with Finance Manager and check supporting documentation',
    resolved: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    transaction_id: 'TXN-20250910-045',
    transaction_date: '2025-09-10',
    amount: 5000000,
    alert_type: 'missing_po',
    description: 'Round-number payment TZS 5,000,000 to "General Vendor" — no matching purchase order found',
    severity: 'critical',
    suggested_action: 'Request invoice and PO from procurement department',
    resolved: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    transaction_id: 'TXN-20250908-022',
    transaction_date: '2025-09-08',
    amount: 340000,
    alert_type: 'duplicate',
    description: 'Possible duplicate: TZS 340,000 payment to Supplier ABC appears twice within 48 hours',
    severity: 'medium',
    suggested_action: 'Review both transactions — if duplicate, request refund from supplier',
    resolved: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '4',
    transaction_id: 'TXN-20250901-089',
    transaction_date: '2025-09-01',
    amount: 750000,
    alert_type: 'unusual_pattern',
    description: 'Payment processed at 02:34 AM EAT — outside normal business hours pattern',
    severity: 'medium',
    suggested_action: 'Confirm authorization with system administrator',
    resolved: false,
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: '5',
    transaction_id: 'TXN-20250827-011',
    transaction_date: '2025-08-27',
    amount: 1800000,
    alert_type: 'fraud_pattern',
    description: 'Three consecutive payments of TZS 600,000 to same vendor on same day — common invoice-splitting pattern',
    severity: 'high',
    suggested_action: 'Review vendor payment history and verify with procurement',
    resolved: true,
    created_at: new Date(Date.now() - 86400000 * 13).toISOString(),
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-amber-500',
  medium: 'border-l-4 border-l-blue-500',
  low: 'border-l-4 border-l-slate-300',
};

const ALERT_ICONS: Record<string, React.ReactNode> = {
  large_amount: <DollarSign className="w-5 h-5" />,
  missing_po: <AlertTriangle className="w-5 h-5" />,
  duplicate: <Copy className="w-5 h-5" />,
  unusual_pattern: <Clock className="w-5 h-5" />,
  fraud_pattern: <Shield className="w-5 h-5" />,
};

function formatTZS(amount: number) {
  return `TZS ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AnomalyAlerts() {
  const { isDemo } = useAuth();
  const navigate = useNavigate();

  const { data: rawData, isLoading } = useTenantQuery('ai_anomaly_alerts' as any, 'created_at');
  const updateAlert = useTenantUpdate('ai_anomaly_alerts' as any);

  const [alerts, setAlerts] = useState<AnomalyAlert[]>(() => isDemo ? DEMO_DATA : []);
  const allAlerts: AnomalyAlert[] = isDemo ? alerts : (rawData as AnomalyAlert[] ?? []);

  const [tab, setTab] = useState('all');

  const unresolvedCount = allAlerts.filter(a => !a.resolved).length;
  const criticalCount = allAlerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  const highCount = allAlerts.filter(a => a.severity === 'high' && !a.resolved).length;
  const resolvedCount = allAlerts.filter(a => a.resolved).length;

  const filteredAlerts = allAlerts.filter(a => {
    if (tab === 'unresolved') return !a.resolved;
    if (tab === 'critical') return a.severity === 'critical';
    if (tab === 'resolved') return a.resolved;
    return true;
  });

  const handleResolve = async (alert: AnomalyAlert) => {
    if (isDemo) {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: true } : a));
      toast.success(`Alert ${alert.transaction_id} marked as resolved`);
      return;
    }
    try {
      await updateAlert.mutateAsync({ id: alert.id, resolved: true });
      toast.success('Alert marked as resolved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to resolve alert');
    }
  };

  return (
    <AppLayout title="Anomaly Alerts" subtitle="AI-detected financial irregularities">
      <div className="max-w-5xl space-y-6">
        <PageHeader
          title="Anomaly Alerts"
          subtitle="AI-detected financial irregularities requiring review"
          icon={AlertTriangle}
          breadcrumb={[{ label: 'Finance' }, { label: 'Anomaly Alerts' }]}
          stats={[
            { label: 'Unresolved', value: unresolvedCount, color: 'text-amber-600' },
            { label: 'Critical', value: criticalCount, color: 'text-red-600' },
            { label: 'High', value: highCount, color: 'text-amber-600' },
            { label: 'Resolved', value: resolvedCount, color: 'text-green-600' },
          ]}
        />

        {/* Filter Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({allAlerts.length})</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved ({unresolvedCount})</TabsTrigger>
            <TabsTrigger value="critical">
              <span className="flex items-center gap-1.5">
                Critical ({criticalCount})
              </span>
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Alert Cards */}
        <div className="space-y-4">
          {isLoading && !isDemo ? (
            <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No alerts in this category</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map(alert => (
              <Card
                key={alert.id}
                className={cn(
                  SEVERITY_BORDER[alert.severity],
                  alert.resolved && 'opacity-60'
                )}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon + severity */}
                    <div className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                      SEVERITY_COLORS[alert.severity]
                    )}>
                      {ALERT_ICONS[alert.alert_type] ?? <AlertTriangle className="w-5 h-5" />}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
                          SEVERITY_COLORS[alert.severity]
                        )}>
                          {alert.severity}
                        </span>
                        {alert.resolved && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" /> Resolved
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
                      </div>

                      <p className="text-sm font-medium leading-snug">{alert.description}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          <span className="font-medium text-foreground">Transaction:</span> {alert.transaction_id}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">Date:</span> {formatDate(alert.transaction_date)}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">Amount:</span> {formatTZS(alert.amount)}
                        </span>
                      </div>

                      <p className="text-xs italic text-muted-foreground">
                        Suggested: {alert.suggested_action}
                      </p>

                      {/* Actions */}
                      {!alert.resolved && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Resolve this alert?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark the anomaly alert for transaction <strong>{alert.transaction_id}</strong> as resolved.
                                  This action is logged in the audit trail.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleResolve(alert)}>
                                  Confirm Resolve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={() => navigate('/accounting')}
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View Transaction
                          </Button>
                        </div>
                      )}

                      {alert.resolved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 mt-1"
                          onClick={() => navigate('/accounting')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View Transaction
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
