import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, TrendingDown, DollarSign, Calendar, BarChart3, Loader2 } from 'lucide-react';

interface DepreciationEntry extends Record<string, unknown> {
  id: string;
  asset_id: string;
  asset_name: string;
  period: string;
  amount: number;
  book_value: number;
  date: string;
}

type DepreciationForm = { asset_id: string; asset_name: string; period: string; amount: number; book_value: number; date: string; };

const BLANK: DepreciationForm = {
  asset_id: '', asset_name: '', period: '', amount: 0, book_value: 0, date: '',
};

export default function Depreciation() {
  const { rows: items, loading, insert, update, remove } = useTable<DepreciationEntry>('myerp_depreciation');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepreciationEntry | null>(null);
  const [form, setForm] = useState<DepreciationForm>(BLANK);

  const totalAmount    = items.reduce((s, e) => s + e.amount, 0);
  const totalBookValue = items.reduce((s, e) => s + e.book_value, 0);

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(entry: DepreciationEntry) {
    setEditing(entry);
    setForm({ asset_id: entry.asset_id as string, asset_name: entry.asset_name as string, period: entry.period as string, amount: entry.amount as number, book_value: entry.book_value as number, date: entry.date as string });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.asset_name.trim()) { toast.error('Asset name is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Entry updated');
      } else {
        await insert(form);
        toast.success('Entry created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Entry removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof DepreciationForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Depreciation">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Depreciation">
      <PageHeader title="Depreciation" subtitle="Automate depreciation calculations using straight-line or reducing balance methods." action={{ label: 'New Entry', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Entries',      value: items.length,             icon: BarChart3,   color: 'text-primary'     },
          { label: 'Total Depreciation', value: formatCurrency(totalAmount),    icon: TrendingDown, color: 'text-destructive' },
          { label: 'Total Book Value',   value: formatCurrency(totalBookValue), icon: DollarSign,   color: 'text-success'     },
          { label: 'Periods Recorded',   value: new Set(items.map(e => e.period)).size, icon: Calendar, color: 'text-info' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Depreciation Amount</TableHead>
                <TableHead>Book Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.asset_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{entry.period}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(entry.amount)}</TableCell>
                  <TableCell>{formatCurrency(entry.book_value)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(entry)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(entry.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Entry' : 'New Depreciation Entry'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Asset Name</Label>
              <Input value={form.asset_name} onChange={e => field('asset_name', e.target.value)} placeholder="Asset name" />
            </div>
            <div className="space-y-1.5">
              <Label>Asset ID</Label>
              <Input value={form.asset_id} onChange={e => field('asset_id', e.target.value)} placeholder="e.g. AST-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Input value={form.period} onChange={e => field('period', e.target.value)} placeholder="e.g. 2026-Q1" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => field('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Depreciation Amount</Label>
              <Input type="number" value={form.amount} onChange={e => field('amount', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Book Value After</Label>
              <Input type="number" value={form.book_value} onChange={e => field('book_value', Number(e.target.value))} min={0} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Entry'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
