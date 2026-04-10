import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  ShieldCheck, LogIn, LogOut, ScanLine, List, Send,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action_type: string;
  performed_at: string;
  performed_by_user_id: string;
  metadata: Record<string, any>;
  return_type?: string | null;
  period?: string | null;
  tra_reference?: string | null;
}

const DEMO_DATA: AuditEntry[] = [
  { id: '1', action_type: 'login', performed_at: new Date(Date.now() - 86400000 * 2).toISOString(), performed_by_user_id: 'admin', metadata: {}, return_type: null, period: null, tra_reference: null },
  { id: '2', action_type: 'scan', performed_at: new Date(Date.now() - 86400000 * 2 + 60000).toISOString(), performed_by_user_id: 'admin', metadata: { obligations_found: 8 }, return_type: null, period: null, tra_reference: null },
  { id: '3', action_type: 'classify', performed_at: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(), performed_by_user_id: 'admin', metadata: { class_a: 4, class_b: 2, class_c: 2 }, return_type: null, period: null, tra_reference: null },
  { id: '4', action_type: 'file_attempt', return_type: 'paye', period: '2025-07', performed_at: new Date(Date.now() - 86400000 * 2 + 180000).toISOString(), performed_by_user_id: 'admin', metadata: {}, tra_reference: null },
  { id: '5', action_type: 'file_success', return_type: 'paye', period: '2025-07', tra_reference: 'TZ-2025-78421', performed_at: new Date(Date.now() - 86400000 * 2 + 185000).toISOString(), performed_by_user_id: 'admin', metadata: { amount: 340000 } },
  { id: '6', action_type: 'overdue_blocked', return_type: 'sdl', period: '2025-06', performed_at: new Date(Date.now() - 86400000 * 2 + 190000).toISOString(), performed_by_user_id: 'admin', metadata: { reason: 'past due date' }, tra_reference: null },
  { id: '7', action_type: 'file_success', return_type: 'sdl', period: '2025-07', tra_reference: 'TZ-2025-78422', performed_at: new Date(Date.now() - 86400000 * 2 + 195000).toISOString(), performed_by_user_id: 'admin', metadata: { amount: 84000 } },
  { id: '8', action_type: 'logout', performed_at: new Date(Date.now() - 86400000 * 2 + 200000).toISOString(), performed_by_user_id: 'admin', metadata: {}, return_type: null, period: null, tra_reference: null },
];

const ACTION_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  login: { label: 'Login', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <LogIn className="w-3 h-3" /> },
  logout: { label: 'Logout', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <LogOut className="w-3 h-3" /> },
  scan: { label: 'Scan', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <ScanLine className="w-3 h-3" /> },
  classify: { label: 'Classify', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <List className="w-3 h-3" /> },
  file_attempt: { label: 'File Attempt', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Send className="w-3 h-3" /> },
  file_success: { label: 'Filed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  file_failure: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
  overdue_blocked: { label: 'Overdue Blocked', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="w-3 h-3" /> },
};

function ActionBadge({ actionType }: { actionType: string }) {
  const conf = ACTION_BADGE[actionType] ?? { label: actionType, className: 'bg-slate-100 text-slate-600', icon: null };
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', conf.className)}>
      {conf.icon}{conf.label}
    </span>
  );
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function MetadataCell({ metadata }: { metadata: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(metadata ?? {});
  if (keys.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  const summary = keys.map(k => `${k}: ${JSON.stringify(metadata[k])}`).join(', ');
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? 'Hide' : 'Details'}
      </button>
      {open && (
        <pre className="mt-1 text-xs bg-muted rounded p-2 font-mono whitespace-pre-wrap max-w-xs">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
      {!open && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{summary}</span>
      )}
    </div>
  );
}

export default function FilingAuditLog() {
  const { isDemo } = useAuth();
  const { data: rawData, isLoading } = useTenantQuery('tra_filing_audit_log' as any, 'performed_at');

  const allEntries: AuditEntry[] = isDemo ? DEMO_DATA : (rawData as AuditEntry[] ?? []);

  // Filters
  const [filterAction, setFilterAction] = useState('all');
  const [filterReturnType, setFilterReturnType] = useState('all');

  const actionTypes = ['all', ...Array.from(new Set(allEntries.map(e => e.action_type)))];
  const returnTypes = ['all', ...Array.from(new Set(allEntries.map(e => e.return_type).filter(Boolean) as string[]))];

  const filtered = allEntries.filter(e => {
    if (filterAction !== 'all' && e.action_type !== filterAction) return false;
    if (filterReturnType !== 'all' && e.return_type !== filterReturnType) return false;
    return true;
  });

  const totalEntries = allEntries.length;
  const successCount = allEntries.filter(e => e.action_type === 'file_success').length;
  const blockedCount = allEntries.filter(e => e.action_type === 'overdue_blocked').length;
  const lastActivity = allEntries.length > 0
    ? new Date(Math.max(...allEntries.map(e => new Date(e.performed_at).getTime()))).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <AppLayout title="Filing Audit Log" subtitle="Immutable TRA filing audit trail">
      <div className="max-w-7xl space-y-6">
        <PageHeader
          title="Filing Audit Log"
          subtitle="Immutable record of all TRA filing activity"
          icon={ShieldCheck}
          breadcrumb={[{ label: 'Compliance' }, { label: 'Filing Audit Log' }]}
          stats={[
            { label: 'Total Entries', value: totalEntries },
            { label: 'Successful Filings', value: successCount, color: 'text-green-600' },
            { label: 'Overdue Blocked', value: blockedCount, color: 'text-red-600' },
          ]}
        />

        {/* Immutability banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">This log is immutable.</span> All entries are permanent and cannot be modified or deleted. Last activity: {lastActivity}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map(a => (
                <SelectItem key={a} value={a}>{a === 'all' ? 'All Actions' : (ACTION_BADGE[a]?.label ?? a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterReturnType} onValueChange={setFilterReturnType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Return type" />
            </SelectTrigger>
            <SelectContent>
              {returnTypes.map(r => (
                <SelectItem key={r} value={r}>{r === 'all' ? 'All Return Types' : r.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterAction !== 'all' || filterReturnType !== 'all') && (
            <Button variant="outline" size="sm" onClick={() => { setFilterAction('all'); setFilterReturnType('all'); }}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Audit Entries
              {filtered.length !== totalEntries && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filtered.length} of {totalEntries})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Return Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>TRA Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                        {isLoading && !isDemo ? 'Loading...' : 'No audit entries found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {formatDatetime(entry.performed_at)}
                        </TableCell>
                        <TableCell>
                          <ActionBadge actionType={entry.action_type} />
                        </TableCell>
                        <TableCell className="text-sm uppercase font-medium">
                          {entry.return_type ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {entry.period ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {entry.tra_reference ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.performed_by_user_id}
                        </TableCell>
                        <TableCell>
                          <MetadataCell metadata={entry.metadata ?? {}} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
