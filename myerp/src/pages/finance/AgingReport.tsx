import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string;
  customer: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
}

interface BillRow {
  id: string;
  vendor: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
}

interface AgingBuckets {
  name: string;       // customer or vendor name
  current: number;    // due in future or today
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90plus: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Returns how many full days `dueDateStr` is past todayIso (0 = current/future). */
function calcDaysOverdue(dueDateStr: string, todayIso: string): number {
  const due   = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayIso   + 'T00:00:00');
  const diffMs   = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function assignToBuckets(
  balance: number,
  overdueDays: number,
): Omit<AgingBuckets, 'name' | 'total'> {
  if (overdueDays <= 0)  return { current: balance, days1_30: 0,       days31_60: 0,       days61_90: 0,       days90plus: 0       };
  if (overdueDays <= 30) return { current: 0,       days1_30: balance, days31_60: 0,       days61_90: 0,       days90plus: 0       };
  if (overdueDays <= 60) return { current: 0,       days1_30: 0,       days31_60: balance, days61_90: 0,       days90plus: 0       };
  if (overdueDays <= 90) return { current: 0,       days1_30: 0,       days31_60: 0,       days61_90: balance, days90plus: 0       };
  return                        { current: 0,       days1_30: 0,       days31_60: 0,       days61_90: 0,       days90plus: balance };
}

function groupIntoAgingRows(
  items: Array<{ name: string; dueDate: string; balance: number }>,
  todayIso: string,
): AgingBuckets[] {
  const map = new Map<string, AgingBuckets>();

  for (const item of items) {
    const balance = Math.max(0, item.balance);
    if (balance <= 0.001) continue;

    const od      = calcDaysOverdue(item.dueDate, todayIso);
    const buckets = assignToBuckets(balance, od);
    const existing = map.get(item.name);

    if (existing) {
      existing.current    += buckets.current;
      existing.days1_30   += buckets.days1_30;
      existing.days31_60  += buckets.days31_60;
      existing.days61_90  += buckets.days61_90;
      existing.days90plus += buckets.days90plus;
      existing.total      += balance;
    } else {
      map.set(item.name, {
        name:       item.name,
        current:    buckets.current,
        days1_30:   buckets.days1_30,
        days31_60:  buckets.days31_60,
        days61_90:  buckets.days61_90,
        days90plus: buckets.days90plus,
        total:      balance,
      });
    }
  }

  // Sort by total outstanding descending
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function sumBuckets(rows: AgingBuckets[]): AgingBuckets {
  return rows.reduce(
    (acc, r) => ({
      name:       'Total',
      current:    acc.current    + r.current,
      days1_30:   acc.days1_30   + r.days1_30,
      days31_60:  acc.days31_60  + r.days31_60,
      days61_90:  acc.days61_90  + r.days61_90,
      days90plus: acc.days90plus + r.days90plus,
      total:      acc.total      + r.total,
    }),
    { name: 'Total', current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0, total: 0 },
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <FileText className="w-10 h-10 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

interface AgingTableProps {
  rows: AgingBuckets[];
  loading: boolean;
  emptyMessage: string;
}

function AgingTable({ rows, loading, emptyMessage }: AgingTableProps) {
  if (loading) return <Spinner />;
  if (rows.length === 0) return <EmptyState label={emptyMessage} />;

  const totals = sumBuckets(rows);

  function fmtCell(value: number, colorClass: string) {
    if (value <= 0) return <span className="text-muted-foreground/40">—</span>;
    return <span className={colorClass}>{formatCurrency(value)}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[160px]">Name</TableHead>
            <TableHead className="text-right whitespace-nowrap">Current</TableHead>
            <TableHead className="text-right whitespace-nowrap">1–30 Days</TableHead>
            <TableHead className="text-right whitespace-nowrap">31–60 Days</TableHead>
            <TableHead className="text-right whitespace-nowrap">61–90 Days</TableHead>
            <TableHead className="text-right whitespace-nowrap">90+ Days</TableHead>
            <TableHead className="text-right whitespace-nowrap">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCell(row.current, 'text-success')}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCell(row.days1_30, 'text-warning')}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCell(row.days31_60, 'text-destructive')}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCell(row.days61_90, 'text-destructive')}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCell(row.days90plus, 'text-destructive')}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatCurrency(row.total)}
              </TableCell>
            </TableRow>
          ))}

          {/* Totals row */}
          <TableRow className="border-t-2 border-border bg-muted/30">
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="text-right tabular-nums font-bold text-success">
              {formatCurrency(totals.current)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-warning">
              {formatCurrency(totals.days1_30)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-destructive">
              {formatCurrency(totals.days31_60)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-destructive">
              {formatCurrency(totals.days61_90)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-destructive">
              {formatCurrency(totals.days90plus)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold">
              {formatCurrency(totals.total)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgingReport() {
  const { user } = useAuth();

  const [arRows,     setArRows]     = useState<AgingBuckets[]>([]);
  const [apRows,     setApRows]     = useState<AgingBuckets[]>([]);
  const [loadingAR,  setLoadingAR]  = useState(true);
  const [loadingAP,  setLoadingAP]  = useState(true);

  // ── Fetch AR ────────────────────────────────────────────────────────────────

  const fetchAR = useCallback(async () => {
    if (!user) return;
    setLoadingAR(true);

    const { data, error } = await supabase
      .from('myerp_invoices')
      .select('id, customer, due_date, amount, paid_amount, status')
      .eq('user_id', user.id)
      .in('status', ['sent', 'partially_paid', 'overdue', 'draft']);

    if (error) {
      toast.error('Failed to load AR aging data.');
      setLoadingAR(false);
      return;
    }

    const today = todayStr();
    const items = ((data ?? []) as InvoiceRow[]).map(inv => ({
      name:    inv.customer,
      dueDate: inv.due_date,
      balance: (inv.amount ?? 0) - (inv.paid_amount ?? 0),
    }));

    setArRows(groupIntoAgingRows(items, today));
    setLoadingAR(false);
  }, [user]);

  // ── Fetch AP ────────────────────────────────────────────────────────────────

  const fetchAP = useCallback(async () => {
    if (!user) return;
    setLoadingAP(true);

    const { data, error } = await supabase
      .from('myerp_bills')
      .select('id, vendor, due_date, amount, paid_amount, status')
      .eq('user_id', user.id)
      .in('status', ['received', 'approved', 'partially_paid', 'overdue', 'draft']);

    if (error) {
      toast.error('Failed to load AP aging data.');
      setLoadingAP(false);
      return;
    }

    const today = todayStr();
    const items = ((data ?? []) as BillRow[]).map(bill => ({
      name:    bill.vendor,
      dueDate: bill.due_date,
      balance: (bill.amount ?? 0) - (bill.paid_amount ?? 0),
    }));

    setApRows(groupIntoAgingRows(items, today));
    setLoadingAP(false);
  }, [user]);

  useEffect(() => {
    fetchAR();
    fetchAP();
  }, [fetchAR, fetchAP]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Aging Report">
      <PageHeader
        title="Aging Report"
        subtitle="Accounts receivable and payable aging analysis"
      />

      {/* Legend */}
      <div className="flex items-center gap-5 mb-6 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-success" />
          Current (not yet due)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-warning" />
          1–30 days overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" />
          31+ days overdue
        </span>
      </div>

      {/* ── AR Aging ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Accounts Receivable (AR) Aging
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Outstanding balances owed to you by customers, grouped by overdue age.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <AgingTable
            rows={arRows}
            loading={loadingAR}
            emptyMessage="No outstanding invoices found."
          />
        </CardContent>
      </Card>

      {/* ── AP Aging ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Accounts Payable (AP) Aging
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Outstanding balances you owe to vendors, grouped by overdue age.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <AgingTable
            rows={apRows}
            loading={loadingAP}
            emptyMessage="No outstanding bills found."
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
