import { useState, useMemo } from 'react';
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
import { Pencil, Trash2, Receipt, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
type ExpenseCurrency = 'USD' | 'EUR' | 'GBP' | 'KES';
type ExpenseCategory = 'Travel' | 'Meals' | 'Office Supplies' | 'Software' | 'Training' | 'Other';

interface Expense extends Record<string, unknown> {
  id: string;
  expense_number: string;
  employee_name: string;
  category: string;
  description: string;
  expense_date: string;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  notes: string;
}

const STATUS_BADGE: Record<ExpenseStatus, 'secondary' | 'info' | 'success' | 'destructive'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'success',
  rejected: 'destructive',
  paid: 'success',
};

const CATEGORIES: ExpenseCategory[] = [
  'Travel', 'Meals', 'Office Supplies', 'Software', 'Training', 'Other',
];
const CURRENCIES: ExpenseCurrency[] = ['USD', 'EUR', 'GBP', 'KES'];

function generateExpenseNumber(existing: Expense[]): string {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  const nums = existing
    .map(e => e.expense_number)
    .filter(n => n?.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

type FormState = {
  employee_name: string;
  category: ExpenseCategory;
  description: string;
  expense_date: string;
  amount: string;
  currency: ExpenseCurrency;
  notes: string;
  status: ExpenseStatus;
};

const EMPTY_FORM: FormState = {
  employee_name: '',
  category: 'Travel',
  description: '',
  expense_date: new Date().toISOString().split('T')[0],
  amount: '',
  currency: 'USD',
  notes: '',
  status: 'draft',
};

export default function Expenses() {
  const { rows: items, loading, insert, update, remove } = useTable<Expense>(
    'myerp_expenses',
    'created_at',
    false,
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // KPIs
  const totalExpenses = items.reduce((s, e) => s + Number(e.amount), 0);
  const pendingApproval = items
    .filter(e => e.status === 'submitted')
    .reduce((s, e) => s + Number(e.amount), 0);
  const approvedTotal = items
    .filter(e => e.status === 'approved' || e.status === 'paid')
    .reduce((s, e) => s + Number(e.amount), 0);
  const rejectedCount = items.filter(e => e.status === 'rejected').length;

  // Filtered rows
  const filtered = useMemo(() => {
    return items.filter(e => {
      const matchSearch =
        e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        e.expense_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchFrom = !dateFrom || e.expense_date >= dateFrom;
      const matchTo = !dateTo || e.expense_date <= dateTo;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [items, search, statusFilter, dateFrom, dateTo]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(e: Expense) {
    setEditId(e.id);
    setForm({
      employee_name: e.employee_name,
      category: e.category as ExpenseCategory,
      description: e.description,
      expense_date: e.expense_date,
      amount: String(e.amount),
      currency: e.currency as ExpenseCurrency,
      notes: e.notes ?? '',
      status: e.status,
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    }
  }

  async function handleSave() {
    if (!form.employee_name.trim()) { toast.error('Employee name is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.expense_date) { toast.error('Expense date is required'); return; }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { toast.error('Amount must be greater than 0'); return; }

    setSaving(true);
    try {
      const payload = {
        employee_name: form.employee_name.trim(),
        category: form.category,
        description: form.description.trim(),
        expense_date: form.expense_date,
        amount: amt,
        currency: form.currency,
        notes: form.notes.trim(),
        status: form.status,
      };

      if (editId) {
        await update(editId, payload);
        toast.success('Expense updated');
      } else {
        await insert({ ...payload, expense_number: generateExpenseNumber(items) });
        toast.success('Expense claim created');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Expenses">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Expenses">
      <PageHeader
        title="Expense Claims"
        subtitle="Manage employee expense submissions and approvals."
        action={{ label: 'New Expense', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Expenses
            </CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending Approval
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(pendingApproval)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Approved
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(approvedTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Rejected
            </CardTitle>
            <XCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by employee or expense #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap shrink-0">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap shrink-0">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        {(search || statusFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No expense claims found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm font-medium">{e.expense_number}</TableCell>
                    <TableCell>{e.employee_name}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.description}</TableCell>
                    <TableCell>{formatDate(e.expense_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {e.currency !== 'USD' && (
                        <span className="text-xs text-muted-foreground mr-1">{e.currency}</span>
                      )}
                      {formatCurrency(Number(e.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[e.status]} className="capitalize">
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(e)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(e.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Expense' : 'New Expense Claim'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-employee">Employee Name</Label>
              <Input
                id="exp-employee"
                placeholder="Full name"
                value={form.employee_name}
                onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <Select
                id="exp-category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-description">Description</Label>
              <Input
                id="exp-description"
                placeholder="Brief description of the expense"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Expense Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">Amount</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-currency">Currency</Label>
                <Select
                  id="exp-currency"
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value as ExpenseCurrency }))}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-status">Status</Label>
              <Select
                id="exp-status"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as ExpenseStatus }))}
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-notes">Notes</Label>
              <Textarea
                id="exp-notes"
                placeholder="Additional notes or receipts reference..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editId ? 'Save Changes' : 'Create Expense'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
