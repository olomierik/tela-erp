import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { today, formatCurrency } from '@/lib/mock';
import { nextJEReference, type Account, type JEStatus } from '@/lib/finance-data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Save,
  SendHorizonal,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormLine {
  id: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
  department: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const JE_STATUS_VARIANT: Record<JEStatus, 'warning' | 'success' | 'outline'> = {
  draft:     'warning',
  posted:    'success',
  cancelled: 'outline',
};

const JE_STATUS_LABEL: Record<JEStatus, string> = {
  draft:     'Draft',
  posted:    'Posted',
  cancelled: 'Cancelled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let lineCounter = 0;
function emptyLine(): FormLine {
  return { id: `line-${++lineCounter}`, accountId: '', description: '', debit: '', credit: '', department: '' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalEntryForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const isNew = !id || id === 'new';

  // ── Data from Supabase ────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingEntry, setLoadingEntry] = useState(!isNew);
  const [entryStatus, setEntryStatus] = useState<JEStatus>('draft');
  const [saving, setSaving] = useState(false);

  const [date, setDate]               = useState(today());
  const [reference, setReference]     = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines]             = useState<FormLine[]>([emptyLine(), emptyLine()]);

  // Load accounts
  useEffect(() => {
    if (!user) return;
    supabase
      .from('myerp_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_header', false)
      .order('code')
      .then(({ data }) => setAccounts((data ?? []) as Account[]));
  }, [user]);

  // Load next reference for new entry
  useEffect(() => {
    if (!isNew || !user) return;
    supabase
      .from('myerp_journal_entries')
      .select('reference')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setReference(nextJEReference((data ?? []) as { reference: string }[]));
      });
  }, [isNew, user]);

  // Load existing entry
  useEffect(() => {
    if (isNew || !id || !user) return;
    async function loadEntry() {
      setLoadingEntry(true);
      const { data } = await supabase
        .from('myerp_journal_entries')
        .select('*, lines:myerp_journal_lines(*)')
        .eq('id', id)
        .single();
      if (data) {
        setDate(data.date as string);
        setReference(data.reference as string);
        setDescription(data.description as string);
        setEntryStatus(data.status as JEStatus);
        const dbLines = (data.lines as { id: string; account_id: string; description: string; debit: number; credit: number; department: string }[]) ?? [];
        setLines(dbLines.length > 0
          ? dbLines.map(l => ({
              id: l.id,
              accountId: l.account_id,
              description: l.description,
              debit: l.debit > 0 ? String(l.debit) : '',
              credit: l.credit > 0 ? String(l.credit) : '',
              department: l.department,
            }))
          : [emptyLine(), emptyLine()]);
      }
      setLoadingEntry(false);
    }
    loadEntry();
  }, [isNew, id, user]);

  const isPosted = !isNew && entryStatus === 'posted';

  // ── Computed ─────────────────────────────────────────────────────────────
  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const diff        = Math.abs(totalDebit - totalCredit);
  const isBalanced  = diff < 0.001 && totalDebit > 0;

  // ── Line management ──────────────────────────────────────────────────────
  function addLine() {
    setLines(prev => [...prev, emptyLine()]);
  }

  function removeLine(lineId: string) {
    if (lines.length > 1) {
      setLines(prev => prev.filter(l => l.id !== lineId));
    }
  }

  function updateLine(lineId: string, field: keyof FormLine, value: string) {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, [field]: value } : l));
  }

  // ── Save handlers ────────────────────────────────────────────────────────
  async function handleSave(status: 'draft' | 'posted') {
    if (!date || !reference.trim()) { toast.error('Date and reference are required.'); return; }
    if (lines.every(l => !l.accountId)) { toast.error('At least one line with an account is required.'); return; }
    if (status === 'posted' && !isBalanced) { toast.error('Entry must be balanced before posting.'); return; }
    if (!user) return;

    setSaving(true);
    try {
      const filledLines = lines.filter(l => l.accountId);
      const linePayloads = filledLines.map(l => {
        const acct = accounts.find(a => a.id === l.accountId);
        return {
          account_id:   l.accountId,
          account_code: acct?.code ?? '',
          account_name: acct?.name ?? '',
          description:  l.description,
          debit:        parseFloat(l.debit) || 0,
          credit:       parseFloat(l.credit) || 0,
          department:   l.department,
        };
      });

      if (isNew) {
        const { data: entry, error: entryErr } = await supabase
          .from('myerp_journal_entries')
          .insert({ user_id: user.id, reference, date, description, status })
          .select()
          .single();
        if (entryErr) throw entryErr;
        const { error: linesErr } = await supabase
          .from('myerp_journal_lines')
          .insert(linePayloads.map(l => ({ ...l, entry_id: (entry as { id: string }).id })));
        if (linesErr) throw linesErr;
      } else {
        const { error: entryErr } = await supabase
          .from('myerp_journal_entries')
          .update({ reference, date, description, status })
          .eq('id', id);
        if (entryErr) throw entryErr;
        await supabase.from('myerp_journal_lines').delete().eq('entry_id', id);
        const { error: linesErr } = await supabase
          .from('myerp_journal_lines')
          .insert(linePayloads.map(l => ({ ...l, entry_id: id })));
        if (linesErr) throw linesErr;
      }

      toast.success(status === 'posted' ? `Entry ${reference} posted.` : `Entry ${reference} saved as draft.`);
      navigate('/finance/journal-entries');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  // ── Breadcrumbs ──────────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: 'Finance' },
    { label: 'Journal Entries', href: '/finance/journal-entries' },
    { label: isNew ? 'New Entry' : reference },
  ];

  return (
    <AppLayout title={isNew ? 'New Journal Entry' : reference}>
      <PageHeader
        title={isNew ? 'New Journal Entry' : reference}
        breadcrumbs={breadcrumbs}
      />

      {/* ── Posted banner ── */}
      {isPosted && (
        <div className="flex items-center gap-2.5 px-4 py-3 mb-5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-medium">
          <Lock className="w-4 h-4 shrink-0" />
          This entry has been posted and cannot be edited.
        </div>
      )}

      {/* ── Header card ── */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Entry Details</h2>
            {!isNew && (
              <Badge variant={JE_STATUS_VARIANT[entryStatus]}>
                {JE_STATUS_LABEL[entryStatus]}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="je-date">Date *</Label>
              <Input
                id="je-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={isPosted}
              />
            </div>

            {/* Reference */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="je-reference">Reference #</Label>
              <Input
                id="je-reference"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="JE-2026-001"
                disabled={isPosted}
                className="font-mono"
              />
            </div>

            {/* Description — spans remaining column on sm+ */}
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <Label htmlFor="je-description">Description</Label>
              <Input
                id="je-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of this entry…"
                disabled={isPosted}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Journal lines card ── */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              {/* Table header */}
              <thead>
                <tr className="border-b border-border bg-muted/30 sticky top-0">
                  <th className="w-10 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[200px]">
                    Account
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[160px]">
                    Description
                  </th>
                  <th className="w-32 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Debit
                  </th>
                  <th className="w-32 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Credit
                  </th>
                  <th className="w-28 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Department
                  </th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>

              <tbody>
                {lines.map((line, index) => {
                  const selectedAccount = accounts.find(a => a.id === line.accountId);
                  return (
                    <tr
                      key={line.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* Row number */}
                      <td className="px-3 py-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                      </td>

                      {/* Account select */}
                      <td className="px-3 py-1.5">
                        <Select
                          value={line.accountId}
                          onChange={e => updateLine(line.id, 'accountId', e.target.value)}
                          disabled={isPosted}
                          className="h-9 text-xs w-full"
                        >
                          <option value="">— Select account —</option>
                          {accounts.map(acct => (
                            <option key={acct.id} value={acct.id}>
                              {acct.code} — {acct.name}
                            </option>
                          ))}
                        </Select>
                        {selectedAccount && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground pl-0.5">
                            {selectedAccount.code} — {selectedAccount.name}
                          </p>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-3 py-1.5">
                        <Input
                          value={line.description}
                          onChange={e => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Line description…"
                          disabled={isPosted}
                          className="h-9 text-xs"
                        />
                      </td>

                      {/* Debit */}
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          value={line.debit}
                          onChange={e => {
                            updateLine(line.id, 'debit', e.target.value);
                            if (e.target.value) updateLine(line.id, 'credit', '');
                          }}
                          placeholder="0.00"
                          disabled={isPosted}
                          min="0"
                          step="0.01"
                          className="h-9 text-xs text-right tabular-nums"
                        />
                      </td>

                      {/* Credit */}
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          value={line.credit}
                          onChange={e => {
                            updateLine(line.id, 'credit', e.target.value);
                            if (e.target.value) updateLine(line.id, 'debit', '');
                          }}
                          placeholder="0.00"
                          disabled={isPosted}
                          min="0"
                          step="0.01"
                          className="h-9 text-xs text-right tabular-nums"
                        />
                      </td>

                      {/* Department */}
                      <td className="px-3 py-1.5">
                        <Input
                          value={line.department}
                          onChange={e => updateLine(line.id, 'department', e.target.value)}
                          placeholder="Optional"
                          disabled={isPosted}
                          className="h-9 text-xs"
                        />
                      </td>

                      {/* Delete row */}
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          disabled={isPosted || lines.length <= 1}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add line button */}
          {!isPosted && (
            <div className="px-4 py-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-8 text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line
              </Button>
            </div>
          )}

          {/* ── Totals footer bar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-t border-border bg-muted/20">
            {/* Totals */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Total Debits
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatCurrency(totalDebit)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Total Credits
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatCurrency(totalCredit)}
                </span>
              </div>
              {!isBalanced && totalDebit > 0 && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Difference
                    </span>
                    <span className="tabular-nums font-semibold text-destructive">
                      {formatCurrency(diff)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Balance indicator */}
            <div className="shrink-0">
              {totalDebit > 0 && isBalanced ? (
                <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Entry is balanced
                </div>
              ) : totalDebit > 0 ? (
                <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  Difference: {formatCurrency(diff)}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Enter amounts to check balance
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/finance/journal-entries')}
          className="gap-1.5"
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {/* Save as Draft */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave('draft')}
            disabled={isPosted || saving}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </Button>

          {/* Post Entry */}
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave('posted')}
            disabled={!isBalanced || isPosted || saving}
            className="gap-1.5"
          >
            <SendHorizonal className="w-4 h-4" />
            {saving ? 'Posting…' : 'Post Entry'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
