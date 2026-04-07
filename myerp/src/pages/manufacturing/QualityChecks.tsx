import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, ClipboardCheck, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type QCResult = 'pending' | 'pass' | 'fail' | 'rework';

interface QualityCheck extends Record<string, unknown> {
  id: string;
  check_number: string;
  production_order_number: string;
  product_name: string;
  check_date: string;
  inspector: string;
  result: QCResult;
  notes: string;
}

type QCForm = {
  production_order_number: string;
  product_name: string;
  check_date: string;
  inspector: string;
  result: QCResult;
  notes: string;
};

const BLANK: QCForm = {
  production_order_number: '',
  product_name: '',
  check_date: new Date().toISOString().split('T')[0],
  inspector: '',
  result: 'pending',
  notes: '',
};

const resultVariant: Record<QCResult, 'secondary' | 'success' | 'destructive' | 'warning'> = {
  pending: 'secondary',
  pass: 'success',
  fail: 'destructive',
  rework: 'warning',
};

const resultLabel: Record<QCResult, string> = {
  pending: 'Pending',
  pass: 'Pass',
  fail: 'Fail',
  rework: 'Rework',
};

function generateCheckNumber(existing: QualityCheck[]): string {
  const year = new Date().getFullYear();
  const thisYear = existing.filter(c => c.check_number?.startsWith(`QC-${year}-`));
  const next = (thisYear.length + 1).toString().padStart(3, '0');
  return `QC-${year}-${next}`;
}

export default function QualityChecks() {
  const { rows: checks, loading, insert, update, remove } = useTable<QualityCheck>('myerp_quality_checks', 'check_date', false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QualityCheck | null>(null);
  const [form, setForm] = useState<QCForm>(BLANK);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchProduct, setSearchProduct] = useState('');
  const [filterResult, setFilterResult] = useState<QCResult | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // KPIs
  const total = checks.length;
  const pending = checks.filter(c => c.result === 'pending').length;
  const passed = checks.filter(c => c.result === 'pass').length;
  const failed = checks.filter(c => c.result === 'fail').length;
  const passRate = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

  // Filtered rows
  const filtered = useMemo(() => {
    return checks.filter(c => {
      if (searchProduct && !(c.product_name as string).toLowerCase().includes(searchProduct.toLowerCase())) return false;
      if (filterResult && c.result !== filterResult) return false;
      if (dateFrom && c.check_date < dateFrom) return false;
      if (dateTo && c.check_date > dateTo) return false;
      return true;
    });
  }, [checks, searchProduct, filterResult, dateFrom, dateTo]);

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(c: QualityCheck) {
    setEditing(c);
    setForm({
      production_order_number: c.production_order_number as string,
      product_name: c.product_name as string,
      check_date: c.check_date as string,
      inspector: c.inspector as string,
      result: c.result as QCResult,
      notes: c.notes as string,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.product_name.trim()) { toast.error('Product name is required'); return; }
    if (!form.inspector.trim()) { toast.error('Inspector is required'); return; }
    if (!form.check_date) { toast.error('Check date is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Quality check updated');
      } else {
        const check_number = generateCheckNumber(checks);
        await insert({ check_number, ...form });
        toast.success('Quality check created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Quality check deleted');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field<K extends keyof QCForm>(key: K, value: QCForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Quality Checks">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quality Checks">
      <PageHeader
        title="Quality Checks"
        subtitle="Track production quality control inspections and results"
        action={{ label: 'New Check', onClick: openNew }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Checks', value: total, icon: ClipboardCheck, color: 'text-primary' },
          { label: 'Pending', value: pending, icon: Clock, color: 'text-secondary-foreground' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: CheckCircle2, color: 'text-success' },
          { label: 'Failed', value: failed, icon: XCircle, color: 'text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Search Product</Label>
              <Input
                placeholder="Product name..."
                value={searchProduct}
                onChange={e => setSearchProduct(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Result</Label>
              <Select value={filterResult} onChange={e => setFilterResult(e.target.value as QCResult | '')}>
                <option value="">All Results</option>
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="rework">Rework</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check #</TableHead>
                <TableHead>Production Order</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    {checks.length === 0 ? 'No quality checks yet. Create your first one.' : 'No checks match the current filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.check_number}</TableCell>
                    <TableCell className="font-mono text-xs">{c.production_order_number || '—'}</TableCell>
                    <TableCell className="font-medium">{c.product_name}</TableCell>
                    <TableCell>{formatDate(c.check_date as string)}</TableCell>
                    <TableCell>{c.inspector}</TableCell>
                    <TableCell>
                      <Badge variant={resultVariant[c.result as QCResult]}>
                        {resultLabel[c.result as QCResult]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet form */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Quality Check' : 'New Quality Check'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="qc-order">Production Order #</Label>
              <Input
                id="qc-order"
                value={form.production_order_number}
                onChange={e => field('production_order_number', e.target.value)}
                placeholder="e.g. PO-2024-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-product">Product Name</Label>
              <Input
                id="qc-product"
                value={form.product_name}
                onChange={e => field('product_name', e.target.value)}
                placeholder="Product being inspected"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-date">Check Date</Label>
              <Input
                id="qc-date"
                type="date"
                value={form.check_date}
                onChange={e => field('check_date', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-inspector">Inspector</Label>
              <Input
                id="qc-inspector"
                value={form.inspector}
                onChange={e => field('inspector', e.target.value)}
                placeholder="Inspector name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-result">Result</Label>
              <Select
                id="qc-result"
                value={form.result}
                onChange={e => field('result', e.target.value as QCResult)}
              >
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="rework">Rework</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-notes">Notes</Label>
              <Textarea
                id="qc-notes"
                value={form.notes}
                onChange={e => field('notes', e.target.value)}
                placeholder="Inspection notes, defects observed..."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Check'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
