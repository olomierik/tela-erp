import { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  PieChart, Plus, Trash2, Edit, Save, X, PlusCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import EmptyState from '@/components/erp/EmptyState';

const BUDGET_CATEGORIES = [
  'Salaries & Wages', 'Rent & Facilities', 'Marketing', 'Technology',
  'Travel & Entertainment', 'Office Supplies', 'Training', 'Equipment', 'Other',
];

export default function Budgets() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    fiscal_year: new Date().getFullYear().toString(),
    period: 'annual',
    department: '',
    lines: BUDGET_CATEGORIES.map(c => ({ category: c, budgeted_amount: '' })),
  });

  // Edit budget name dialog
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);
  const [editBudgetName, setEditBudgetName] = useState('');
  const [editBudgetDept, setEditBudgetDept] = useState('');

  // Edit line dialog
  const [editLineOpen, setEditLineOpen] = useState(false);
  const [editLine, setEditLine] = useState<{ id: string; category: string; budgeted_amount: string } | null>(null);

  // Add line dialog
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [addLineBudgetId, setAddLineBudgetId] = useState<string | null>(null);
  const [newLine, setNewLine] = useState({ category: '', budgeted_amount: '' });

  const { data: rawBudgets, isLoading, refetch: refetchBudgets } = useTenantQuery('budgets');
  const { data: rawLines, refetch: refetchLines } = useTenantQuery('budget_lines');
  const { data: transData } = useTenantQuery('transactions');
  const deleteBudget = useTenantDelete('budgets');
  const updateBudget = useTenantUpdate('budgets');
  useRealtimeSync('budgets');
  useRealtimeSync('budget_lines');

  const transactions: any[] = transData ?? [];
  const budgetLines: any[] = rawLines ?? [];

  const demoBudgets = [
    {
      id: '1', name: 'Q1 2026 Operating Budget', fiscal_year: 2026, period: 'quarterly', department: 'Operations',
      total_budget: 180000, status: 'active',
      lines: [
        { id: 'd1', category: 'Salaries & Wages', budgeted_amount: 95000, actual_amount: 92400 },
        { id: 'd2', category: 'Rent & Facilities', budgeted_amount: 28000, actual_amount: 28000 },
        { id: 'd3', category: 'Marketing', budgeted_amount: 25000, actual_amount: 31200 },
        { id: 'd4', category: 'Technology', budgeted_amount: 18000, actual_amount: 14800 },
        { id: 'd5', category: 'Travel & Entertainment', budgeted_amount: 14000, actual_amount: 9200 },
      ],
    },
    {
      id: '2', name: 'Annual Marketing Budget', fiscal_year: 2026, period: 'annual', department: 'Marketing',
      total_budget: 120000, status: 'active',
      lines: [
        { id: 'd6', category: 'Digital Ads', budgeted_amount: 60000, actual_amount: 42000 },
        { id: 'd7', category: 'Events', budgeted_amount: 30000, actual_amount: 18500 },
        { id: 'd8', category: 'Content Creation', budgeted_amount: 20000, actual_amount: 15200 },
        { id: 'd9', category: 'Tools & Software', budgeted_amount: 10000, actual_amount: 8400 },
      ],
    },
  ];

  // Merge budget_lines into budgets for live data
  const liveBudgets = (rawBudgets ?? []).map((b: any) => {
    const lines = budgetLines.filter((l: any) => l.budget_id === b.id);
    const enrichedLines = lines.map((l: any) => {
      const actual = transactions
        .filter((t: any) => t.category === l.category && t.type === 'expense')
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      return { ...l, actual_amount: actual || Number(l.actual_amount || 0) };
    });
    return { ...b, lines: enrichedLines };
  });

  const budgets: any[] = isDemo ? demoBudgets : liveBudgets;

  const totalBudgeted = budgets.reduce((s, b) => s + Number(b.total_budget), 0);
  const totalActual = budgets.reduce((s, b) => {
    return s + (b.lines ?? []).reduce((ls: number, l: any) => ls + Number(l.actual_amount ?? 0), 0);
  }, 0);
  const variance = totalBudgeted - totalActual;

  // ─── Create Budget ─────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Budget name is required'); return; }
    if (!tenant?.id) return;

    setCreating(true);
    try {
      const total = form.lines.reduce((s, l) => s + (Number(l.budgeted_amount) || 0), 0);

      const { data: budget, error: budgetErr } = await (supabase.from('budgets') as any)
        .insert({
          tenant_id: tenant.id,
          name: form.name,
          fiscal_year: Number(form.fiscal_year),
          period: form.period,
          department: form.department,
          total_budget: total,
          status: 'active',
        })
        .select()
        .single();

      if (budgetErr) throw budgetErr;

      const linesToInsert = form.lines
        .filter(l => Number(l.budgeted_amount) > 0)
        .map(l => ({
          tenant_id: tenant.id,
          budget_id: budget.id,
          category: l.category,
          budgeted_amount: Number(l.budgeted_amount),
          actual_amount: 0,
        }));

      if (linesToInsert.length > 0) {
        const { error: linesErr } = await (supabase.from('budget_lines') as any).insert(linesToInsert);
        if (linesErr) throw linesErr;
      }

      toast.success('Budget created with line items');
      setCreateOpen(false);
      setForm({
        name: '', fiscal_year: new Date().getFullYear().toString(),
        period: 'annual', department: '',
        lines: BUDGET_CATEGORIES.map(c => ({ category: c, budgeted_amount: '' })),
      });
      refetchBudgets();
      refetchLines();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create budget');
    } finally {
      setCreating(false);
    }
  }, [form, tenant, refetchBudgets, refetchLines]);

  // ─── Edit Budget Name/Department ───────────────────────────────────────────
  const openEditBudget = (budget: any) => {
    setEditBudgetId(budget.id);
    setEditBudgetName(budget.name);
    setEditBudgetDept(budget.department || '');
    setEditBudgetOpen(true);
  };

  const handleEditBudget = async () => {
    if (!editBudgetId || !editBudgetName.trim()) return;
    try {
      updateBudget.mutate({ id: editBudgetId, name: editBudgetName, department: editBudgetDept });
      toast.success('Budget updated');
      setEditBudgetOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update budget');
    }
  };

  // ─── Edit Budget Line ─────────────────────────────────────────────────────
  const openEditLine = (line: any) => {
    setEditLine({ id: line.id, category: line.category, budgeted_amount: String(line.budgeted_amount) });
    setEditLineOpen(true);
  };

  const handleEditLine = async () => {
    if (!editLine) return;
    try {
      const { error } = await (supabase.from('budget_lines') as any)
        .update({
          category: editLine.category,
          budgeted_amount: Number(editLine.budgeted_amount) || 0,
        })
        .eq('id', editLine.id);
      if (error) throw error;

      // Recalculate budget total
      const parentBudget = budgets.find(b => b.lines?.some((l: any) => l.id === editLine.id));
      if (parentBudget) {
        const newTotal = parentBudget.lines.reduce((s: number, l: any) => {
          if (l.id === editLine.id) return s + (Number(editLine.budgeted_amount) || 0);
          return s + Number(l.budgeted_amount || 0);
        }, 0);
        await (supabase.from('budgets') as any).update({ total_budget: newTotal }).eq('id', parentBudget.id);
      }

      toast.success('Budget line updated');
      setEditLineOpen(false);
      refetchLines();
      refetchBudgets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update line');
    }
  };

  // ─── Delete Budget Line ───────────────────────────────────────────────────
  const handleDeleteLine = async (lineId: string, budgetId: string) => {
    try {
      const { error } = await (supabase.from('budget_lines') as any).delete().eq('id', lineId);
      if (error) throw error;

      // Recalculate budget total
      const parentBudget = budgets.find(b => b.id === budgetId);
      if (parentBudget) {
        const newTotal = parentBudget.lines
          .filter((l: any) => l.id !== lineId)
          .reduce((s: number, l: any) => s + Number(l.budgeted_amount || 0), 0);
        await (supabase.from('budgets') as any).update({ total_budget: newTotal }).eq('id', parentBudget.id);
      }

      toast.success('Budget line deleted');
      refetchLines();
      refetchBudgets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete line');
    }
  };

  // ─── Add Budget Line ──────────────────────────────────────────────────────
  const openAddLine = (budgetId: string) => {
    setAddLineBudgetId(budgetId);
    setNewLine({ category: '', budgeted_amount: '' });
    setAddLineOpen(true);
  };

  const handleAddLine = async () => {
    if (!addLineBudgetId || !newLine.category.trim() || !tenant?.id) return;
    try {
      const { error } = await (supabase.from('budget_lines') as any).insert({
        tenant_id: tenant.id,
        budget_id: addLineBudgetId,
        category: newLine.category,
        budgeted_amount: Number(newLine.budgeted_amount) || 0,
        actual_amount: 0,
      });
      if (error) throw error;

      // Recalculate budget total
      const parentBudget = budgets.find(b => b.id === addLineBudgetId);
      if (parentBudget) {
        const newTotal = Number(parentBudget.total_budget || 0) + (Number(newLine.budgeted_amount) || 0);
        await (supabase.from('budgets') as any).update({ total_budget: newTotal }).eq('id', addLineBudgetId);
      }

      toast.success('Budget line added');
      setAddLineOpen(false);
      refetchLines();
      refetchBudgets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add line');
    }
  };

  const handleStatusChange = (budgetId: string, newStatus: string) => {
    updateBudget.mutate({ id: budgetId, status: newStatus });
  };

  return (
    <AppLayout title="Budgets" subtitle="Budget planning and variance analysis">
      <div className="max-w-7xl">
        <PageHeader
          title="Budget Management"
          subtitle="Plan budgets, track actuals, and analyze variances in real-time"
          icon={PieChart}
          breadcrumb={[{ label: 'Finance' }, { label: 'Budgets' }]}
          actions={[
            { label: 'New Budget', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Total Budgeted', value: formatMoney(totalBudgeted) },
            { label: 'Total Actual', value: formatMoney(totalActual) },
            { label: 'Variance', value: formatMoney(Math.abs(variance)), color: variance >= 0 ? 'text-emerald-600' : 'text-red-600', trend: variance >= 0 ? 'up' : 'down' },
            { label: 'Active Budgets', value: budgets.filter(b => b.status === 'active').length },
          ]}
        />

        {budgets.length === 0 && !isLoading ? (
          <EmptyState icon={PieChart} title="No budgets yet" description="Create your first budget to start tracking planned vs actual spending."
            action={{ label: 'New Budget', onClick: () => setCreateOpen(true) }} />
        ) : (
          <div className="space-y-6">
            {budgets.map((budget, bi) => {
              const budgetActual = (budget.lines ?? []).reduce((s: number, l: any) => s + Number(l.actual_amount ?? 0), 0);
              const budgetVariance = Number(budget.total_budget) - budgetActual;
              const utilization = budget.total_budget > 0 ? (budgetActual / budget.total_budget) * 100 : 0;

              return (
                <motion.div key={budget.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: bi * 0.05 }}>
                  <Card className="border-border rounded-xl">
                    <CardHeader className="pb-2 flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          {budget.name}
                          {!isDemo && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditBudget(budget)}>
                              <Edit className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">{budget.period}</Badge>
                          {budget.department && <Badge variant="outline" className="text-xs">{budget.department}</Badge>}
                          <span className="text-xs text-muted-foreground">FY {budget.fiscal_year}</span>
                          <Badge variant={budget.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{budget.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{formatMoney(budgetActual)} <span className="text-muted-foreground font-normal">/ {formatMoney(budget.total_budget)}</span></p>
                          <p className={cn('text-xs font-medium', budgetVariance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {budgetVariance >= 0 ? '↓' : '↑'} {formatMoney(Math.abs(budgetVariance))} {budgetVariance >= 0 ? 'under' : 'over'}
                          </p>
                        </div>
                        {!isDemo && (
                          <div className="flex items-center gap-1 ml-2">
                            <Select value={budget.status} onValueChange={v => handleStatusChange(budget.id, v)}>
                              <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteBudget.mutate(budget.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {/* Overall utilization */}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Overall utilization</span>
                          <span className={cn('font-semibold', utilization > 100 ? 'text-red-600' : utilization > 80 ? 'text-amber-600' : 'text-foreground')}>
                            {Math.round(utilization)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(utilization, 100)}%` }}
                            transition={{ delay: bi * 0.05 + 0.2, duration: 0.5 }}
                            className={cn('h-full rounded-full', utilization > 100 ? 'bg-red-500' : utilization > 80 ? 'bg-amber-500' : 'bg-indigo-500')}
                          />
                        </div>
                      </div>

                      {/* Line items table */}
                      {(budget.lines ?? []).length > 0 ? (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                              <tr className="text-xs text-muted-foreground">
                                <th className="text-left px-3 py-2 font-medium">Category</th>
                                <th className="text-right px-3 py-2 font-medium">Budgeted</th>
                                <th className="text-right px-3 py-2 font-medium">Actual</th>
                                <th className="text-center px-3 py-2 font-medium">Usage</th>
                                {!isDemo && <th className="text-right px-3 py-2 font-medium">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {(budget.lines ?? []).map((line: any) => {
                                const linePct = line.budgeted_amount > 0 ? (Number(line.actual_amount) / Number(line.budgeted_amount)) * 100 : 0;
                                const overBudget = linePct > 100;
                                return (
                                  <tr key={line.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-3 py-2 text-xs font-medium text-foreground">{line.category}</td>
                                    <td className="px-3 py-2 text-xs text-right tabular-nums">{formatMoney(Number(line.budgeted_amount))}</td>
                                    <td className="px-3 py-2 text-xs text-right tabular-nums font-medium">{formatMoney(Number(line.actual_amount ?? 0))}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2 justify-center">
                                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={cn('h-full rounded-full', overBudget ? 'bg-red-500' : linePct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                                            style={{ width: `${Math.min(linePct, 100)}%` }}
                                          />
                                        </div>
                                        <span className={cn('text-[10px] font-medium w-8 text-right', overBudget ? 'text-red-600' : 'text-muted-foreground')}>
                                          {Math.round(linePct)}%
                                        </span>
                                      </div>
                                    </td>
                                    {!isDemo && (
                                      <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditLine(line)}>
                                            <Edit className="w-3 h-3 text-muted-foreground" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteLine(line.id, budget.id)}>
                                            <Trash2 className="w-3 h-3 text-destructive" />
                                          </Button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No budget lines configured</p>
                      )}

                      {/* Add Line Button */}
                      {!isDemo && (
                        <Button variant="outline" size="sm" className="w-full mt-2 gap-1 text-xs h-8" onClick={() => openAddLine(budget.id)}>
                          <PlusCircle className="w-3.5 h-3.5" /> Add Budget Line
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ─── Create Budget Sheet ─────────────────────────────────────────────── */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-600" /> Create Budget</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5"><Label>Budget Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Q2 2026 Operations Budget" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Fiscal Year</Label>
                  <Input type="number" value={form.fiscal_year} onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Period</Label>
                  <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Optional" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Budget Lines</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"
                    onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { category: '', budgeted_amount: '' }] }))}>
                    <Plus className="w-3 h-3" /> Add Line
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        className="h-8 text-xs flex-1"
                        value={line.category}
                        onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, category: e.target.value } : l) }))}
                        placeholder="Category name"
                      />
                      <Input
                        type="number" placeholder="0.00" className="h-8 text-xs w-28"
                        value={line.budgeted_amount}
                        onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, budgeted_amount: e.target.value } : l) }))}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}>
                        <X className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-muted/50 p-2.5 flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Budget</span>
                  <span className="font-bold">{formatMoney(form.lines.reduce((s, l) => s + (Number(l.budgeted_amount) || 0), 0))}</span>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!form.name || creating} onClick={handleCreate}>
                {creating ? 'Creating...' : 'Create Budget'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* ─── Edit Budget Name Dialog ─────────────────────────────────────────── */}
        <Dialog open={editBudgetOpen} onOpenChange={setEditBudgetOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Budget Name</Label>
                <Input value={editBudgetName} onChange={e => setEditBudgetName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={editBudgetDept} onChange={e => setEditBudgetDept(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditBudgetOpen(false)}>Cancel</Button>
              <Button onClick={handleEditBudget} disabled={!editBudgetName.trim()}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit Budget Line Dialog ─────────────────────────────────────────── */}
        <Dialog open={editLineOpen} onOpenChange={setEditLineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Budget Line</DialogTitle>
            </DialogHeader>
            {editLine && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={editLine.category} onChange={e => setEditLine({ ...editLine, category: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Budgeted Amount</Label>
                  <Input type="number" value={editLine.budgeted_amount} onChange={e => setEditLine({ ...editLine, budgeted_amount: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLineOpen(false)}>Cancel</Button>
              <Button onClick={handleEditLine}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Add Budget Line Dialog ──────────────────────────────────────────── */}
        <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Budget Line</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newLine.category} onValueChange={v => setNewLine(l => ({ ...l, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select or type category" /></SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-1" placeholder="Or type custom category"
                  value={newLine.category}
                  onChange={e => setNewLine(l => ({ ...l, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Budgeted Amount</Label>
                <Input type="number" value={newLine.budgeted_amount} onChange={e => setNewLine(l => ({ ...l, budgeted_amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddLineOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLine} disabled={!newLine.category.trim()}>
                <PlusCircle className="w-4 h-4 mr-1" /> Add Line
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
