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
import { genId, formatCurrency, formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, FileText, Send, CheckCircle, DollarSign, ArrowRightCircle } from 'lucide-react';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

interface Quote {
  id: string;
  quote_number: string;
  customer: string;
  date: string;
  expiry_date: string;
  amount: number;
  status: QuoteStatus;
  notes: string;
}

const INITIAL_QUOTES: Quote[] = [
  { id: '1', quote_number: 'QTE-2025-001', customer: 'TechVision Ltd', date: '2025-01-08', expiry_date: '2025-02-08', amount: 45600, status: 'accepted', notes: 'Annual software licensing' },
  { id: '2', quote_number: 'QTE-2025-002', customer: 'GlobalMart', date: '2025-01-15', expiry_date: '2025-02-15', amount: 12800, status: 'sent', notes: '' },
  { id: '3', quote_number: 'QTE-2025-003', customer: 'DataCore Systems', date: '2025-01-20', expiry_date: '2025-02-20', amount: 88000, status: 'accepted', notes: 'Enterprise infrastructure package' },
  { id: '4', quote_number: 'QTE-2025-004', customer: 'Acme Corp', date: '2025-01-25', expiry_date: '2025-02-25', amount: 23400, status: 'rejected', notes: 'Client went with competitor' },
  { id: '5', quote_number: 'QTE-2025-005', customer: 'MediBridge Health', date: '2025-02-05', expiry_date: '2025-03-05', amount: 34700, status: 'sent', notes: 'Compliance module upgrade' },
  { id: '6', quote_number: 'QTE-2025-006', customer: 'Sunrise Retail', date: '2025-02-10', expiry_date: '2025-03-10', amount: 9200, status: 'draft', notes: '' },
  { id: '7', quote_number: 'QTE-2025-007', customer: 'LogistiX', date: '2024-12-01', expiry_date: '2025-01-01', amount: 17500, status: 'expired', notes: 'Fleet management suite' },
  { id: '8', quote_number: 'QTE-2025-008', customer: 'PharmaPlus', date: '2025-03-01', expiry_date: '2025-04-01', amount: 61000, status: 'sent', notes: 'Q1 supply agreement' },
];

const STATUS_BADGE: Record<QuoteStatus, 'secondary' | 'info' | 'success' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  sent: 'info',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'outline',
};

const emptyForm = {
  customer: '',
  date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  amount: '' as string | number,
  notes: '',
};

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = quotes.filter(q => {
    const matchSearch =
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sentCount = quotes.filter(q => q.status === 'sent').length;
  const acceptedCount = quotes.filter(q => q.status === 'accepted').length;
  const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + q.amount, 0);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(q: Quote) {
    setEditId(q.id);
    setForm({ customer: q.customer, date: q.date, expiry_date: q.expiry_date, amount: q.amount, notes: q.notes });
    setSheetOpen(true);
  }

  function handleDelete(id: string) {
    setQuotes(prev => prev.filter(q => q.id !== id));
    toast.success('Quote deleted');
  }

  function handleConvertToOrder(q: Quote) {
    toast.success(`Order created from quote ${q.quote_number}`);
  }

  function handleSave() {
    if (!form.customer.trim()) {
      toast.error('Customer is required');
      return;
    }
    const amountNum = typeof form.amount === 'string' ? parseFloat(form.amount) || 0 : form.amount;
    if (editId) {
      setQuotes(prev => prev.map(q => q.id === editId ? { ...q, customer: form.customer, date: form.date, expiry_date: form.expiry_date, amount: amountNum, notes: form.notes } : q));
      toast.success('Quote updated');
    } else {
      const nextNum = quotes.length + 1;
      const newQuote: Quote = {
        id: genId(),
        quote_number: `QTE-2025-${String(nextNum).padStart(3, '0')}`,
        customer: form.customer,
        date: form.date,
        expiry_date: form.expiry_date,
        amount: amountNum,
        notes: form.notes,
        status: 'draft',
      };
      setQuotes(prev => [newQuote, ...prev]);
      toast.success('Quote created');
    }
    setSheetOpen(false);
  }

  return (
    <AppLayout title="Quotes">
      <PageHeader
        title="Quotes"
        subtitle="Create professional sales quotes, track approval status, and convert to orders."
        action={{ label: 'New Quote', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{quotes.length}</span>
              <FileText className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{sentCount}</span>
              <Send className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Accepted</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{acceptedCount}</span>
              <CheckCircle className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Accepted Value</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(acceptedValue)}</span>
              <DollarSign className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by quote # or customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-44">
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No quotes found.</TableCell>
                </TableRow>
              )}
              {filtered.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium font-mono text-sm">{q.quote_number}</TableCell>
                  <TableCell>{q.customer}</TableCell>
                  <TableCell>{formatDate(q.date)}</TableCell>
                  <TableCell>{formatDate(q.expiry_date)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(q.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[q.status]}>{q.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {q.status === 'accepted' && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => handleConvertToOrder(q)}>
                          <ArrowRightCircle className="w-3 h-3" />
                          Order
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(q)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Quote' : 'New Quote'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Input placeholder="Customer name or company" value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Quote Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($)</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Quote details or special terms..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Save Changes' : 'Create Quote'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
