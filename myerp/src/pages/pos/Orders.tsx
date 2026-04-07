import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/mock';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ShoppingCart,
  CheckCircle,
  TrendingUp,
  BarChart2,
  Plus,
  Trash2,
  RotateCcw,
  Ban,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'draft' | 'paid' | 'refunded' | 'voided';
type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'split';

interface PosOrder extends Record<string, unknown> {
  id: string;
  user_id: string;
  order_number: string;
  session_id: string;
  session_number: string;
  cashier: string;
  customer_name: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_method: PaymentMethod;
  amount_tendered: number | null;
  change_amount: number | null;
  status: OrderStatus;
  notes: string | null;
}

interface PosSession extends Record<string, unknown> {
  id: string;
  user_id: string;
  session_number: string;
  cashier: string;
  opening_cash: number;
  closing_cash: number | null;
  total_sales: number;
  total_orders: number;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closing' | 'closed';
  notes: string | null;
}

// ─── Line item (form only) ────────────────────────────────────────────────────

interface LineItem {
  product_name: string;
  product_sku: string;
  qty: string;
  unit_price: string;
  discount_pct: string;
  line_total: number;
}

// ─── Order form state (NOT extending Record) ──────────────────────────────────

interface OrderForm {
  session_id: string;
  session_number: string;
  cashier: string;
  customer_name: string;
  discount_amount: string;
  tax_amount: string;
  payment_method: PaymentMethod;
  amount_tendered: string;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<OrderStatus, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  paid: 'success',
  refunded: 'warning',
  voided: 'destructive',
};

