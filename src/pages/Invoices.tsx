import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Plus, Search, Download, Send, Eye, Trash2, FileText,
  ChevronDown, Calendar, DollarSign, CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

// ─── Demo Data ─────────────────────────────────────────────────────────────

const demoInvoices = [
  { id: '1', invoice_number: 'INV-0001', customer_name: 'Acme Corp', issue_date: '2026-03-01', due_date: '2026-03-31', status: 'paid', total_amount: 12400, subtotal: 11636, tax_amount: 764, tax_rate: 6.5 },
  { id: '2', invoice_number: 'INV-0002', customer_name: 'Wayne Industries', issue_date: '2026-03-05', due_date: '2026-04-04', status: 'sent', total_amount: 8900, subtotal: 8356, tax_amount: 544, tax_rate: 6.5 },
  { id: '3', invoice_number: 'INV-0003', customer_name: 'Daily Planet', issue_date: '2026-02-15', due_date: '2026-03-15', status: 'overdue', total_amount: 3200, subtotal: 3004, tax_amount: 196, tax_rate: 6.5 },
  { id: '4', invoice_number: 'INV-0004', customer_name: 'Stark Industries', issue_date: '2026-03-20', due_date: '2026-04-19', status: 'draft', total_amount: 45000, subtotal: 42254, tax_amount: 2746, tax_rate: 6.5 },
  { id: '5', invoice_number: 'INV-0005', customer_name: 'Red Room Inc', issue_date: '2026-03-10', due_date: '2026-04-09', status: 'sent', total_amount: 7800, subtotal: 7324, tax_amount: 476, tax_rate: 6.5 },
  { id: '6', invoice_number: 'INV-0006', customer_name: 'Wayne Industries', issue_date: '2026-03-22', due_date: '2026-04-21', status: 'paid', total_amount: 15600, subtotal: 14648, tax_amount: 952, tax_rate: 6.5 },
];

const demoCustomers = ['Acme Corp', 'Wayne Industries', 'Daily Planet', 'Stark Industries', 'Red Room Inc', 'Daily Bugle'];

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string; icon: any }> = {
    draft: { label: 'Draft', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
    sent: { label: 'Sent', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: Send },
    paid: { label: 'Paid', class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
    overdue: { label: 'Overdue', class: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400', icon: AlertTriangle },
    cancelled: { label: 'Cancelled', class: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: FileText },
  };
  const s = map[status] || map.draft;
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.class)}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ─── Line Item Row ─────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}

function LineItemRow({ item, index, onChange, onRemove }: {
  item: LineItem;
  index: number;
  onChange: (i: number, field: keyof LineItem, value: string | number) => void;
  onRemove: (i: number) => void;
}) {
  const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
  return (
    <tr className="border-b border-border">
      <td className="py-2 pr-2">
        <Input
          value={item.description}
          onChange={e => onChange(index, 'description', e.target.value)}
          placeholder="Item description"
          className="h-8 text-sm"
        />
      </td>
      <td className="py-2 px-2 w-20">
        <Input
          type="number"
          value={item.quantity}
          onChange={e => onChange(index, 'quantity', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm text-center"
        />
      </td>
      <td className="py-2 px-2 w-28">
        <Input
          type="number"
          value={item.unit_price}
          onChange={e => onChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm text-right"
        />
      </td>
      <td className="py-2 px-2 w-20">
        <Input
          type="number"
          value={item.discount_percent}
          onChange={e => onChange(index, 'discount_percent', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm text-center"
          placeholder="0"
        />
      </td>
      <td className="py-2 pl-2 text-right font-semibold text-sm text-foreground w-28">
        ${lineTotal.toFixed(2)}
      </td>
      <td className="py-2 pl-2 w-8">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onRemove(index)}>
          ×
        </Button>
      </td>
    </tr>
  );
}

// ─── Create Invoice Sheet ──────────────────────────────────────────────────

function CreateInvoiceSheet({ onClose }: { onClose: () => void }) {
  const [customer, setCustomer] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(6.5);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, discount_percent: 0 },
  ]);

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };
  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, discount_percent: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price * (1 - item.discount_percent / 100), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>Create Invoice</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Customer</Label>
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {demoCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Issue Date</Label>
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <Label className="mb-2 block">Line Items</Label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-center pb-2 font-medium">Qty</th>
                  <th className="text-right pb-2 font-medium">Unit Price</th>
                  <th className="text-center pb-2 font-medium">Disc %</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <LineItemRow key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3 h-8 text-xs gap-1.5 border-dashed" onClick={addItem}>
            <Plus className="w-3.5 h-3.5" /> Add Line Item
          </Button>
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Tax</span>
              <Input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="h-6 w-14 text-xs text-center px-1"
              />
              <span className="text-xs">%</span>
            </div>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2 mt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, thank you message..." rows={3} />
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={onClose}>Save as Draft</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={onClose}>
          <Send className="w-4 h-4" /> Create & Send
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main Invoices Page ────────────────────────────────────────────────────

export default function Invoices() {
  const { formatMoney } = useCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = demoInvoices.filter(inv => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: demoInvoices.reduce((s, i) => s + i.total_amount, 0),
    paid: demoInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0),
    outstanding: demoInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_amount, 0),
    overdue: demoInvoices.filter(i => i.status === 'overdue').length,
  };

  return (
    <AppLayout title="Invoices" subtitle="Create, manage & track invoices">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invoiced</p>
                <p className="text-lg font-bold text-foreground">{formatMoney(stats.total)}</p>
              </div>
            </div>
          </CardContent></Card>
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-lg font-bold text-green-600">{formatMoney(stats.paid)}</p>
              </div>
            </div>
          </CardContent></Card>
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold text-blue-600">{formatMoney(stats.outstanding)}</p>
              </div>
            </div>
          </CardContent></Card>
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-lg font-bold text-red-600">{stats.overdue} invoice{stats.overdue !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </CardContent></Card>
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Issue Date</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Due Date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => (
                <motion.tr
                  key={inv.id}
                  className={cn(
                    'hover:bg-accent/40 transition-colors',
                    inv.status === 'overdue' && 'bg-red-50/50 dark:bg-red-950/10'
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-foreground">{inv.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{inv.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{inv.issue_date}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn(
                      'text-sm',
                      inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-muted-foreground'
                    )}>
                      {inv.due_date}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{formatMoney(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-indigo-600">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {inv.status === 'draft' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-blue-600">
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No invoices found</p>
              <p className="text-sm mt-1">Create your first invoice to get started</p>
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> Create Invoice
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[560px] flex flex-col p-0" side="right">
          <CreateInvoiceSheet onClose={() => setCreateOpen(false)} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
