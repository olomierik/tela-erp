import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  Activity, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ExecutionLog {
  id: string;
  rule_id: string;
  tenant_id?: string;
  triggered_at: string;
  trigger_type: string;
  status: 'success' | 'failed' | 'skipped';
  output: Record<string, any>;
}

interface AutomationRule {
  id: string;
  name: string;
}

const DEMO_LOGS: ExecutionLog[] = [
  { id: '1', rule_id: 'r1', tenant_id: 't1', triggered_at: new Date(Date.now() - 3600000).toISOString(), trigger_type: 'invoice_overdue', status: 'success', output: { action: 'email_sent', recipient: 'finance@company.com', subject: 'Invoice #INV-2205 overdue' } },
  { id: '2', rule_id: 'r2', triggered_at: new Date(Date.now() - 7200000).toISOString(), trigger_type: 'payment_received', status: 'success', output: { action: 'journal_posted', amount: 450000, account: '1100' } },
  { id: '3', rule_id: 'r1', triggered_at: new Date(Date.now() - 86400000).toISOString(), trigger_type: 'invoice_overdue', status: 'failed', output: { error: 'SMTP timeout', action: 'email_sent' } },
  { id: '4', rule_id: 'r3', triggered_at: new Date(Date.now() - 86400000 * 2).toISOString(), trigger_type: 'stock_low', status: 'success', output: { action: 'task_created', task_id: 'task-123', assignee: 'procurement@company.com' } },
  { id: '5', rule_id: 'r4', triggered_at: new Date(Date.now() - 86400000 * 3).toISOString(), trigger_type: 'po_created', status: 'skipped', output: { reason: 'Condition not met: amount < 500000' } },
  { id: '6', rule_id: 'r2', triggered_at: new Date(Date.now() - 86400000 * 3 + 1800000).toISOString(), trigger_type: 'payment_received', status: 'success', output: { action: 'journal_posted', amount: 1200000, account: '1100' } },
];

const DEMO_RULES: AutomationRule[] = [
  { id: 'r1', name: 'Invoice Overdue Alert' },
  { id: 'r2', name: 'Auto-post Journal on Payment' },
  { id: 'r3', name: 'Low Stock Task' },
  { id: 'r4', name: 'PO Approval Gate' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  success: { label: 'Success', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  skipped: { label: 'Skipped', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status] ?? STATUS_CONFIG.skipped;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', conf.className)}>
      {conf.icon}{conf.label}
    </span>
  );
}

const TRIGGER_LABELS: Record<string, string> = {
  invoice_created: 'Invoice Created',
  invoice_overdue: 'Invoice Overdue',
  payment_received: 'Payment Received',
  stock_low: 'Stock Below Threshold',
  stock_out: 'Item Out of Stock',
  sales_order_created: 'Sales Order Created',
  deal_won: 'Deal Won',
  deal_stage_changed: 'Deal Stage Changed',
  expense_submitted: 'Expense Submitted',
  new_customer: 'New Customer Added',
  po_created: 'Purchase Order Created',
};

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function OutputCell({ output }: { output: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(output ?? {});
  if (keys.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  const summaryParts: string[] = [];
  if (output.action) summaryParts.push(output.action.replace(/_/g, ' '));
  if (output.error) summaryParts.push(`Error: ${output.error}`);
  if (output.reason) summaryParts.push(output.reason);
  if (output.amount) summaryParts.push(`TZS ${Number(output.amount).toLocaleString()}`);
  const summary = summaryParts.join(' — ') || keys.slice(0, 2).map(k => `${k}: ${output[k]}`).join(', ');

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? 'Hide' : 'View Details'}
      </button>
      {!open && <span className="text-xs text-muted-foreground">{summary}</span>}
      {open && (
        <pre className="mt-1 text-xs bg-muted rounded p-2 font-mono whitespace-pre-wrap max-w-sm">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AutomationExecutionLog() {
  const { isDemo } = useAuth();
  const { data: rawLogs, isLoading: logsLoading } = useTenantQuery('automation_execution_log' as any, 'triggered_at');
  const { data: rawRules } = useTenantQuery('automation_rules' as any);

  const logs: ExecutionLog[] = isDemo ? DEMO_LOGS : (rawLogs as ExecutionLog[] ?? []);
  const rules: AutomationRule[] = isDemo ? DEMO_RULES : (rawRules as AutomationRule[] ?? []);

  const ruleMap = new Map(rules.map(r => [r.id, r.name]));

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrigger, setFilterTrigger] = useState('all');

  const triggerTypes = ['all', ...Array.from(new Set(logs.map(l => l.trigger_type)))];

  const filtered = logs.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterTrigger !== 'all' && l.trigger_type !== filterTrigger) return false;
    return true;
  });

  const totalExecutions = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0;
  const lastExecution = logs.length > 0
    ? new Date(Math.max(...logs.map(l => new Date(l.triggered_at).getTime()))).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <AppLayout title="Automation Execution Log" subtitle="History of automation rule executions">
      <div className="max-w-7xl space-y-6">
        <PageHeader
          title="Automation Execution Log"
          subtitle="History of all automation rule executions"
          icon={Activity}
          breadcrumb={[{ label: 'Automation' }, { label: 'Execution Log' }]}
          stats={[
            { label: 'Total Executions', value: totalExecutions },
            { label: 'Success Rate', value: `${successRate}%`, color: 'text-green-600' },
            { label: 'Failed', value: failedCount, color: 'text-red-600' },
            { label: 'Last Run', value: lastExecution },
          ]}
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTrigger} onValueChange={setFilterTrigger}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Trigger type" />
            </SelectTrigger>
            <SelectContent>
              {triggerTypes.map(t => (
                <SelectItem key={t} value={t}>
                  {t === 'all' ? 'All Triggers' : (TRIGGER_LABELS[t] ?? t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterTrigger !== 'all') && (
            <Button variant="outline" size="sm" onClick={() => { setFilterStatus('all'); setFilterTrigger('all'); }}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Executions
              {filtered.length !== totalExecutions && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filtered.length} of {totalExecutions})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Triggered At</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Output</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                        {logsLoading && !isDemo ? 'Loading...' : 'No executions found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {formatDatetime(log.triggered_at)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {ruleMap.get(log.rule_id) ?? <span className="text-muted-foreground font-mono text-xs">{log.rule_id}</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {TRIGGER_LABELS[log.trigger_type] ?? log.trigger_type}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <OutputCell output={log.output ?? {}} />
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
