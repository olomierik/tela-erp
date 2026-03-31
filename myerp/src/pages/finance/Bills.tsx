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
import { Pencil, Trash2 } from 'lucide-react';

type BillStatus = 'received' | 'approved' | 'paid' | 'overdue';
type BillCategory = 'General' | 'Utilities' | 'Rent' | 'Supplies' | 'Services';

interface Bill extends Record<string, unknown> {
  id: string;
  number: string;
  vendor: string;
  bill_date: string;
  due_date: string;
  amount: number;
  status: BillStatus;
  category: BillCategory;
}

const STATUS_BADGE: Record<BillStatus, 'info' | 'warning' | 'success' | 'destructive'> = {
  received: 'info',
  approved: 'warning',
  paid:     'success',
  overdue:  'destructive',
};

interface BillForm {
  vendor: string;
  bill_date: string;
  due_date: string;
  amount: string;
  category: BillCategory;
  notes: string;
}

const EMPTY_FORM: BillForm = {
  vendor: '', bill_date: '', due_date: '', amount: '', category: 'General', notes: '',
};

export default function Bills() {
  const { rows: items, loading, insert, update, remove } = useTable<Bill>('myerp_bills');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BillForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const totalBills    = items.reduce((s, b) => s + b.amount, 0);
  const unpaid        = items.filter(b => b.status === 'received' || b.status === 'approved').reduce((s, b) => s + b.amount, 0);
  const overdueAmount = items.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0);
  const paidThisMonth = items
    .filter(b => b.status === 'paid' && b.bill_date.startsWith('2026-03'))
    .reduce((s, b) => s + b.amount, 0);

  const filtered = items.filter(b => {
    const matchSearch = b.number.toLowerCase().includes(search.toLowerCase()) ||
      b.vendor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(bill: Bill) {
    setEditId(bill.id);
    setForm({
      vendor: bill.vendor,
      bill_date: bill.bill_date,
      due_date: bill.due_date,
      amount: String(bill.amount),
      category: bill.category,
      notes: '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.vendor.trim() || !form.bill_date || !form.due_date || !form.amount) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await update(editId, {
          vendor: form.vendor,
          bill_date: form.bill_date,
          due_date: form.due_date,
          amount: parsedAmount,
          category: form.category,
        });
        toast.success('Bill updated successfully.');
      } else {
        await insert({
          number: `BILL-${String(items.length + 1).padStart(4, '0')}`,
          vendor: form.vendor,
          bill_date: form.bill_date,
          due_date: form.due_date,
          amount: parsedAmount,
          status: 'received',
          category: form.category,
        });
        toast.success('Bill created successfully.');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save bill.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Bill deleted.');
    } catch {
      toast.error('Failed to delete bill.');
    }
  }

  return (
    <AppLayout title="Bills">
      <PageHeader
        title="Bills"
        subtitle="Manage vendor bills, track payables, and schedule payments."
        action={{ label: 'New Bill', onClick: openCreate }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Bills</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCurrency(totalBills)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unpaid</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-warning">{formatCurrency(unpaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(overdueAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-success">{formatCurrency(paidThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search bill # or vendor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="sm:max-w-[160px]">
          <option value="all">All Statuses</option>
          <option value="received">Received</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
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
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No bills match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(bill => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.number}</TableCell>
                      <TableCell>{bill.vendor}</TableCell>
                      <TableCell>{formatDate(bill.bill_date)}</TableCell>
                      <TableCell>{formatDate(bill.due_date)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(bill.amount)}</TableCell>
                      <TableCell>{bill.category}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[bill.status]} className="capitalize">{bill.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(bill)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(bill.id)}
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
            <SheetTitle>{editId ? 'Edit Bill' : 'New Bill'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-vendor">Vendor *</Label>
              <Input
                id="bill-vendor"
                placeholder="e.g. PowerGrid Utilities"
                value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-date">Bill Date *</Label>
              <Input
                id="bill-date"
                type="date"
                value={form.bill_date}
                onChange={e => setForm(f => ({ ...f, bill_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-due">Due Date *</Label>
              <Input
                id="bill-due"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-amount">Amount *</Label>
              <Input
                id="bill-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-category">Category</Label>
              <Select
                id="bill-category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as BillCategory }))}
              >
                <option value="General">General</option>
                <option value="Utilities">Utilities</option>
                <option value="Rent">Rent</option>
                <option value="Supplies">Supplies</option>
                <option value="Services">Services</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-notes">Notes</Label>
              <Textarea
                id="bill-notes"
                placeholder="Optional notes…"
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editId ? 'Save Changes' : 'Create Bill'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
