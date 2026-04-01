import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { formatCurrency, formatDate, today } from '@/lib/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Pencil, Trash2, CreditCard, FileText, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

interface Invoice {
  id: string;
  user_id: string;
  number: string;
  customer: string;
  issue_date: string;
  due_date: string;
  amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  terms: string | null;
  notes: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
}

type PaymentMethod = 'bank_transfer' | 'cash' | 'cheque' | 'mobile_money' | 'card';

interface PaymentForm {
  amount: string;
  date: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<InvoiceStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  draft:           'secondary',
  sent:            'info',
  partially_paid:  'warning',
  paid:            'success',
  overdue:         'destructive',
  cancelled:       'outline',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft:           'Draft',
  sent:            'Sent',
  partially_paid:  'Partially Paid',
  paid:            'Paid',
  overdue:         'Overdue',
  cancelled:       'Cancelled',
};

const EMPTY_PAYMENT: PaymentForm = {
  amount:    '',
  date:      today(),
  method:    'bank_transfer',
  reference: '',
  notes:     '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEffectivelyOverdue(inv: Invoice): boolean {
  if (inv.status === 'overdue') return true;
  if (inv.status === 'sent' && inv.due_date && inv.due_date < today()) return true;
  return false;
}

function getDisplayStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === 'sent' && inv.due_date && inv.due_date < today()) return 'overdue';
  return inv.status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Invoices() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [invoices,       setInvoices]       = useState<Invoice[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');

  // Delete confirm
  const [deleteTarget,   setDeleteTarget]   = useState<Invoice | null>(null);
  const [deleting,       setDeleting]       = useState(false);

  // Payment modal
  const [payTarget,      setPayTarget]      = useState<Invoice | null>(null);
  const [payForm,        setPayForm]        = useState<PaymentForm>(EMPTY_PAYMENT);
  const [paymentSaving,  setPaymentSaving]  = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('myerp_invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load invoices.');
    } else {
      setInvoices((data ?? []) as Invoice[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const totalInvoiced  = invoices.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalPaid      = invoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0);
  const outstandingAR  = invoices
    .filter(i => i.status === 'sent' || i.status === 'partially_paid' || i.status === 'overdue' ||
                 (i.status === 'sent' && i.due_date < today()))
    .reduce((s, i) => s + Math.max(0, (i.amount ?? 0) - (i.paid_amount ?? 0)), 0);
  const overdueCount   = invoices.filter(i => isEffectivelyOverdue(i)).length;

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      inv.number.toLowerCase().includes(q) ||
      inv.customer.toLowerCase().includes(q);

    const displayStatus = getDisplayStatus(inv);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'overdue' ? displayStatus === 'overdue' : inv.status === statusFilter);

    const matchFrom = !dateFrom || inv.issue_date >= dateFrom;
    const matchTo   = !dateTo   || inv.issue_date <= dateTo;

    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('myerp_invoices')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete invoice.');
    } else {
      toast.success(`Invoice ${deleteTarget.number} deleted.`);
      setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
    setDeleting(false);
  }

  // ── Record Payment ───────────────────────────────────────────────────────

  function openPayModal(inv: Invoice) {
    const balance = Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0));
    setPayTarget(inv);
    setPayForm({ ...EMPTY_PAYMENT, amount: balance.toFixed(2), date: today() });
  }

  async function handleRecordPayment() {
    if (!payTarget || !user) return;

    const payAmount = parseFloat(payForm.amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    const balance = Math.max(0, (payTarget.amount ?? 0) - (payTarget.paid_amount ?? 0));
    if (payAmount > balance + 0.001) {
      toast.error(`Amount cannot exceed the outstanding balance of ${formatCurrency(balance)}.`);
      return;
    }
    if (!payForm.date) {
      toast.error('Payment date is required.');
      return;
    }

    setPaymentSaving(true);
    try {
      const paymentNumber = `PMT-${Date.now()}`;
      const { error: pmtErr } = await supabase.from('myerp_payments').insert({
        payment_number: paymentNumber,
        user_id:        user.id,
        reference:      payForm.reference || 'PMT',
        type:           'incoming',
        party:          payTarget.customer,
        party_type:     'customer',
        date:           payForm.date,
        amount:         payAmount,
        method:         payForm.method,
        invoice_id:     payTarget.id,
        invoice_number: payTarget.number,
        notes:          payForm.notes || null,
      });
      if (pmtErr) throw pmtErr;

      const newPaidAmount = (payTarget.paid_amount ?? 0) + payAmount;
      const newStatus: InvoiceStatus =
        newPaidAmount >= (payTarget.amount ?? 0) - 0.001 ? 'paid' : 'partially_paid';

      const { error: invErr } = await supabase
        .from('myerp_invoices')
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq('id', payTarget.id);
      if (invErr) throw invErr;

      setInvoices(prev =>
        prev.map(i =>
          i.id === payTarget.id
            ? { ...i, paid_amount: newPaidAmount, status: newStatus }
            : i,
        ),
      );
      toast.success(`Payment of ${formatCurrency(payAmount)} recorded for ${payTarget.number}.`);
      setPayTarget(null);
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to record payment.');
    } finally {
      setPaymentSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Invoices">
      <PageHeader
        title="Invoices"
        subtitle="Create, send, and track customer invoices."
        action={{ label: 'New Invoice', onClick: () => navigate('/finance/invoices/new') }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalInvoiced)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Outstanding AR
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(outstandingAR)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-destructive">
              {overdueCount} invoice{overdueCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        <Input
          placeholder="Search invoice # or customer…"
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
          <option value="sent">Sent</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="sm:max-w-[160px]"
          title="Date From"
          placeholder="Date From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="sm:max-w-[160px]"
          title="Date To"
          placeholder="Date To"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">No invoices match your filters.</p>
              {(search || statusFilter !== 'all' || dateFrom || dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => {
                  const displayStatus = getDisplayStatus(inv);
                  const isOverdue     = displayStatus === 'overdue';
                  const balance       = Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0));
                  const canDelete     = inv.status === 'draft';
                  const canPay        = inv.status === 'sent' || inv.status === 'partially_paid' || inv.status === 'overdue' ||
                                        (inv.status === 'sent' && inv.due_date < today());

                  return (
                    <TableRow
                      key={inv.id}
                      className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : undefined}
                    >
                      <TableCell className="font-medium font-mono text-xs">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => navigate(`/finance/invoices/${inv.id}`)}
                        >
                          {inv.number}
                        </button>
                      </TableCell>
                      <TableCell>{inv.customer}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(inv.issue_date)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <span className={isOverdue ? 'text-destructive font-medium' : undefined}>
                          {formatDate(inv.due_date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(inv.amount ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">
                        {formatCurrency(inv.paid_amount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[displayStatus]}>
                          {STATUS_LABEL[displayStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canPay && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => openPayModal(inv)}
                              title="Record Payment"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => navigate(`/finance/invoices/${inv.id}`)}
                            title="Edit invoice"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(inv)}
                              title="Delete invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Invoice"
        description={deleteTarget ? `This will permanently delete invoice ${deleteTarget.number}.` : undefined}
        size="sm"
        footer={{
          confirmLabel:    'Delete',
          confirmVariant:  'destructive',
          onConfirm:       confirmDelete,
          isLoading:       deleting,
          cancelLabel:     'Cancel',
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{deleteTarget?.number}</span>
            {deleteTarget?.customer ? ` for ${deleteTarget.customer}` : ''}?
            This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* ── Record Payment Modal ── */}
      <Modal
        open={!!payTarget}
        onClose={() => { if (!paymentSaving) setPayTarget(null); }}
        title="Record Payment"
        description={payTarget ? `Invoice ${payTarget.number} — ${payTarget.customer}` : undefined}
        size="md"
        footer={{
          confirmLabel:   'Record Payment',
          onConfirm:      handleRecordPayment,
          isLoading:      paymentSaving,
          cancelLabel:    'Cancel',
        }}
      >
        {payTarget && (
          <div className="flex flex-col gap-4">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 px-4 py-3 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Invoice Total</p>
                <p className="font-semibold tabular-nums">{formatCurrency(payTarget.amount ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Already Paid</p>
                <p className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                  {formatCurrency(payTarget.paid_amount ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Balance Due</p>
                <p className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(Math.max(0, (payTarget.amount ?? 0) - (payTarget.paid_amount ?? 0)))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-amount">Amount *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Math.max(0, (payTarget.amount ?? 0) - (payTarget.paid_amount ?? 0))}
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="tabular-nums"
                />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-date">Payment Date *</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payForm.date}
                  onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Method */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-method">Payment Method</Label>
                <Select
                  id="pay-method"
                  value={payForm.method}
                  onChange={e => setPayForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
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
                <Label htmlFor="pay-reference">Reference</Label>
                <Input
                  id="pay-reference"
                  value={payForm.reference}
                  onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="e.g. TXN-12345"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea
                id="pay-notes"
                rows={2}
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes…"
              />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
