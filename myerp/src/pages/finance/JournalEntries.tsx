import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { ConfirmModal } from '@/components/erp/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/mock';
import { type JournalEntry, type JEStatus } from '@/lib/finance-data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BookOpen, FileText, CheckCircle2, TrendingUp } from 'lucide-react';

// ─── Status badge mapping ─────────────────────────────────────────────────────

const JE_STATUS_VARIANT: Record<JEStatus, 'warning' | 'success' | 'outline' | 'secondary'> = {
  draft:     'warning',
  posted:    'success',
  cancelled: 'outline',
};

function JEStatusBadge({ status }: { status: JEStatus }) {
  const labels: Record<JEStatus, string> = {
    draft:     'Draft',
    posted:    'Posted',
    cancelled: 'Cancelled',
  };
  return <Badge variant={JE_STATUS_VARIANT[status]}>{labels[status]}</Badge>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalEntries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('myerp_journal_entries')
        .select('*, lines:myerp_journal_lines(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) toast.error('Failed to load journal entries');
      else setEntries((data ?? []) as JournalEntry[]);
      setLoading(false);
    }
    load();
  }, [user]);

  // ── KPI values ──────────────────────────────────────────────────────────────
  const totalEntries   = entries.length;
  const postedEntries  = entries.filter(e => e.status === 'posted');
  const draftEntries   = entries.filter(e => e.status === 'draft');
  const totalPostedVal = postedEntries.reduce(
    (sum, e) => sum + ((e.lines as { debit: number }[]) ?? []).reduce((s, l) => s + l.debit, 0),
    0,
  );

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns: Column<JournalEntry>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium">{row.reference}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="block max-w-xs truncate" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      key: 'lines',
      header: 'Lines',
      render: (row) => (
        <span className="text-muted-foreground text-xs">{((row.lines as unknown[]) ?? []).length} lines</span>
      ),
    },
    {
      key: 'debitTotal',
      header: 'Debit Total',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium">
          {formatCurrency(((row.lines as { debit: number }[]) ?? []).reduce((s, l) => s + l.debit, 0))}
        </span>
      ),
    },
    {
      key: 'creditTotal',
      header: 'Credit Total',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium">
          {formatCurrency(((row.lines as { credit: number }[]) ?? []).reduce((s, l) => s + l.credit, 0))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <JEStatusBadge status={row.status as JEStatus} />,
    },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleView(row: JournalEntry) { navigate(`/finance/journal-entries/${row.id}`); }
  function handleEdit(row: JournalEntry) { if (row.status !== 'posted') navigate(`/finance/journal-entries/${row.id}`); }
  function handleDeleteRequest(row: JournalEntry) { if (row.status !== 'posted') setConfirmDelete(row.id as string); }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    await supabase.from('myerp_journal_lines').delete().eq('entry_id', confirmDelete);
    const { error } = await supabase.from('myerp_journal_entries').delete().eq('id', confirmDelete);
    if (error) { toast.error('Failed to delete entry'); return; }
    setEntries(prev => prev.filter(e => e.id !== confirmDelete));
    toast.success('Journal entry deleted.');
    setConfirmDelete(null);
  }

  const deleteTarget = confirmDelete ? entries.find(e => e.id === confirmDelete) : null;

  return (
    <AppLayout title="Journal Entries">
      <PageHeader
        title="Journal Entries"
        subtitle="Record and manage double-entry accounting transactions."
        primaryAction={{
          label: 'New Journal Entry',
          onClick: () => navigate('/finance/journal-entries/new'),
        }}
      />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totalEntries}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Posted
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {postedEntries.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {draftEntries.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Total Posted Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCurrency(totalPostedVal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── DataTable ── */}
      <DataTable<JournalEntry>
        title="Journal Entries"
        columns={columns}
        data={entries}
        idKey="id"
        searchPlaceholder="Search entries…"
        onView={handleView}
        onEdit={(row) => row.status !== 'posted' ? handleEdit(row) : undefined}
        onDelete={(row) => row.status !== 'posted' ? handleDeleteRequest(row) : undefined}
        emptyText="No journal entries found"
        emptySubtext="Create your first journal entry to get started."
        emptyIcon={BookOpen}
      />

      {/* ── Delete confirm modal ── */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Journal Entry"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.reference}? This action cannot be undone.`
            : 'Are you sure you want to delete this journal entry?'
        }
        confirmLabel="Delete"
        variant="destructive"
      />
    </AppLayout>
  );
}
