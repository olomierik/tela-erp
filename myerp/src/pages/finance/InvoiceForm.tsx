import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, today } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Send, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

interface LineItem {
  /** client-side stable key */
  key: string;
  /** DB id — present when loaded from database */
  id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_pct: string;
  tax_pct: string;
}

type PaymentTerms = 'net15' | 'net30' | 'net60' | 'custom';

const TERMS_DAYS: Record<PaymentTerms, number | null> = {
  net15:  15,
  net30:  30,
  net60:  60,
  custom: null,
};

const TERMS_LABELS: Record<PaymentTerms, string> = {
  net15:  'Net 15',
  net30:  'Net 30',
  net60:  'Net 60',
  custom: '',
};

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_BADGE: Record<InvoiceStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  draft:          'secondary',
  sent:           'info',
  partially_paid: 'warning',
  paid:           'success',
  overdue:        'destructive',
  cancelled:      'outline',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft:          'Draft',
  sent:           'Sent',
  partially_paid: 'Partially Paid',
  paid:           'Paid',
  overdue:        'Overdue',
  cancelled:      'Cancelled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let lineCounter = 0;

function newLine(): LineItem {
  return {
    key:          `line-${++lineCounter}`,
    description:  '',
    quantity:     '1',
    unit_price:   '',
    discount_pct: '0',
    tax_pct:      '0',
  };
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calcLineTotal(line: LineItem): number {
  const qty   = parseFloat(line.quantity)     || 0;
  const price = parseFloat(line.unit_price)   || 0;
  const disc  = parseFloat(line.discount_pct) || 0;
  const tax   = parseFloat(line.tax_pct)      || 0;
  return qty * price * (1 - disc / 100) * (1 + tax / 100);
}

function calcSubtotal(line: LineItem): number {
  return (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
}

function calcDiscountAmt(line: LineItem): number {
  const qty   = parseFloat(line.quantity)     || 0;
  const price = parseFloat(line.unit_price)   || 0;
  const disc  = parseFloat(line.discount_pct) || 0;
  return qty * price * (disc / 100);
}

function calcTaxAmt(line: LineItem): number {
  const qty   = parseFloat(line.quantity)     || 0;
  const price = parseFloat(line.unit_price)   || 0;
  const disc  = parseFloat(line.discount_pct) || 0;
  const tax   = parseFloat(line.tax_pct)      || 0;
  return qty * price * (1 - disc / 100) * (tax / 100);
}

/** Return the next invoice number in INV-YYYY-NNN format for the given user. */
async function generateInvoiceNumber(userId: string): Promise<string> {
  const year   = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from('myerp_invoices')
    .select('number')
    .eq('user_id', userId)
    .like('number', `${prefix}%`)
    .order('number', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const last = (data[0] as { number: string }).number;
    const seq  = parseInt(last.replace(prefix, ''), 10) || 0;
    return `${prefix}${String(seq + 1).padStart(3, '0')}`;
  }
  return `${prefix}001`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id }   = useParams<{ id: string }>();

  const isNew = !id || id === 'new';

  // ── Header fields ────────────────────────────────────────────────────────

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customer,      setCustomer]      = useState('');
  const [invoiceDate,   setInvoiceDate]   = useState(today());
  const [dueDate,       setDueDate]       = useState('');
  const [terms,         setTerms]         = useState<PaymentTerms>('net30');
  const [termsText,     setTermsText]     = useState('Net 30');
  const [notes,         setNotes]         = useState('');
  const [status,        setStatus]        = useState<InvoiceStatus>('draft');
  const [paidAmount,    setPaidAmount]    = useState(0);

  // ── Line items ───────────────────────────────────────────────────────────

  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  // ── UI state ─────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);

  // ── Init new invoice ──────────────────────────────────────────────────────

  const initNew = useCallback(async () => {
    if (!user) return;
    const num = await generateInvoiceNumber(user.id);
    setInvoiceNumber(num);
    setDueDate(addDays(today(), 30));
  }, [user]);

  // ── Load existing invoice ────────────────────────────────────────────────

  const loadExisting = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    const { data: inv, error: invErr } = await supabase
      .from('myerp_invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (invErr || !inv) {
      toast.error('Invoice not found.');
      navigate('/finance/invoices');
      return;
    }

    const row = inv as {
      number:       string;
      customer:     string;
      issue_date:   string;
      due_date:     string;
      terms:        string | null;
      notes:        string | null;
      status:       InvoiceStatus;
      paid_amount:  number;
    };

    setInvoiceNumber(row.number ?? '');
    setCustomer(row.customer ?? '');
    setInvoiceDate(row.issue_date ?? today());
    setDueDate(row.due_date ?? '');
    setTermsText(row.terms ?? '');
    setNotes(row.notes ?? '');
    setStatus(row.status ?? 'draft');
    setPaidAmount(row.paid_amount ?? 0);

    // Reverse-map terms text to dropdown value
    if      (row.terms === 'Net 15') setTerms('net15');
    else if (row.terms === 'Net 30') setTerms('net30');
    else if (row.terms === 'Net 60') setTerms('net60');
    else                              setTerms('custom');

    // Load line items
    const { data: dbLines } = await supabase
      .from('myerp_invoice_lines')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order');

    if (dbLines && dbLines.length > 0) {
      setLines(
        (dbLines as {
          id: string;
          description: string;
          quantity: number;
          unit_price: number;
          discount_pct: number;
          tax_pct: number;
        }[]).map(l => ({
          key:          l.id,
          id:           l.id,
          description:  l.description ?? '',
          quantity:     String(l.quantity ?? 1),
          unit_price:   String(l.unit_price ?? 0),
          discount_pct: String(l.discount_pct ?? 0),
          tax_pct:      String(l.tax_pct ?? 0),
        })),
      );
    }

    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    if (isNew) {
      initNew();
    } else {
      loadExisting();
    }
  }, [isNew, initNew, loadExisting]);

  // ── Auto-fill due date from terms + invoice date ──────────────────────────

  function handleTermsChange(val: PaymentTerms) {
    setTerms(val);
    const days = TERMS_DAYS[val];
    if (days !== null && invoiceDate) {
      setDueDate(addDays(invoiceDate, days));
    }
    if (val !== 'custom') {
      setTermsText(TERMS_LABELS[val]);
    }
  }

  function handleInvoiceDateChange(val: string) {
    setInvoiceDate(val);
    const days = TERMS_DAYS[terms];
    if (days !== null && val) {
      setDueDate(addDays(val, days));
    }
  }

  // ── Line management ──────────────────────────────────────────────────────

  function addLine() {
    setLines(prev => [...prev, newLine()]);
  }

  function removeLine(key: string) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.key !== key) : prev);
  }

  function updateLine(key: string, field: keyof Omit<LineItem, 'key' | 'id'>, value: string) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  }

  // ── Computed totals ──────────────────────────────────────────────────────

  const subtotal      = lines.reduce((s, l) => s + calcSubtotal(l), 0);
  const discountTotal = lines.reduce((s, l) => s + calcDiscountAmt(l), 0);
  const taxTotal      = lines.reduce((s, l) => s + calcTaxAmt(l), 0);
  const grandTotal    = lines.reduce((s, l) => s + calcLineTotal(l), 0);

  // ── Derived flags ────────────────────────────────────────────────────────

  const isCancelled = !isNew && status === 'cancelled';
  const canMarkPaid = !isNew && (status === 'sent' || status === 'partially_paid' || status === 'overdue');
  const readOnly    = isCancelled;

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(targetStatus: InvoiceStatus) {
    if (!user) return;

    if (!customer.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!invoiceDate) {
      toast.error('Invoice date is required.');
      return;
    }
    const filledLines = lines.filter(
      l => l.description.trim() || (parseFloat(l.unit_price) || 0) > 0,
    );
    if (filledLines.length === 0) {
      toast.error('Add at least one line item.');
      return;
    }

    setSaving(true);
    try {
      const invoicePayload = {
        user_id:         user.id,
        number:          invoiceNumber,
        customer:        customer.trim(),
        issue_date:      invoiceDate,
        due_date:        dueDate || null,
        status:          targetStatus,
        amount:          grandTotal,
        subtotal:        subtotal,
        discount_amount: discountTotal,
        tax_amount:      taxTotal,
        paid_amount:     isNew ? 0 : paidAmount,
        items_count:     filledLines.length,
        terms:           termsText.trim() || null,
        notes:           notes.trim()     || null,
      };

      let resolvedId = id;

      if (isNew) {
        const { data: created, error: createErr } = await supabase
          .from('myerp_invoices')
          .insert(invoicePayload)
          .select('id')
          .single();
        if (createErr) throw createErr;
        resolvedId = (created as { id: string }).id;
      } else {
        const { error: updateErr } = await supabase
          .from('myerp_invoices')
          .update({ ...invoicePayload, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (updateErr) throw updateErr;

        // Wipe old lines — will re-insert below
        const { error: delErr } = await supabase
          .from('myerp_invoice_lines')
          .delete()
          .eq('invoice_id', id);
        if (delErr) throw delErr;
      }

      // Insert line items
      const linePayloads = filledLines.map((l, idx) => ({
        invoice_id:   resolvedId,
        description:  l.description,
        quantity:     parseFloat(l.quantity)     || 0,
        unit_price:   parseFloat(l.unit_price)   || 0,
        discount_pct: parseFloat(l.discount_pct) || 0,
        tax_pct:      parseFloat(l.tax_pct)      || 0,
        line_total:   calcLineTotal(l),
        sort_order:   idx + 1,
      }));

      const { error: linesErr } = await supabase
        .from('myerp_invoice_lines')
        .insert(linePayloads);
      if (linesErr) throw linesErr;

      const verb =
        targetStatus === 'sent' ? 'sent' :
        targetStatus === 'paid' ? 'marked as paid' : 'saved as draft';
      toast.success(`Invoice ${invoiceNumber} ${verb}.`);
      navigate('/finance/invoices');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  }

  // ── Breadcrumbs ──────────────────────────────────────────────────────────

  const breadcrumbs = [
    { label: 'Finance' },
    { label: 'Invoices', href: '/finance/invoices' },
    { label: isNew ? 'New Invoice' : invoiceNumber },
  ];

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout title="Invoice">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout title={isNew ? 'New Invoice' : invoiceNumber}>
      <PageHeader
        title={isNew ? 'New Invoice' : invoiceNumber}
        breadcrumbs={breadcrumbs}
      />

      {/* ── Cancelled banner ── */}
      {isCancelled && (
        <div className="flex items-center gap-2.5 px-4 py-3 mb-5 rounded-lg bg-muted border border-border text-muted-foreground text-sm font-medium">
          This invoice has been cancelled and cannot be edited.
        </div>
      )}

      {/* ── Header card ── */}
      <Card className="mb-4">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Invoice Details</CardTitle>
            {!isNew && (
              <Badge variant={STATUS_BADGE[status]}>
                {STATUS_LABEL[status]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Invoice Number (auto-generated, read-only) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-number">Invoice #</Label>
              <Input
                id="inv-number"
                value={invoiceNumber}
                readOnly
                className="font-mono bg-muted/40 cursor-default select-all"
                title="Auto-generated invoice number"
              />
            </div>

            {/* Customer */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-customer">Customer *</Label>
              <Input
                id="inv-customer"
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="Customer or company name"
                disabled={readOnly}
              />
            </div>

            {/* Invoice Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-date">Invoice Date *</Label>
              <Input
                id="inv-date"
                type="date"
                value={invoiceDate}
                onChange={e => handleInvoiceDateChange(e.target.value)}
                disabled={readOnly}
              />
            </div>

            {/* Payment Terms */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-terms">Payment Terms</Label>
              <Select
                id="inv-terms"
                value={terms}
                onChange={e => handleTermsChange(e.target.value as PaymentTerms)}
                disabled={readOnly}
              >
                <option value="net15">Net 15</option>
                <option value="net30">Net 30</option>
                <option value="net60">Net 60</option>
                <option value="custom">Custom</option>
              </Select>
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-due">Due Date</Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  setTerms('custom');
                }}
                disabled={readOnly}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── Line items card ── */}
      <Card className="mb-4">
        <CardHeader className="pb-0 pt-5 px-5">
          <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[220px]">
                    Description
                  </th>
                  <th className="w-20 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="w-28 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Unit Price
                  </th>
                  <th className="w-20 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Disc %
                  </th>
                  <th className="w-20 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tax %
                  </th>
                  <th className="w-32 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Line Total
                  </th>
                  <th className="w-10 px-3 py-2.5" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <tr
                    key={line.key}
                    className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                  >
                    {/* Description */}
                    <td className="px-3 py-1.5">
                      <Input
                        value={line.description}
                        onChange={e => updateLine(line.key, 'description', e.target.value)}
                        placeholder="Item or service description…"
                        disabled={readOnly}
                        className="h-9 text-xs"
                      />
                    </td>

                    {/* Qty */}
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={e => updateLine(line.key, 'quantity', e.target.value)}
                        min="0"
                        step="1"
                        disabled={readOnly}
                        className="h-9 text-xs text-right tabular-nums"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={e => updateLine(line.key, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        disabled={readOnly}
                        className="h-9 text-xs text-right tabular-nums"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={line.discount_pct}
                        onChange={e => updateLine(line.key, 'discount_pct', e.target.value)}
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={readOnly}
                        className="h-9 text-xs text-right tabular-nums"
                      />
                    </td>

                    {/* Tax % */}
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={line.tax_pct}
                        onChange={e => updateLine(line.key, 'tax_pct', e.target.value)}
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={readOnly}
                        className="h-9 text-xs text-right tabular-nums"
                      />
                    </td>

                    {/* Line Total (calculated, read-only) */}
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-sm tabular-nums font-medium">
                        {formatCurrency(calcLineTotal(line))}
                      </span>
                    </td>

                    {/* Remove row */}
                    <td className="px-3 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={readOnly || lines.length <= 1}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove line"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add line button */}
          {!readOnly && (
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
        </CardContent>
      </Card>

      {/* ── Bottom section: Notes + Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Notes & Terms */}
        <Card>
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold">Notes &amp; Terms</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-notes">Notes</Label>
              <Textarea
                id="inv-notes"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes for the customer (optional)…"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-terms-text">Payment Terms</Label>
              <Textarea
                id="inv-terms-text"
                rows={3}
                value={termsText}
                onChange={e => { setTermsText(e.target.value); setTerms('custom'); }}
                placeholder="E.g. Payment due within 30 days of invoice date…"
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary totals */}
        <Card>
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="tabular-nums text-orange-600 dark:text-orange-400">
                  {discountTotal > 0
                    ? `−${formatCurrency(discountTotal)}`
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{formatCurrency(taxTotal)}</span>
              </div>

              <div className="h-px bg-border my-1" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">Grand Total</span>
                <span className="tabular-nums font-bold text-lg">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Paid / balance — only when editing and some payment has been made */}
              {!isNew && paidAmount > 0 && (
                <>
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span>Amount Paid</span>
                    <span className="tabular-nums">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Balance Due</span>
                    <span className="tabular-nums">
                      {formatCurrency(Math.max(0, grandTotal - paidAmount))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between gap-3 pb-4 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/finance/invoices')}
          disabled={saving}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Mark as Paid — editing only, status allows it */}
          {canMarkPaid && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave('paid')}
              disabled={saving || readOnly}
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950/30"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              Mark as Paid
            </Button>
          )}

          {/* Save as Draft */}
          {!isCancelled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="gap-1.5"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              Save as Draft
            </Button>
          )}

          {/* Send Invoice */}
          {!isCancelled && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave('sent')}
              disabled={saving}
              className="gap-1.5"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
              Send Invoice
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