function buildOrderNumber(existing: PosOrder[]): string {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const nums = existing
    .map(o => o.order_number)
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function calcLineTotal(item: LineItem): number {
  const qty = Number(item.qty) || 0;
  const price = Number(item.unit_price) || 0;
  const disc = Number(item.discount_pct) || 0;
  return qty * price * (1 - disc / 100);
}

const emptyLine = (): LineItem => ({
  product_name: '',
  product_sku: '',
  qty: '1',
  unit_price: '',
  discount_pct: '0',
  line_total: 0,
});

const emptyForm: OrderForm = {
  session_id: '',
  session_number: '',
  cashier: '',
  customer_name: '',
  discount_amount: '0',
  tax_amount: '0',
  payment_method: 'cash',
  amount_tendered: '',
  notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Orders() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const { rows: orders, loading, insert, update } = useTable<PosOrder>('myerp_pos_orders', 'created_at', false);
  const { rows: sessions } = useTable<PosSession>('myerp_pos_sessions', 'opened_at', false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // ── Pre-filter from URL param ─────────────────────────────────────────────

  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam) {
      setSessionFilter(sessionParam);
    }
  }, [searchParams]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  // ── Derived line totals ───────────────────────────────────────────────────

  const linesWithTotals = lines.map(l => ({ ...l, line_total: calcLineTotal(l) }));
  const subtotal = linesWithTotals.reduce((s, l) => s + l.line_total, 0);
  const discountAmount = Number(form.discount_amount) || 0;
  const taxAmount = Number(form.tax_amount) || 0;
  const grandTotal = subtotal - discountAmount + taxAmount;
  const tenderedNum = Number(form.amount_tendered) || 0;
  const changeAmount = tenderedNum > 0 ? tenderedNum - grandTotal : 0;

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name ?? '').toLowerCase().includes(q) ||
      o.cashier.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || o.payment_method === paymentFilter;
    const matchSession = sessionFilter === 'all' || o.session_number === sessionFilter;
    return matchSearch && matchStatus && matchPayment && matchSession;
  });

  // ── Open sessions for selector ────────────────────────────────────────────

  const openSessions = sessions.filter(s => s.status === 'open' || s.status === 'closing');

  // ── Line item helpers ─────────────────────────────────────────────────────

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines(prev => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: value };
      updated.line_total = calcLineTotal(updated);
      next[idx] = updated;
      return next;
    });
  }

  function addLine() {
    setLines(prev => [...prev, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Sheet open ────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(emptyForm);
    setLines([emptyLine()]);
    setSheetOpen(true);
  }

  // ── Auto-fill cashier when session selected ───────────────────────────────

  const handleSessionChange = useCallback((sessionId: string) => {
    const sess = sessions.find(s => s.id === sessionId);
    setForm(f => ({
      ...f,
      session_id: sessionId,
      session_number: sess?.session_number ?? '',
      cashier: sess ? (f.cashier || sess.cashier) : f.cashier,
    }));
  }, [sessions]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.session_id) { toast.error('Please select a session'); return; }
    if (!form.cashier.trim()) { toast.error('Cashier is required'); return; }
    if (linesWithTotals.length === 0 || linesWithTotals.every(l => !l.product_name.trim())) {
      toast.error('Add at least one line item'); return;
    }

    setSaving(true);
    try {
      const order_number = buildOrderNumber(orders);

      const newOrder = await insert({
        order_number,
        session_id: form.session_id,
        session_number: form.session_number,
        cashier: form.cashier.trim(),
        customer_name: form.customer_name.trim() || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total: grandTotal,
        payment_method: form.payment_method,
        amount_tendered: ['cash', 'split'].includes(form.payment_method) ? tenderedNum || null : null,
        change_amount: ['cash', 'split'].includes(form.payment_method) ? changeAmount : null,
        status: 'paid',
        notes: form.notes.trim() || null,
      });

      // Insert order lines
      if (user && newOrder) {
        const lineRows = linesWithTotals
          .filter(l => l.product_name.trim())
          .map(l => ({
            user_id: user.id,
            order_id: newOrder.id,
            order_number,
            product_name: l.product_name.trim(),
            product_sku: l.product_sku.trim() || null,
            qty: Number(l.qty) || 1,
            unit_price: Number(l.unit_price) || 0,
            discount_pct: Number(l.discount_pct) || 0,
            line_total: l.line_total,
          }));

        if (lineRows.length > 0) {
          const { error: linesErr } = await supabase
            .from('myerp_pos_order_lines')
            .insert(lineRows);
          if (linesErr) console.error('Order lines insert error:', linesErr.message);
        }

        // Update session totals
        const sess = sessions.find(s => s.id === form.session_id);
        if (sess) {
          await supabase
            .from('myerp_pos_sessions')
            .update({
              total_sales: (sess.total_sales ?? 0) + grandTotal,
              total_orders: (sess.total_orders ?? 0) + 1,
            })
            .eq('id', form.session_id);
        }
      }

      toast.success(`Order ${order_number} saved`);
      setSheetOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  }

  // ── Status actions ────────────────────────────────────────────────────────

  async function handleRefund(id: string) {
    try {
      await update(id, { status: 'refunded' });
      toast.success('Order refunded');
    } catch {
      toast.error('Failed to refund order');
    }
  }

  async function handleVoid(id: string) {
    try {
      await update(id, { status: 'voided' });
      toast.success('Order voided');
    } catch {
      toast.error('Failed to void order');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="POS Orders">
      <PageHeader
        title="POS Orders"
        subtitle="View and manage all point-of-sale orders."
        action={{ label: 'New Order', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{orders.length}</span>
              <ShoppingCart className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{paidOrders.length}</span>
              <CheckCircle className="w-4 h-4 text-success mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</span>
              <BarChart2 className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          className="flex-1 min-w-48"
          placeholder="Search by order #, customer, or cashier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">All Payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="split">Split</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="voided">Voided</option>
        </Select>
        <Select
          value={sessionFilter}
          onChange={e => setSessionFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">All Sessions</option>
          {sessions.map(s => (
            <option key={s.id} value={s.session_number}>
              {s.session_number}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading orders…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Tendered</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-10">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm font-medium">{o.order_number}</TableCell>
                      <TableCell className="text-sm font-mono">{o.session_number}</TableCell>
                      <TableCell>{o.cashier}</TableCell>
                      <TableCell>{o.customer_name ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(o.subtotal)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        {o.discount_amount > 0 ? `-${formatCurrency(o.discount_amount)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">{o.tax_amount > 0 ? formatCurrency(o.tax_amount) : '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(o.total)}</TableCell>
                      <TableCell>
                        <span className="capitalize text-sm">{o.payment_method.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {o.amount_tendered != null ? formatCurrency(o.amount_tendered) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {o.change_amount != null ? formatCurrency(o.change_amount) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[o.status]} className="capitalize">
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {o.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-warning hover:text-warning"
                              onClick={() => handleRefund(o.id)}
                              title="Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {o.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleVoid(o.id)}
                              title="Void"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── New Order Sheet ────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>New POS Order</SheetTitle>
          </SheetHeader>

          {/* Header section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Session <span className="text-destructive">*</span></Label>
              <Select
                value={form.session_id}
                onChange={e => handleSessionChange(e.target.value)}
              >
                <option value="">Select session…</option>
                {openSessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.session_number} — {s.cashier}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cashier <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Cashier name"
                value={form.cashier}
                onChange={e => setForm(f => ({ ...f, cashier: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Customer Name</Label>
              <Input
                placeholder="Walk-in customer (optional)"
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              />
            </div>
          </div>

          <Separator className="my-4" />

          {/* Line items */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Line Items</span>
              <Button size="sm" variant="outline" onClick={addLine} className="h-7 px-2 text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </Button>
            </div>

            <div className="space-y-2">
              {/* Column headers */}
              <div className={cn(
                'hidden sm:grid gap-2 px-1',
                'grid-cols-[1fr_100px_80px_90px_70px_90px_32px]',
              )}>
                {['Product', 'SKU', 'Qty', 'Unit Price', 'Disc %', 'Line Total', ''].map(h => (
                  <span key={h} className="text-xs text-muted-foreground font-medium">{h}</span>
                ))}
              </div>

              {linesWithTotals.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'grid gap-2 items-center',
                    'grid-cols-2 sm:grid-cols-[1fr_100px_80px_90px_70px_90px_32px]',
                  )}
                >
                  <Input
                    placeholder="Product name"
                    value={line.product_name}
                    onChange={e => updateLine(idx, 'product_name', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="SKU"
                    value={line.product_sku}
                    onChange={e => updateLine(idx, 'product_sku', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={line.qty}
                    onChange={e => updateLine(idx, 'qty', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={line.unit_price}
                    onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={line.discount_pct}
                    onChange={e => updateLine(idx, 'discount_pct', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="h-8 px-3 rounded-md border border-input bg-muted/40 text-sm flex items-center justify-end text-muted-foreground">
                    {formatCurrency(line.line_total)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeLine(idx)}
                    disabled={linesWithTotals.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Discount Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.discount_amount}
                onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tax Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.tax_amount}
                onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))}
              />
            </div>
          </div>

          {/* Totals display */}
          <div className="rounded-lg border bg-muted/30 p-4 mb-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className={cn(discountAmount > 0 && 'text-destructive')}>
                {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{taxAmount > 0 ? formatCurrency(taxAmount) : '—'}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Payment Method <span className="text-destructive">*</span></Label>
              <Select
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="split">Split</option>
              </Select>
            </div>

            {(form.payment_method === 'cash' || form.payment_method === 'split') && (
              <>
                <div className="space-y-1.5">
                  <Label>Amount Tendered</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount_tendered}
                    onChange={e => setForm(f => ({ ...f, amount_tendered: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-start-2">
                  <Label>Change</Label>
                  <div className={cn(
                    'h-9 px-3 py-1 rounded-md border border-input bg-muted/40 text-sm flex items-center justify-end font-medium',
                    changeAmount < 0 && 'text-destructive',
                  )}>
                    {form.amount_tendered ? formatCurrency(changeAmount) : '—'}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5 mb-4">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional order notes…"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save Order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
