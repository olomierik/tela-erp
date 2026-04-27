import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calendar, Eye, Save, Loader2, History, Download, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

interface PayrollRun {
  id: string;
  period: string;
  month: number;
  year: number;
  status: string;
  is_auto: boolean;
  posted_at: string | null;
  employee_count: number;
  total_gross: number;
  total_paye: number;
  total_nssf_employee: number;
  total_nssf_employer: number;
  total_sdl: number;
  total_wcf: number;
  total_net: number;
  total_employer_cost: number;
}

interface PayrollLine {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name: string | null;
  position: string | null;
  department: string | null;
  basic: number;
  allowances: number;
  gross_salary: number;
  paye: number;
  paye_band: string | null;
  nssf_employee: number;
  nssf_employer: number;
  sdl: number;
  wcf: number;
  net_salary: number;
}

const periodLabel = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  if (!y || !m) return p;
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function SavedPayrollRuns() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));

  const [openId, setOpenId] = useState<string | null>(null);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [edits, setEdits] = useState<Record<string, { basic: number; allowances: number }>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PayrollRun | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load runs for tenant
  useEffect(() => {
    if (isDemo || !tenant?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('payroll_runs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('period', { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      else setRuns((data as PayrollRun[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tenant?.id, isDemo]);

  const years = useMemo(() => {
    const set = new Set(runs.map(r => String(r.year)));
    set.add(String(new Date().getFullYear()));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [runs]);

  const filtered = runs.filter(r => yearFilter === 'all' || String(r.year) === yearFilter);

  const openRun = async (run: PayrollRun) => {
    setOpenId(run.id);
    setLinesLoading(true);
    setEdits({});
    const { data, error } = await (supabase as any)
      .from('payroll_lines')
      .select('*')
      .eq('payroll_run_id', run.id)
      .order('employee_name');
    if (error) toast.error(error.message);
    setLines(((data as PayrollLine[]) ?? []));
    setLinesLoading(false);
  };

  const closeSheet = () => { setOpenId(null); setLines([]); setEdits({}); };

  const setEdit = (lineId: string, field: 'basic' | 'allowances', value: number) => {
    setEdits(prev => {
      const current = prev[lineId] || {
        basic: lines.find(l => l.id === lineId)?.basic ?? 0,
        allowances: lines.find(l => l.id === lineId)?.allowances ?? 0,
      };
      return { ...prev, [lineId]: { ...current, [field]: value } };
    });
  };

  // Recompute a single line from edited basic + allowances (TZ TRA bands)
  const recomputeLine = (basic: number, allowances: number, sdlLiable: boolean) => {
    const gross = basic + allowances;
    let paye = 0; let band = '0%';
    if      (gross <= 270000)  { paye = 0; band = '0%'; }
    else if (gross <= 520000)  { paye = (gross - 270000) * 0.08; band = '8%'; }
    else if (gross <= 760000)  { paye = 20000  + (gross - 520000) * 0.20; band = '20%'; }
    else if (gross <= 1000000) { paye = 68000  + (gross - 760000) * 0.25; band = '25%'; }
    else                       { paye = 128000 + (gross - 1000000) * 0.30; band = '30%'; }
    const nssfE = basic * 0.10;
    const nssfR = basic * 0.10;
    const sdl   = sdlLiable ? gross * 0.035 : 0;
    const wcf   = gross * 0.005;
    const net   = gross - paye - nssfE;
    return { gross, paye, band, nssfE, nssfR, sdl, wcf, net };
  };

  const saveEdits = async () => {
    if (!openId || Object.keys(edits).length === 0) { toast.info('No changes to save'); return; }
    setSaving(true);
    try {
      // SDL liability is determined by line count (snapshot of when run was posted)
      const sdlLiable = lines.length >= 10;

      // Update each edited line with recomputed values
      for (const [lineId, vals] of Object.entries(edits)) {
        const r = recomputeLine(vals.basic, vals.allowances, sdlLiable);
        const { error } = await (supabase as any)
          .from('payroll_lines')
          .update({
            basic: vals.basic,
            allowances: vals.allowances,
            gross_salary: r.gross,
            paye: r.paye,
            paye_band: r.band,
            nssf_employee: r.nssfE,
            nssf_employer: r.nssfR,
            sdl: r.sdl,
            wcf: r.wcf,
            net_salary: r.net,
          })
          .eq('id', lineId);
        if (error) throw error;
      }

      // Recompute aggregate totals on the parent run
      const { error: rpcErr } = await (supabase as any).rpc('recompute_payroll_run_totals', { _run_id: openId });
      if (rpcErr) throw rpcErr;

      toast.success(`Saved ${Object.keys(edits).length} change(s) and recomputed totals`);

      // Refresh local state
      const { data } = await (supabase as any).from('payroll_lines').select('*').eq('payroll_run_id', openId).order('employee_name');
      setLines((data as PayrollLine[]) ?? []);
      setEdits({});

      const { data: refreshed } = await (supabase as any)
        .from('payroll_runs').select('*').eq('tenant_id', tenant?.id).order('period', { ascending: false });
      setRuns((refreshed as PayrollRun[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  };

  const openRunData = runs.find(r => r.id === openId);

  // ── Download a saved run as PDF (no need to open the sheet) ──────────────
  const downloadRunPDF = async (run: PayrollRun) => {
    try {
      const { data } = await (supabase as any)
        .from('payroll_lines').select('*').eq('payroll_run_id', run.id).order('employee_name');
      const list: PayrollLine[] = (data as PayrollLine[]) ?? [];
      const fmt = (n: number) => Math.round(Number(n || 0)).toLocaleString();

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageW, 56, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('Payroll Report', 40, 28);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`${periodLabel(run.period)} · ${tenant?.name || 'Company'}`, 40, 46);
      doc.text(new Date().toLocaleDateString(), pageW - 40, 46, { align: 'right' });

      autoTable(doc, {
        startY: 76,
        head: [['Summary', 'Amount']],
        body: [
          ['Employees', String(run.employee_count)],
          ['Total gross', fmt(run.total_gross)],
          ['PAYE', fmt(run.total_paye)],
          ['NSSF (Emp + Empr)', fmt(Number(run.total_nssf_employee) + Number(run.total_nssf_employer))],
          ['SDL', fmt(run.total_sdl)],
          ['WCF', fmt(run.total_wcf)],
          ['Net pay', fmt(run.total_net)],
          ['Total employer cost', fmt(run.total_employer_cost)],
          ['Source', run.is_auto ? 'Auto-posted' : 'Manual'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 40, right: 40 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 16,
        head: [['Employee', 'Position', 'Dept', 'Basic', 'Allow.', 'Gross', 'PAYE', 'NSSF E', 'Net', 'NSSF Empr', 'SDL', 'WCF']],
        body: list.map(l => [
          l.employee_name || '—', l.position || '—', l.department || '—',
          fmt(l.basic), fmt(l.allowances), fmt(l.gross_salary),
          fmt(l.paye), fmt(l.nssf_employee), fmt(l.net_salary),
          fmt(l.nssf_employer), fmt(l.sdl), fmt(l.wcf),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: Object.fromEntries([3,4,5,6,7,8,9,10,11].map(i => [i, { halign: 'right' as const }])),
        margin: { left: 40, right: 40 },
      });

      doc.save(`payroll-${run.period}.pdf`);
      toast.success(`Payroll PDF for ${periodLabel(run.period)} downloaded`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to generate PDF');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !tenant?.id) return;
    setDeleting(true);
    try {
      // Remove child lines first (FK), then the run itself
      const { error: linesErr } = await (supabase as any)
        .from('payroll_lines').delete().eq('payroll_run_id', deleteTarget.id);
      if (linesErr) throw linesErr;

      const { error: runErr } = await (supabase as any)
        .from('payroll_runs').delete().eq('id', deleteTarget.id).eq('tenant_id', tenant.id);
      if (runErr) throw runErr;

      setRuns(prev => prev.filter(r => r.id !== deleteTarget.id));
      if (openId === deleteTarget.id) closeSheet();
      toast.success(`Deleted payroll for ${periodLabel(deleteTarget.period)}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete payroll run');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Card className="rounded-xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Saved Payroll Runs</CardTitle>
            <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Year</span>
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6"><Skeleton className="h-24 w-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No saved payroll runs for this year. Use "Post Payroll" above to snapshot the current month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Period</th>
                  <th className="text-left px-3 py-2.5 font-medium">Source</th>
                  <th className="text-right px-3 py-2.5 font-medium">Employees</th>
                  <th className="text-right px-3 py-2.5 font-medium">Gross</th>
                  <th className="text-right px-3 py-2.5 font-medium text-red-500">PAYE</th>
                  <th className="text-right px-3 py-2.5 font-medium text-indigo-600">Net</th>
                  <th className="text-right px-3 py-2.5 font-medium text-amber-600">Employer Cost</th>
                  <th className="text-left px-3 py-2.5 font-medium">Posted</th>
                  <th className="text-center px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{periodLabel(r.period)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={r.is_auto ? 'secondary' : 'outline'} className="text-[10px]">
                        {r.is_auto ? 'Auto' : 'Manual'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right text-foreground">{r.employee_count}</td>
                    <td className="px-3 py-2.5 text-right text-foreground">{formatMoney(Number(r.total_gross))}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{formatMoney(Number(r.total_paye))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">{formatMoney(Number(r.total_net))}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600">{formatMoney(Number(r.total_employer_cost))}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.posted_at ? new Date(r.posted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openRun(r)}>
                          <Eye className="w-3 h-3" /> Open
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadRunPDF(r)} title={`Download payroll PDF for ${periodLabel(r.period)}`}>
                          <Download className="w-3 h-3" /> PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteTarget(r)}
                          disabled={isDemo}
                          title={`Delete payroll for ${periodLabel(r.period)}`}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Editable lines sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-[920px] flex flex-col p-0" side="right">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center justify-between gap-3 flex-wrap">
              <span>Payroll — {openRunData ? periodLabel(openRunData.period) : ''}</span>
              {openRunData && (
                <span className="text-xs text-muted-foreground font-normal">
                  {openRunData.employee_count} employees · Net {formatMoney(Number(openRunData.total_net))}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {linesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : lines.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No lines for this run.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">Employee</th>
                      <th className="text-right px-2 py-2 font-medium">Basic</th>
                      <th className="text-right px-2 py-2 font-medium">Allowances</th>
                      <th className="text-right px-2 py-2 font-medium">Gross</th>
                      <th className="text-right px-2 py-2 font-medium text-red-500">PAYE</th>
                      <th className="text-right px-2 py-2 font-medium">NSSF E</th>
                      <th className="text-right px-2 py-2 font-medium text-indigo-600">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map(l => {
                      const ed = edits[l.id];
                      const basic = ed ? ed.basic : Number(l.basic);
                      const allow = ed ? ed.allowances : Number(l.allowances);
                      const sdlLiable = lines.length >= 10;
                      const r = recomputeLine(basic, allow, sdlLiable);
                      const dirty = !!ed;
                      return (
                        <tr key={l.id} className={cn('hover:bg-accent/30', dirty && 'bg-amber-50/40 dark:bg-amber-950/10')}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground">{l.employee_name || '—'}</p>
                            <p className="text-muted-foreground text-[11px]">{l.position || '—'} {l.department ? `· ${l.department}` : ''}</p>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              value={basic}
                              onChange={e => setEdit(l.id, 'basic', Number(e.target.value))}
                              className="w-24 h-7 text-xs text-right ml-auto"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              value={allow}
                              onChange={e => setEdit(l.id, 'allowances', Number(e.target.value))}
                              className="w-24 h-7 text-xs text-right ml-auto"
                            />
                          </td>
                          <td className="px-2 py-2 text-right text-foreground">{Math.round(r.gross).toLocaleString()}</td>
                          <td className="px-2 py-2 text-right text-red-500">
                            {Math.round(r.paye).toLocaleString()}
                            <span className="ml-1 text-muted-foreground">({r.band})</span>
                          </td>
                          <td className="px-2 py-2 text-right text-orange-500">{Math.round(r.nssfE).toLocaleString()}</td>
                          <td className="px-2 py-2 text-right font-bold text-indigo-600">{Math.round(r.net).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {Object.keys(edits).length > 0
                ? `${Object.keys(edits).length} unsaved change(s) — totals will be recomputed`
                : 'Edit basic or allowances inline. PAYE/NSSF/Net auto-recompute on save.'}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={closeSheet} disabled={saving}>Close</Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={saveEdits}
                disabled={saving || Object.keys(edits).length === 0 || isDemo}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save & Recompute
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
