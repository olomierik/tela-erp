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
import { Pencil, Trash2, FileText, Send, CheckCircle, DollarSign, ArrowRightCircle, Loader2 } from 'lucide-react';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

interface Quote extends Record<string, unknown> {
  id: string;
  quote_number: string;
  customer: string;
  date: string;
  expiry_date: string;
  amount: number;
  status: QuoteStatus;
  notes: string;
}

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
  const { rows: items, loading, insert, update, remove } = useTable<Quote>('myerp_quotes');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(q => {
    const matchSearch =
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sentCount = items.filter(q => q.status === 'sent').length;
  const acceptedCount = items.filter(q => q.status === 'accepted').length;
  const acceptedValue = items.filter(q => q.status === 'accepted').reduce((s, q) => s + q.amount, 0);

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

  async function handleDelete(id: string) {
    try { await remove(id); toast.success('Quote deleted'); }
    catch { toast.error('Failed to delete'); }
  }

  function handleConvertToOrder(q: Quote) {
    toast.success(`Order created from quote ${q.quote_number}`);
  }

  async function handleSave() {
    if (!form.customer.trim()) {
      toast.error('Customer is required');
      return;
    }
    const amountNum = typeof form.amount === 'string' ? parseFloat(form.amount) || 0 : form.amount;
    setSaving(true);
    try {
      if (editId) {
        await update(editId, { customer: form.customer, date: form.date, expiry_date: form.expiry_date, amount: amountNum, notes: form.notes });
        toast.success('Quote updated');
      } else {
        await insert({ customer: form.customer, date: form.date, expiry_date: form.expiry_date, amount: amountNum, notes: form.notes, status: 'draft' });
        toast.success('Quote created');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save quote');
    } finally {
      setSaving(false);
    }
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
              <span className="text-2xl font-bold">{items.length}</span>
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
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading quotes…</span>
            </div>
          ) : (
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
          )}
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
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editId ? 'Save Changes' : 'Create Quote'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
