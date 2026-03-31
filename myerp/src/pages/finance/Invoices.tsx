import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, CheckCircle } from 'lucide-react';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface Invoice extends Record<string, unknown> {
  id: string;
  number: string;
  customer: string;
  issue_date: string;
  due_date: string;
  amount: number;
  status: InvoiceStatus;
  items_count: number;
  notes: string;
}

const STATUS_BADGE: Record<InvoiceStatus, 'secondary' | 'info' | 'success' | 'destructive' | 'outline'> = {
  draft:     'secondary',
  sent:      'info',
  paid:      'success',
  overdue:   'destructive',
  cancelled: 'outline',
};

interface InvoiceForm {
  customer: string;
  issue_date: string;
  due_date: string;
  notes: string;
}

const EMPTY_FORM: InvoiceForm = { customer: '', issue_date: '', due_date: '', notes: '' };

export default function Invoices() {
  const { rows: items, loading, insert, update, remove } = useTable<Invoice>('myerp_invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const totalInvoiced = items.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = items.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding   = items.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const overdueCount  = items.filter(i => i.status === 'overdue').length;

  const filtered = items.filter(i => {
    const matchSearch = i.number.toLowerCase().includes(search.toLowerCase()) ||
      i.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditId(inv.id);
    setForm({ customer: inv.customer, issue_date: inv.issue_date, due_date: inv.due_date, notes: inv.notes ?? '' });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.customer.trim() || !form.issue_date || !form.due_date) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await update(editId, {
          customer: form.customer,
          issue_date: form.issue_date,
          due_date: form.due_date,
          notes: form.notes,
        });
        toast.success('Invoice updated successfully.');
      } else {
        await insert({
          number: `INV-${String(items.length + 1).padStart(4, '0')}`,
          customer: form.customer,
          issue_date: form.issue_date,
          due_date: form.due_date,
          amount: 0,
          status: 'draft',
          items_count: 0,
          notes: form.notes,
        });
        toast.success('Invoice created successfully.');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Invoice deleted.');
    } catch {
      toast.error('Failed to delete invoice.');
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await update(id, { status: 'paid' });
      toast.success('Invoice marked as paid.');
    } catch {
      toast.error('Failed to update invoice.');
    }
  }

  return (
    <AppLayout title="Invoices">
      <PageHeader
        title="Invoices"
        subtitle="Create, send, and track customer invoices."
        action={{ label: 'New Invoice', onClick: openCreate }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Paid</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-warning">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{overdueCount} invoice{overdueCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search invoice # or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="sm:max-w-[160px]">
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No invoices match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.number}</TableCell>
                      <TableCell>{inv.customer}</TableCell>
                      <TableCell>{formatDate(inv.issue_date)}</TableCell>
                      <TableCell>{formatDate(inv.due_date)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                      <TableCell className="text-center">{inv.items_count}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[inv.status]} className="capitalize">{inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleMarkPaid(inv.id)}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Paid
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(inv)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(inv.id)}
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

      {/* Sheet form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>{editId ? 'Edit Invoice' : 'New Invoice'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-customer">Customer *</Label>
              <Input
                id="inv-customer"
                placeholder="e.g. Acme Corp"
                value={form.customer}
                onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-issue">Issue Date *</Label>
              <Input
                id="inv-issue"
                type="date"
                value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-due">Due Date *</Label>
              <Input
                id="inv-due"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-notes">Notes</Label>
              <Textarea
                id="inv-notes"
                placeholder="Optional notes…"
                rows={4}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editId ? 'Save Changes' : 'Create Invoice'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
