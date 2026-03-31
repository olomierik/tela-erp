import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Modal } from '@/components/erp/Modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentType   = 'incoming' | 'outgoing';
type PaymentMethod = 'bank_transfer' | 'bank' | 'cash' | 'cheque' | 'mobile_money' | 'card';

interface Payment {
  id: string;
  user_id: string;
  payment_number: string;
  reference: string | null;
  type: PaymentType;
  party: string;
  party_type: 'customer' | 'vendor';
  date: string;
  amount: number;
  method: PaymentMethod;
  status: string;
  invoice_id: string | null;
  bill_id: string | null;
  invoice_number: string | null;
  bill_number: string | null;
  notes: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  number: string;
  customer: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
}

interface Bill {
  id: string;
  number: string;
  vendor: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
}

interface PaymentForm {
  payment_type: 'invoice' | 'bill';
  invoice_id: string;
  bill_id: string;
  party: string;
  amount: string;
  date: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  bank:          'Bank Transfer',
  cash:          'Cash',
  cheque:        'Cheque',
  mobile_money:  'Mobile Money',
  card:          'Card',
};

const TYPE_BADGE: Record<PaymentType, 'success' | 'destructive'> = {
  incoming: 'success',
  outgoing: 'destructive',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_FORM: PaymentForm = {
  payment_type: 'invoice',
  invoice_id:   '',
  bill_id:      '',
  party:        '',
  amount:       '',
  date:         todayStr(),
  method:       'bank_transfer',
  reference:    '',
  notes:        '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Payments() {
  const { user } = useAuth();

  // Payments list
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filters
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  // Record payment modal
  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]             = useState<PaymentForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  // Invoices / bills for picker
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [bills, setBills]           = useState<Bill[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);

  // View detail modal
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting]     = useState(false);

  // ── Fetch payments ──────────────────────────────────────────────────────────

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from('myerp_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load payments.');
    } else {
      setPayments((data ?? []) as Payment[]);
    }
    setLoadingList(false);
  }, [user]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Fetch invoices / bills when modal opens ──────────────────────────────────

  useEffect(() => {
    if (!modalOpen || !user) return;
    setLoadingPicker(true);
    Promise.all([
      supabase
        .from('myerp_invoices')
        .select('id, number, customer, due_date, amount, paid_amount, status')
        .eq('user_id', user.id)
        .in('status', ['sent', 'partially_paid', 'overdue']),
      supabase
        .from('myerp_bills')
        .select('id, number, vendor, due_date, amount, paid_amount, status')
        .eq('user_id', user.id)
        .in('status', ['received', 'approved', 'partially_paid', 'overdue']),
    ]).then(([invRes, billRes]) => {
      setInvoices((invRes.data ?? []) as Invoice[]);
      setBills((billRes.data ?? []) as Bill[]);
      setLoadingPicker(false);
    });
  }, [modalOpen, user]);

  // ── KPI calculations ────────────────────────────────────────────────────────

  const thisMonth = todayStr().slice(0, 7); // "YYYY-MM"
  const totalIn  = payments.filter(p => p.type === 'incoming').reduce((s, p) => s + p.amount, 0);
  const totalOut = payments.filter(p => p.type === 'outgoing').reduce((s, p) => s + p.amount, 0);
  const net      = totalIn - totalOut;
  const countThisMonth = payments.filter(p => p.date?.startsWith(thisMonth)).length;

  // ── Filtered rows ───────────────────────────────────────────────────────────

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      (p.reference ?? '').toLowerCase().includes(q) ||
      p.party.toLowerCase().includes(q) ||
      (p.payment_number ?? '').toLowerCase().includes(q);
    const matchType   = typeFilter === 'all' || p.type === typeFilter;
    const matchMethod = methodFilter === 'all' || p.method === methodFilter ||
      (methodFilter === 'bank_transfer' && p.method === 'bank');
    const matchFrom   = !dateFrom || p.date >= dateFrom;
    const matchTo     = !dateTo   || p.date <= dateTo;
    return matchSearch && matchType && matchMethod && matchFrom && matchTo;
  });

  // ── Selected invoice / bill balance ─────────────────────────────────────────

  const selectedInvoice = invoices.find(i => i.id === form.invoice_id) ?? null;
  const selectedBill    = bills.find(b => b.id === form.bill_id) ?? null;
  const maxAmount = form.payment_type === 'invoice'
    ? selectedInvoice ? selectedInvoice.amount - (selectedInvoice.paid_amount ?? 0) : undefined
    : selectedBill    ? selectedBill.amount    - (selectedBill.paid_amount    ?? 0) : undefined;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function openRecord() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function handleInvoiceSelect(id: string) {
    const inv = invoices.find(i => i.id === id);
    setForm(f => ({
      ...f,
      invoice_id: id,
      party: inv?.customer ?? '',
      amount: inv ? String(Math.max(0, inv.amount - (inv.paid_amount ?? 0))) : '',
    }));
  }

  function handleBillSelect(id: string) {
    const bill = bills.find(b => b.id === id);
    setForm(f => ({
      ...f,
      bill_id: id,
      party: bill?.vendor ?? '',
      amount: bill ? String(Math.max(0, bill.amount - (bill.paid_amount ?? 0))) : '',
    }));
  }

  // ── Save payment ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return;

    if (form.payment_type === 'invoice' && !form.invoice_id) {
      toast.error('Please select an invoice.');
      return;
    }
    if (form.payment_type === 'bill' && !form.bill_id) {
      toast.error('Please select a bill.');
      return;
    }
    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (maxAmount !== undefined && parsedAmount > maxAmount + 0.001) {
      toast.error(`Amount exceeds outstanding balance of ${formatCurrency(maxAmount)}.`);
      return;
    }
    if (!form.date) {
      toast.error('Please select a payment date.');
      return;
    }

    setSaving(true);
    try {
      const isInvoice = form.payment_type === 'invoice';
      const docId     = isInvoice ? form.invoice_id : form.bill_id;
      const docNumber = isInvoice
        ? selectedInvoice?.number ?? null
        : selectedBill?.number ?? null;

      // Generate payment number
      const paymentNumber = `PMT-${Date.now().toString().slice(-6)}`;

      // 1. Insert payment
      const { error: insertErr } = await supabase
        .from('myerp_payments')
        .insert({
          user_id:        user.id,
          payment_number: paymentNumber,
          reference:      form.reference || null,
          type:           isInvoice ? 'incoming' : 'outgoing',
          party:          form.party,
          party_type:     isInvoice ? 'customer' : 'vendor',
          date:           form.date,
          amount:         parsedAmount,
          method:         form.method,
          status:         'cleared',
          invoice_id:     isInvoice ? docId : null,
          bill_id:        isInvoice ? null : docId,
          invoice_number: isInvoice ? docNumber : null,
          bill_number:    isInvoice ? null : docNumber,
          notes:          form.notes || null,
        });

      if (insertErr) throw insertErr;

      // 2. Update invoice / bill paid_amount and status
      if (isInvoice && selectedInvoice) {
        const newPaid   = (selectedInvoice.paid_amount ?? 0) + parsedAmount;
        const remaining = selectedInvoice.amount - newPaid;
        const newStatus = remaining <= 0.001
          ? 'paid'
          : newPaid > 0
          ? 'partially_paid'
          : selectedInvoice.status;

        const { error: updateErr } = await supabase
          .from('myerp_invoices')
          .update({ paid_amount: newPaid, status: newStatus })
          .eq('id', selectedInvoice.id);
        if (updateErr) throw updateErr;
      } else if (!isInvoice && selectedBill) {
        const newPaid   = (selectedBill.paid_amount ?? 0) + parsedAmount;
        const remaining = selectedBill.amount - newPaid;
        const newStatus = remaining <= 0.001
          ? 'paid'
          : newPaid > 0
          ? 'partially_paid'
          : selectedBill.status;

        const { error: updateErr } = await supabase
          .from('myerp_bills')
          .update({ paid_amount: newPaid, status: newStatus })
          .eq('id', selectedBill.id);
        if (updateErr) throw updateErr;
      }

      toast.success('Payment recorded successfully.');
      setModalOpen(false);
      await fetchPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred.';
      toast.error(`Failed to record payment: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete payment ───────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('myerp_payments')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Payment deleted.');
      setPayments(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred.';
      toast.error(`Failed to delete payment: ${msg}`);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Payments">
      <PageHeader
        title="Payments"
        subtitle="Record and reconcile incoming and outgoing payments."
        action={{ label: 'Record Payment', onClick: openRecord }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total In</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-success">{formatCurrency(totalIn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Out</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOut)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{countThisMonth} payment{countThisMonth !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        <Input
          placeholder="Search reference or party…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="sm:max-w-[150px]">
          <option value="all">All Types</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </Select>
        <Select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="sm:max-w-[160px]">
          <option value="all">All Methods</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="card">Card</option>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="sm:max-w-[160px]"
          title="Date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="sm:max-w-[160px]"
          title="Date to"
        />
        {(search || typeFilter !== 'all' || methodFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearch(''); setTypeFilter('all'); setMethodFilter('all'); setDateFrom(''); setDateTo(''); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loadingList ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Invoice / Bill #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No payments match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(pmt => (
                    <TableRow key={pmt.id}>
                      <TableCell className="font-medium">{pmt.payment_number}</TableCell>
                      <TableCell>{formatDate(pmt.date)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{pmt.party}</span>
                        <span className="block text-xs text-muted-foreground capitalize">{pmt.party_type}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={TYPE_BADGE[pmt.type]} className="capitalize">{pmt.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pmt.invoice_number ?? pmt.bill_number ?? <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(pmt.amount)}
                      </TableCell>
                      <TableCell>{METHOD_LABEL[pmt.method] ?? pmt.method}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => setViewPayment(pmt)}
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(pmt)}
                            title="Delete payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Record Payment Modal ─────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Record Payment"
        description="Apply a payment against an invoice or bill."
        size="md"
        footer={{
          confirmLabel:    saving ? 'Saving…' : 'Record Payment',
          cancelLabel:     'Cancel',
          onConfirm:       handleSave,
          isLoading:       saving,
          confirmDisabled: saving,
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Payment type toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>Payment Type *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...EMPTY_FORM, date: f.date, method: f.method, payment_type: 'invoice' }))}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  form.payment_type === 'invoice'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Invoice Payment (Incoming)
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...EMPTY_FORM, date: f.date, method: f.method, payment_type: 'bill' }))}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  form.payment_type === 'bill'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Bill Payment (Outgoing)
              </button>
            </div>
          </div>

          {/* Invoice or Bill picker */}
          {form.payment_type === 'invoice' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm-invoice">Invoice *</Label>
              {loadingPicker ? (
                <div className="h-9 rounded-md border border-border flex items-center px-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Select
                  id="pm-invoice"
                  value={form.invoice_id}
                  onChange={e => handleInvoiceSelect(e.target.value)}
                >
                  <option value="">Select invoice…</option>
                  {invoices.map(inv => {
                    const balance = inv.amount - (inv.paid_amount ?? 0);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.number} — {inv.customer} — Balance: {formatCurrency(balance)}
                      </option>
                    );
                  })}
                </Select>
              )}
              {invoices.length === 0 && !loadingPicker && (
                <p className="text-xs text-muted-foreground">No outstanding invoices found.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm-bill">Bill *</Label>
              {loadingPicker ? (
                <div className="h-9 rounded-md border border-border flex items-center px-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Select
                  id="pm-bill"
                  value={form.bill_id}
                  onChange={e => handleBillSelect(e.target.value)}
                >
                  <option value="">Select bill…</option>
                  {bills.map(bill => {
                    const balance = bill.amount - (bill.paid_amount ?? 0);
                    return (
                      <option key={bill.id} value={bill.id}>
                        {bill.number} — {bill.vendor} — Balance: {formatCurrency(balance)}
                      </option>
                    );
                  })}
                </Select>
              )}
              {bills.length === 0 && !loadingPicker && (
                <p className="text-xs text-muted-foreground">No outstanding bills found.</p>
              )}
            </div>
          )}

          {/* Party (auto-filled, read-only) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-party">{form.payment_type === 'invoice' ? 'Customer' : 'Vendor'}</Label>
            <Input
              id="pm-party"
              value={form.party}
              readOnly
              placeholder="Auto-filled from selection"
              className="bg-muted/40 cursor-default"
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-amount">
              Amount *
              {maxAmount !== undefined && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (max: {formatCurrency(maxAmount)})
                </span>
              )}
            </Label>
            <Input
              id="pm-amount"
              type="number"
              min="0.01"
              step="0.01"
              max={maxAmount}
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-date">Payment Date *</Label>
            <Input
              id="pm-date"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          {/* Method */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-method">Payment Method *</Label>
            <Select
              id="pm-method"
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
            </Select>
          </div>

          {/* Reference */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-ref">Reference</Label>
            <Input
              id="pm-ref"
              placeholder="e.g. TXN-12345"
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-notes">Notes</Label>
            <Textarea
              id="pm-notes"
              placeholder="Optional notes…"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── View Payment Modal ───────────────────────────────────────────────── */}
      {viewPayment && (
        <Modal
          open={!!viewPayment}
          onClose={() => setViewPayment(null)}
          title="Payment Details"
          description={`Payment ${viewPayment.payment_number}`}
          size="sm"
          footer={{ cancelLabel: 'Close' }}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Payment #</dt>
              <dd className="font-medium">{viewPayment.payment_number}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Type</dt>
              <dd>
                <Badge variant={TYPE_BADGE[viewPayment.type]} className="capitalize">{viewPayment.type}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Date</dt>
              <dd>{formatDate(viewPayment.date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Party</dt>
              <dd className="font-medium">{viewPayment.party}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Party Type</dt>
              <dd className="capitalize">{viewPayment.party_type}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Amount</dt>
              <dd className="font-semibold tabular-nums">{formatCurrency(viewPayment.amount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Method</dt>
              <dd>{METHOD_LABEL[viewPayment.method] ?? viewPayment.method}</dd>
            </div>
            {(viewPayment.invoice_number ?? viewPayment.bill_number) && (
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  {viewPayment.invoice_number ? 'Invoice #' : 'Bill #'}
                </dt>
                <dd>{viewPayment.invoice_number ?? viewPayment.bill_number}</dd>
              </div>
            )}
            {viewPayment.reference && (
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Reference</dt>
                <dd>{viewPayment.reference}</dd>
              </div>
            )}
            {viewPayment.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Notes</dt>
                <dd className="text-muted-foreground">{viewPayment.notes}</dd>
              </div>
            )}
          </dl>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal
          open={!!deleteTarget}
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
          title="Delete Payment"
          size="sm"
          footer={{
            confirmLabel:    deleting ? 'Deleting…' : 'Delete',
            confirmVariant:  'destructive',
            onConfirm:       handleDelete,
            isLoading:       deleting,
          }}
        >
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete payment{' '}
            <span className="font-medium text-foreground">{deleteTarget.payment_number}</span>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </AppLayout>
  );
}
