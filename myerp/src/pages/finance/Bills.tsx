import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Modal, ConfirmModal } from '@/components/erp/Modal';
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
import { Pencil, Trash2, CreditCard, Receipt, DollarSign, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = 'draft' | 'received' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
type PaymentMethod = 'bank_transfer' | 'cash' | 'cheque' | 'mobile_money' | 'card';

interface Bill {
  id: string;
  user_id: string;
  number: string;
  vendor: string;
  bill_date: string;
  due_date: string;
  amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  paid_amount: number;
  status: BillStatus;
  terms: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentForm {
  amount: string;
  date: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

const EMPTY_PAYMENT: PaymentForm = {
  amount: '',
  date: today(),
  method: 'bank_transfer',
  reference: '',
  notes: '',
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<BillStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  draft:           'secondary',
  received:        'info',
  approved:        'warning',
  partially_paid:  'warning',
  paid:            'success',
  overdue:         'destructive',
  cancelled:       'outline',
};

const STATUS_LABEL: Record<BillStatus, string> = {
  draft:           'Draft',
  received:        'Received',
  approved:        'Approved',
  partially_paid:  'Partially Paid',
  paid:            'Paid',
  overdue:         'Overdue',
  cancelled:       'Cancelled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYABLE_STATUSES: BillStatus[] = ['received', 'approved', 'partially_paid', 'overdue'];
const PAYMENT_ELIGIBLE: BillStatus[] = ['received', 'approved', 'partially_paid', 'overdue'];

function canDelete(status: BillStatus) {
  return status === 'draft';
}

function canPay(status: BillStatus) {
  return PAYMENT_ELIGIBLE.includes(status);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Bills() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Record payment modal
  const [payTarget, setPayTarget] = useState<Bill | null>(null);
  const [payForm, setPayForm] = useState<PaymentForm>(EMPTY_PAYMENT);
  const [paying, setPaying] = useState(false);

  // ── Load bills ────────────────────────────────────────────────────────────

  const loadBills = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('myerp_bills')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load bills.');
    } else {
      setBills((data ?? []) as Bill[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadBills(); }, [loadBills]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalBills    = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid     = bills.reduce((s, b) => s + b.paid_amount, 0);
  const outstandingAP = bills
    .filter(b => PAYABLE_STATUSES.includes(b.status))
    .reduce((s, b) => s + (b.amount - b.paid_amount), 0);
  const overdueCount  = bills.filter(b => b.status === 'overdue').length;

  // ── Filtered rows ─────────────────────────────────────────────────────────

  const filtered = bills.filter(b => {
    const search = vendorSearch.toLowerCase();
    const matchSearch =
      b.vendor.toLowerCase().includes(search) ||
      b.number.toLowerCase().includes(search);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchFrom   = !dateFrom || b.bill_date >= dateFrom;
    const matchTo     = !dateTo   || b.bill_date <= dateTo;
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  // ── Delete bill ───────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('myerp_bills')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete bill.');
    } else {
      toast.success(`Bill ${deleteTarget.number} deleted.`);
      setBills(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  }

  // ── Record Payment ────────────────────────────────────────────────────────

  function openPayModal(bill: Bill) {
    const balance = bill.amount - bill.paid_amount;
    setPayTarget(bill);
    setPayForm({ ...EMPTY_PAYMENT, amount: balance.toFixed(2) });
  }

  async function handleRecordPayment() {
    if (!payTarget || !user) return;

    const amt = parseFloat(payForm.amount);
    const balance = payTarget.amount - payTarget.paid_amount;

    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    if (amt > balance + 0.001) {
      toast.error(`Amount exceeds balance of ${formatCurrency(balance)}.`);
      return;
    }
    if (!payForm.date) {
      toast.error('Payment date is required.');
      return;
    }

    setPaying(true);
    try {
      const paymentNumber = `PMT-${Date.now()}`;
      const newPaid = payTarget.paid_amount + amt;
      const newStatus: BillStatus = newPaid >= payTarget.amount - 0.001 ? 'paid' : 'partially_paid';

      // 1. Insert payment record
      const { error: payErr } = await supabase
        .from('myerp_payments')
        .insert({
          payment_number: paymentNumber,
          user_id:        user.id,
          reference:      payForm.reference || null,
          type:           'outgoing',
          party:          payTarget.vendor,
          party_type:     'vendor',
          date:           payForm.date,
          amount:         amt,
          method:         payForm.method,
          bill_id:        payTarget.id,
          bill_number:    payTarget.number,
          notes:          payForm.notes || null,
        });
      if (payErr) throw payErr;

      // 2. Update bill paid_amount and status
      const { error: billErr } = await supabase
        .from('myerp_bills')
        .update({ paid_amount: newPaid, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', payTarget.id);
      if (billErr) throw billErr;

      // 3. Update local state
      setBills(prev =>
        prev.map(b =>
          b.id === payTarget.id
            ? { ...b, paid_amount: newPaid, status: newStatus }
            : b,
        ),
      );

      toast.success(`Payment ${paymentNumber} recorded successfully.`);
      setPayTarget(null);
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Bills">
      <PageHeader
        title="Bills"
        subtitle="Manage vendor bills, track payables, and record payments."
        action={{ label: 'New Bill', onClick: () => navigate('/finance/bills/new') }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalBills)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{bills.length} bill{bills.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Outstanding AP
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-warning">{formatCurrency(outstandingAP)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-destructive">{overdueCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">bill{overdueCount !== 1 ? 's' : ''} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        <Input
          placeholder="Search vendor or bill #…"
          value={vendorSearch}
          onChange={e => setVendorSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="sm:max-w-[180px]"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="received">Received</option>
          <option value="approved">Approved</option>
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
          title="Bill date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="sm:max-w-[160px]"
          title="Bill date to"
        />
        {(vendorSearch || statusFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setVendorSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
            className="h-9"
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
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                        No bills match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(bill => {
                      const balance = bill.amount - bill.paid_amount;
                      const isOverdue = bill.status === 'overdue';
                      return (
                        <TableRow
                          key={bill.id}
                          className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : undefined}
                        >
                          <TableCell className="font-medium font-mono text-sm">{bill.number}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{bill.vendor}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(bill.bill_date)}</TableCell>
                          <TableCell className={`whitespace-nowrap ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                            {formatDate(bill.due_date)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatCurrency(bill.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatCurrency(bill.paid_amount)}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${balance > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[bill.status]}>
                              {STATUS_LABEL[bill.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => navigate(`/finance/bills/${bill.id}`)}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>

                              {/* Record Payment */}
                              {canPay(bill.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1 text-success border-success/40 hover:bg-success/10"
                                  onClick={() => openPayModal(bill)}
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Pay
                                </Button>
                              )}

                              {/* Delete (draft only) */}
                              {canDelete(bill.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(bill)}
                                  title="Delete draft bill"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Bill"
        message={`Are you sure you want to delete bill ${deleteTarget?.number}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleting}
      />

      {/* Record Payment Modal */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Record Payment"
        description={payTarget ? `${payTarget.number} · ${payTarget.vendor} · Balance: ${formatCurrency(payTarget.amount - payTarget.paid_amount)}` : undefined}
        size="md"
        footer={{
          cancelLabel: 'Cancel',
          confirmLabel: paying ? 'Saving…' : 'Record Payment',
          onConfirm: handleRecordPayment,
          isLoading: paying,
          confirmDisabled: paying,
        }}
      >
        {payTarget && (
          <div className="flex flex-col gap-4">
            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-amount">
                Amount *{' '}
                <span className="text-muted-foreground font-normal">
                  (max {formatCurrency(payTarget.amount - payTarget.paid_amount)})
                </span>
              </Label>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                max={payTarget.amount - payTarget.paid_amount}
                step="0.01"
                placeholder="0.00"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
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
              <Label htmlFor="pay-ref">Reference / Transaction ID</Label>
              <Input
                id="pay-ref"
                placeholder="e.g. TXN-12345"
                value={payForm.reference}
                onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea
                id="pay-notes"
                placeholder="Optional payment notes…"
                rows={2}
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
