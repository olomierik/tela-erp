import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { useTable } from '@/lib/useTable';
import { formatCurrency } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Pencil, Trash2, List, LayoutList, BookOpen, CheckCircle2, Loader2, Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Budget extends Record<string, unknown> {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  department: string;
  status: 'draft' | 'active' | 'closed';
  notes: string;
}

interface BudgetLine {
  id: string;
  budget_id: string;
  category: string;
  planned_amount: number;
  actual_amount: number;
  notes: string;
}

type BudgetStatus = Budget['status'];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<BudgetStatus, 'secondary' | 'success' | 'outline'> = {
  draft: 'secondary',
  active: 'success',
  closed: 'outline',
};

const LINE_CATEGORIES = [
  'Revenue', 'Salaries', 'Marketing', 'Operations', 'IT', 'Travel', 'Rent', 'Other',
] as const;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatPeriod(start: string, end: string): string {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  return `${MONTH_NAMES[s.getUTCMonth()]} ${s.getUTCFullYear()} – ${MONTH_NAMES[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface BudgetForm {
  name: string;
  department: string;
  period_start: string;
  period_end: string;
  status: BudgetStatus;
  notes: string;
}

const EMPTY_BUDGET_FORM: BudgetForm = {
  name: '',
  department: '',
  period_start: '',
  period_end: '',
  status: 'draft',
  notes: '',
};

interface LineForm {
  category: string;
  planned_amount: string;
  actual_amount: string;
  notes: string;
}

const EMPTY_LINE_FORM: LineForm = {
  category: 'Revenue',
  planned_amount: '',
  actual_amount: '',
  notes: '',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Budgets() {
  const { user } = useAuth();

  const { rows: budgets, loading, insert, update, remove } = useTable<Budget>('myerp_budgets');

  // Search / filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Budget sheet (create / edit)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>(EMPTY_BUDGET_FORM);
  const [saving, setSaving] = useState(false);

  // Lines sheet
  const [linesSheetOpen, setLinesSheetOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [lineCounts, setLineCounts] = useState<Record<string, number>>({});

  // Add line inline form
  const [lineForm, setLineForm] = useState<LineForm>(EMPTY_LINE_FORM);
  const [addingLine, setAddingLine] = useState(false);

  // KPI aggregate totals
  const [totalPlanned, setTotalPlanned] = useState(0);
  const [totalActual, setTotalActual] = useState(0);

  const loadTotals = useCallback(async () => {
    if (!user || budgets.length === 0) {
      setTotalPlanned(0);
      setTotalActual(0);
      return;
    }
    const budgetIds = budgets.map(b => b.id);
    const { data } = await supabase
      .from('myerp_budget_lines')
      .select('planned_amount, actual_amount')
      .in('budget_id', budgetIds);
    if (data) {
      setTotalPlanned(data.reduce((s, l) => s + (Number(l.planned_amount) || 0), 0));
      setTotalActual(data.reduce((s, l) => s + (Number(l.actual_amount) || 0), 0));
    }
  }, [user, budgets]);

  useEffect(() => { loadTotals(); }, [loadTotals]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalBudgets = budgets.length;
  const activeCount = budgets.filter(b => b.status === 'active').length;

  // ── Filtered rows ─────────────────────────────────────────────────────────

  const filtered = budgets.filter(b => {
    const q = search.toLowerCase();
    const matchSearch =
      b.name.toLowerCase().includes(q) ||
      b.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Budget CRUD ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditingBudget(null);
    setBudgetForm(EMPTY_BUDGET_FORM);
    setSheetOpen(true);
  }

  function openEdit(b: Budget) {
    setEditingBudget(b);
    setBudgetForm({
      name: b.name,
      department: b.department,
      period_start: b.period_start,
      period_end: b.period_end,
      status: b.status,
      notes: b.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleSaveBudget() {
    if (!budgetForm.name.trim()) { toast.error('Budget name is required.'); return; }
    if (!budgetForm.period_start) { toast.error('Period start is required.'); return; }
    if (!budgetForm.period_end) { toast.error('Period end is required.'); return; }
    if (budgetForm.period_end < budgetForm.period_start) {
      toast.error('Period end must be after period start.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: budgetForm.name.trim(),
        department: budgetForm.department.trim(),
        period_start: budgetForm.period_start,
        period_end: budgetForm.period_end,
        status: budgetForm.status,
        notes: budgetForm.notes.trim(),
      };
      if (editingBudget) {
        await update(editingBudget.id, payload);
        toast.success('Budget updated.');
      } else {
        await insert(payload);
        toast.success('Budget created.');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBudget(b: Budget) {
    if (b.status !== 'draft') {
      toast.error('Only draft budgets can be deleted.');
      return;
    }
    try {
      await remove(b.id);
      toast.success('Budget deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete budget.');
    }
  }

  // ── Lines ─────────────────────────────────────────────────────────────────

  async function openLines(b: Budget) {
    setSelectedBudget(b);
    setLineForm(EMPTY_LINE_FORM);
    setLinesSheetOpen(true);
    setLinesLoading(true);
    const { data, error } = await supabase
      .from('myerp_budget_lines')
      .select('*')
      .eq('budget_id', b.id)
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Failed to load budget lines.');
    } else {
      const loaded = (data ?? []) as BudgetLine[];
      setLines(loaded);
      setLineCounts(prev => ({ ...prev, [b.id]: loaded.length }));
    }
    setLinesLoading(false);
  }

  async function handleAddLine() {
    if (!selectedBudget || !user) return;
    const planned = parseFloat(lineForm.planned_amount);
    if (isNaN(planned) || planned < 0) { toast.error('Enter a valid planned amount.'); return; }
    const actual = parseFloat(lineForm.actual_amount) || 0;

    setAddingLine(true);
    const { data, error } = await supabase
      .from('myerp_budget_lines')
      .insert({
        budget_id: selectedBudget.id,
        category: lineForm.category,
        planned_amount: planned,
        actual_amount: actual,
        notes: lineForm.notes.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add line.');
    } else {
      const newLine = data as BudgetLine;
      setLines(prev => [...prev, newLine]);
      setLineCounts(prev => ({ ...prev, [selectedBudget.id]: (prev[selectedBudget.id] ?? 0) + 1 }));
      setLineForm(EMPTY_LINE_FORM);
      toast.success('Line added.');
      loadTotals();
    }
    setAddingLine(false);
  }

  const setLF = (key: keyof LineForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setLineForm(f => ({ ...f, [key]: e.target.value }));

  const setBF = (key: keyof BudgetForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setBudgetForm(f => ({ ...f, [key]: e.target.value }));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Budgets">
      <PageHeader
        title="Budgets"
        subtitle="Plan and track departmental budgets by period."
        action={{ label: 'New Budget', onClick: openCreate }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Total Budgets
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums">{totalBudgets}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-success">{activeCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <LayoutList className="w-3.5 h-3.5" /> Total Planned
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalPlanned)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <List className="w-3.5 h-3.5" /> Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalActual)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        <Input
          placeholder="Search name or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="sm:max-w-[180px]"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </Select>
        {(search || statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right"># Lines</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        No budgets match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{b.department || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatPeriod(b.period_start, b.period_end)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[b.status]} className="capitalize">
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {lineCounts[b.id] ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => openEdit(b)}
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => openLines(b)}
                            >
                              <List className="w-3 h-3" />
                              View Lines
                            </Button>
                            {b.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteBudget(b)}
                                title="Delete draft budget"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Budget create / edit sheet ───────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingBudget ? 'Edit Budget' : 'New Budget'}</SheetTitle>
          </SheetHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="b-name">Name *</Label>
              <Input
                id="b-name"
                placeholder="e.g. Q1 2026 Marketing"
                value={budgetForm.name}
                onChange={setBF('name')}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="b-dept">Department</Label>
              <Input
                id="b-dept"
                placeholder="e.g. Marketing"
                value={budgetForm.department}
                onChange={setBF('department')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="b-start">Period Start *</Label>
                <Input
                  id="b-start"
                  type="date"
                  value={budgetForm.period_start}
                  onChange={setBF('period_start')}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="b-end">Period End *</Label>
                <Input
                  id="b-end"
                  type="date"
                  value={budgetForm.period_end}
                  onChange={setBF('period_end')}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="b-status">Status</Label>
              <Select
                id="b-status"
                value={budgetForm.status}
                onChange={setBF('status')}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="b-notes">Notes</Label>
              <Textarea
                id="b-notes"
                rows={3}
                placeholder="Optional notes…"
                value={budgetForm.notes}
                onChange={setBF('notes')}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveBudget} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingBudget ? 'Save Changes' : 'Create Budget'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Lines sheet ─────────────────────────────────────────────────── */}
      <Sheet open={linesSheetOpen} onOpenChange={setLinesSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>
              Budget Lines{selectedBudget ? ` — ${selectedBudget.name}` : ''}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
            {/* Lines table */}
            {linesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No lines yet. Add one below.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lines.map(l => {
                        const variance = Number(l.planned_amount) - Number(l.actual_amount);
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.category}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(Number(l.planned_amount))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(Number(l.actual_amount))}
                            </TableCell>
                            <TableCell
                              className={`text-right tabular-nums font-medium ${
                                variance >= 0 ? 'text-success' : 'text-destructive'
                              }`}
                            >
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[180px] truncate">
                              {l.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add line form */}
            <div className="border rounded-md p-4 bg-muted/30">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="l-cat">Category *</Label>
                  <Select
                    id="l-cat"
                    value={lineForm.category}
                    onChange={setLF('category')}
                  >
                    {LINE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="l-planned">Planned Amount *</Label>
                  <Input
                    id="l-planned"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={lineForm.planned_amount}
                    onChange={setLF('planned_amount')}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="l-actual">Actual Amount</Label>
                  <Input
                    id="l-actual"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={lineForm.actual_amount}
                    onChange={setLF('actual_amount')}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="l-notes">Notes</Label>
                  <Input
                    id="l-notes"
                    placeholder="Optional…"
                    value={lineForm.notes}
                    onChange={setLF('notes')}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddLine}
                  disabled={addingLine}
                >
                  {addingLine
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    : <Plus className="w-3.5 h-3.5 mr-1" />}
                  Add Line
                </Button>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setLinesSheetOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
