import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { today, formatCurrency } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Save, CheckCircle2, ThumbsUp, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = 'draft' | 'received' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

interface BillLine {
  /** Local-only key for React reconciliation */
  _key: string;
  /** DB id — undefined for newly added lines */
  id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_pct: string;
  tax_pct: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMS_DAYS: Record<string, number> = {
  'Net 15': 15,
  'Net 30': 30,
  'Net 60': 60,
};

const CATEGORIES = ['General', 'Utilities', 'Rent', 'Supplies', 'Services'] as const;

const STATUS_BADGE: Record<BillStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  draft:          'secondary',
  received:       'info',
  approved:       'warning',
  partially_paid: 'warning',
  paid:           'success',
  overdue:        'destructive',
  cancelled:      'outline',
};

const STATUS_LABEL: Record<BillStatus, string> = {
  draft:          'Draft',
  received:       'Received',
  approved:       'Approved',
  partially_paid: 'Partially Paid',
  paid:           'Paid',
  overdue:        'Overdue',
  cancelled:      'Cancelled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let lineCounter = 0;
function emptyLine(): BillLine {
  return {
    _key:         `line-${++lineCounter}`,
    description:  '',
    quantity:     '1',
    unit_price:   '',
    discount_pct: '0',
    tax_pct:      '0',
  };
}

function calcLineTotal(line: BillLine): number {
  const qty   = parseFloat(line.quantity)     || 0;
  const price = parseFloat(line.unit_price)   || 0;
  const disc  = parseFloat(line.discount_pct) || 0;
  const tax   = parseFloat(line.tax_pct)      || 0;
  return qty * price * (1 - disc / 100) * (1 + tax / 100);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function nextBillNumber(existing: string[]): string {
  const year   = new Date().getFullYear();
  const prefix = `BILL-${year}-`;
  const nums   = existing
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillForm() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { id }    = useParams<{ id: string }>();
  const isNew     = !id || id === 'new';

  // ── Meta state ────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(!isNew);
  const [saving,     setSaving]     = useState(false);
  const [billStatus, setBillStatus] = useState<BillStatus>('draft');

  // ── Header fields ─────────────────────────────────────────────────────────
  const [billNumber, setBillNumber] = useState('');
  const [vendor,     setVendor]     = useState('');
  const [billDate,   setBillDate]   = useState(today());
  const [dueDate,    setDueDate]    = useState('');
  const [terms,      setTerms]      = useState('');
  const [category,   setCategory]   = useState('General');
  const [notes,      setNotes]      = useState('');

  // ── Lines ─────────────────────────────────────────────────────────────────
  const [lines, setLines] = useState<BillLine[]>([emptyLine(), emptyLine()]);

  // ── Derived totals ────────────────────────────────────────────────────────
  const lineTotals = lines.map(calcLineTotal);

  const subtotalRaw = lines.reduce((sum, l) => {
    const qty   = parseFloat(l.quantity)   || 0;
    const price = parseFloat(l.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const discountTotal = lines.reduce((sum, l) => {
    const qty   = parseFloat(l.quantity)     || 0;
    const price = parseFloat(l.unit_price)   || 0;
    const disc  = parseFloat(l.discount_pct) || 0;
    return sum + qty * price * (disc / 100);
  }, 0);

  const taxTotal = lines.reduce((sum, l) => {
    const qty   = parseFloat(l.quantity)     || 0;
    const price = parseFloat(l.unit_price)   || 0;
    const disc  = parseFloat(l.discount_pct) || 0;
    const tax   = parseFloat(l.tax_pct)      || 0;
    return sum + qty * price * (1 - disc / 100) * (tax / 100);
  }, 0);

  const grandTotal = subtotalRaw - discountTotal + taxTotal;

  // ── Load existing bill ────────────────────────────────────────────────────

  const loadBill = useCallback(async () => {
    if (!user || isNew) return;
    setLoading(true);
    try {
      const [{ data: bill, error: billErr }, { data: billLines, error: linesErr }] = await Promise.all([
        supabase.from('myerp_bills').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('myerp_bill_lines').select('*').eq('bill_id', id).order('sort_order', { ascending: true }),
      ]);

      if (billErr || !bill) {
        toast.error('Bill not found.');
        navigate('/finance/bills');
        return;
      }
      if (linesErr) {
        toast.error('Failed to load bill lines.');
      }

      setBillNumber(bill.number ?? '');
      setVendor(bill.vendor ?? '');
      setBillDate(bill.bill_date ?? today());
      setDueDate(bill.due_date ?? '');
      setTerms(bill.terms ?? '');
      setCategory(bill.category ?? 'General');
      setNotes(bill.notes ?? '');
      setBillStatus(bill.status as BillStatus);

      if (billLines && billLines.length > 0) {
        setLines(
          billLines.map((l: {
            id: string;
            description: string | null;
            quantity: number | null;
            unit_price: number | null;
            discount_pct: number | null;
            tax_pct: number | null;
          }) => ({
            _key:         l.id,
            id:           l.id,
            description:  l.description ?? '',
            quantity:     String(l.quantity ?? 1),
            unit_price:   String(l.unit_price ?? ''),
            discount_pct: String(l.discount_pct ?? 0),
            tax_pct:      String(l.tax_pct ?? 0),
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user, isNew, id, navigate]);

  // ── Generate bill number for new bills ────────────────────────────────────

  const generateBillNumber = useCallback(async () => {
    if (!user || !isNew) return;
    const { data } = await supabase
      .from('myerp_bills')
      .select('number')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const numbers = (data ?? []).map((r: { number: string }) => r.number);
    setBillNumber(nextBillNumber(numbers));
  }, [user, isNew]);

  useEffect(() => {
    if (isNew) {
      generateBillNumber();
    } else {
      loadBill();
    }
  }, [isNew, generateBillNumber, loadBill]);

  // ── Terms → Due Date auto-fill ────────────────────────────────────────────

  function handleTermsChange(value: string) {
    setTerms(value);
    if (value && TERMS_DAYS[value] && billDate) {
      setDueDate(addDays(billDate, TERMS_DAYS[value]));
    }
  }

  function handleBillDateChange(value: string) {
    setBillDate(value);
    if (terms && TERMS_DAYS[terms]) {
      setDueDate(addDays(value, TERMS_DAYS[terms]));
    }
  }

  // ── Line operations ───────────────────────────────────────────────────────

  function updateLine(key: string, field: keyof Omit<BillLine, '_key' | 'id'>, value: string) {
    setLines(prev => prev.map(l => l._key === key ? { ...l, [field]: value } : l));
  }

  function removeLine(key: string) {
    setLines(prev => (prev.length <= 1 ? prev : prev.filter(l => l._key !== key)));
  }

  function addLine() {
    setLines(prev => [...prev, emptyLine()]);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    if (!vendor.trim()) {
      toast.error('Vendor name is required.');
      return false;
    }
    if (!billDate) {
      toast.error('Bill date is required.');
      return false;
    }
    const hasLines = lines.some(
      l => l.description.trim() || parseFloat(l.unit_price) > 0,
    );
    if (!hasLines) {
      toast.error('Add at least one line item.');
      return false;
    }
    return true;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(saveStatus: BillStatus) {
    if (!user) return;
    if (!validate()) return;

    // Prevent downgrading from advanced states
    if (!isNew) {
      const blockedTransitions: Partial<Record<BillStatus, BillStatus[]>> = {
        paid:           ['draft', 'received', 'approved'],
        partially_paid: ['draft'],
        overdue:        ['draft'],
        cancelled:      ['draft', 'received', 'approved', 'partially_paid'],
      };
      if (blockedTransitions[billStatus]?.includes(saveStatus)) {
        toast.error(
          `Cannot change a ${STATUS_LABEL[billStatus]} bill to ${STATUS_LABEL[saveStatus]}.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const billPayload = {
        user_id:         user.id,
        number:          billNumber,
        vendor:          vendor.trim(),
        bill_date:       billDate,
        due_date:        dueDate || null,
        terms:           terms   || null,
        category:        category || null,
        notes:           notes.trim() || null,
        status:          saveStatus,
        amount:          grandTotal,
        subtotal:        subtotalRaw,
        discount_amount: discountTotal,
        tax_amount:      taxTotal,
        updated_at:      new Date().toISOString(),
      };

      let billId: string | undefined = id && !isNew ? id : undefined;

      if (isNew) {
        const { data, error } = await supabase
          .from('myerp_bills')
          .insert({
            ...billPayload,
            paid_amount: 0,
            created_at:  new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) throw error;
        billId = data.id as string;
      } else {
        const { error } = await supabase
          .from('myerp_bills')
          .update(billPayload)
          .eq('id', billId!)
          .eq('user_id', user.id);
        if (error) throw error;
      }

      // Delete old lines then re-insert current set
      if (!isNew) {
        const { error: delErr } = await supabase
          .from('myerp_bill_lines')
          .delete()
          .eq('bill_id', billId!);
        if (delErr) throw delErr;
      }

      const lineRows = lines
        .filter(l => l.description.trim() || parseFloat(l.unit_price) > 0)
        .map((l, idx) => ({
          bill_id:      billId!,
          description:  l.description.trim(),
          quantity:     parseFloat(l.quantity)     || 0,
          unit_price:   parseFloat(l.unit_price)   || 0,
          discount_pct: parseFloat(l.discount_pct) || 0,
          tax_pct:      parseFloat(l.tax_pct)      || 0,
          line_total:   calcLineTotal(l),
          sort_order:   idx,
          created_at:   new Date().toISOString(),
        }));

      if (lineRows.length > 0) {
        const { error: lineErr } = await supabase
          .from('myerp_bill_lines')
          .insert(lineRows);
        if (lineErr) throw lineErr;
      }

      toast.success(
        isNew
          ? `Bill ${billNumber} created as ${STATUS_LABEL[saveStatus]}.`
          : `Bill ${billNumber} saved as ${STATUS_LABEL[saveStatus]}.`,
      );
      navigate('/finance/bills');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save bill.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isReadOnly = !isNew && (billStatus === 'paid' || billStatus === 'cancelled');
  const canApprove = !isNew && billStatus === 'received';

  if (loading) {
    return (
      <AppLayout title="Bill">
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isNew ? 'New Bill' : `Bill ${billNumber}`}>
      <PageHeader
        title={isNew ? 'New Bill' : `Bill ${billNumber}`}
        subtitle={
          isNew
            ? 'Create a new vendor bill.'
            : `Editing bill from ${vendor || 'vendor'}.`
        }
        breadcrumbs={[
          { label: 'Finance', href: '/finance/bills' },
          { label: 'Bills',   href: '/finance/bills' },
          { label: isNew ? 'New' : billNumber },
        ]}
      />

      <div className="flex flex-col gap-6">
        {/* ── Bill header card ──────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">Bill Details</CardTitle>
              {!isNew && (
                <Badge variant={STATUS_BADGE[billStatus]}>
                  {STATUS_LABEL[billStatus]}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Bill # */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bill-number">Bill #</Label>
                <Input
                  id="bill-number"
                  value={billNumber}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground font-mono"
                />
              </div>

              {/* Vendor */}
              <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="vendor">Vendor *</Label>
                <Input
                  id="vendor"
                  placeholder="Vendor name"
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={isReadOnly}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>

              {/* Bill Date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bill-date">Bill Date *</Label>
                <Input
                  id="bill-date"
                  type="date"
                  value={billDate}
                  onChange={e => handleBillDateChange(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

              {/* Payment Terms */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="terms">Payment Terms</Label>
                <Select
                  id="terms"
                  value={terms}
                  onChange={e => handleTermsChange(e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="">— Select —</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                </Select>
              </div>

              {/* Due Date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Line items card ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Unit Price</TableHead>
                    <TableHead className="w-20 text-right">Disc %</TableHead>
                    <TableHead className="w-20 text-right">Tax %</TableHead>
                    <TableHead className="w-28 text-right">Line Total</TableHead>
                    {!isReadOnly && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, i) => (
                    <TableRow key={line._key}>
                      {/* Description */}
                      <TableCell className="py-1.5">
                        <Input
                          placeholder="Description"
                          value={line.description}
                          onChange={e => updateLine(line._key, 'description', e.target.value)}
                          disabled={isReadOnly}
                          className="h-8 text-sm"
                        />
                      </TableCell>

                      {/* Qty */}
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="1"
                          value={line.quantity}
                          onChange={e => updateLine(line._key, 'quantity', e.target.value)}
                          disabled={isReadOnly}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>

                      {/* Unit Price */}
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={line.unit_price}
                          onChange={e => updateLine(line._key, 'unit_price', e.target.value)}
                          disabled={isReadOnly}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>

                      {/* Disc % */}
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          value={line.discount_pct}
                          onChange={e => updateLine(line._key, 'discount_pct', e.target.value)}
                          disabled={isReadOnly}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>

                      {/* Tax % */}
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          value={line.tax_pct}
                          onChange={e => updateLine(line._key, 'tax_pct', e.target.value)}
                          disabled={isReadOnly}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>

                      {/* Line Total (calculated) */}
                      <TableCell className="py-1.5 text-right tabular-nums font-medium text-sm">
                        {formatCurrency(lineTotals[i])}
                      </TableCell>

                      {/* Remove */}
                      {!isReadOnly && (
                        <TableCell className="py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line._key)}
                            disabled={lines.length <= 1}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Add Line */}
            {!isReadOnly && (
              <div className="px-4 py-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Notes + Summary ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Internal notes or payment instructions…"
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotalRaw)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums text-success">
                    {discountTotal > 0
                      ? `\u2212${formatCurrency(discountTotal)}`
                      : formatCurrency(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums">{formatCurrency(taxTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-1">
                  <span className="font-semibold">Grand Total</span>
                  <span className="tabular-nums font-bold text-base">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/finance/bills')}
            disabled={saving}
            className="gap-1.5"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>

          {!isReadOnly && (
            <>
              {/* Save as Draft */}
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="gap-1.5"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save as Draft'}
              </Button>

              {/* Mark as Received — available for new bills or drafts */}
              {(isNew || billStatus === 'draft') && (
                <Button
                  variant="default"
                  onClick={() => handleSave('received')}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Mark as Received'}
                </Button>
              )}

              {/* Approve — only when status is 'received' */}
              {canApprove && (
                <Button
                  variant="default"
                  onClick={() => handleSave('approved')}
                  disabled={saving}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Approve'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
