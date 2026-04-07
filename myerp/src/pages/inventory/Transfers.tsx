import { useState, useEffect, useCallback } from 'react';
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
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Pencil, Trash2, ArrowRightLeft, FileEdit, CheckCircle2, PackageCheck,
  Plus, Trash, Loader2,
} from 'lucide-react';

type TransferStatus = 'draft' | 'confirmed' | 'done' | 'cancelled';

interface Transfer extends Record<string, unknown> {
  id: string;
  transfer_number: string;
  from_location: string;
  to_location: string;
  transfer_date: string;
  status: TransferStatus;
  notes: string;
}

interface TransferLine {
  id: string;
  transfer_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit: string;
}

interface LineForm {
  product_name: string;
  product_sku: string;
  quantity: string;
  unit: string;
}

interface TransferForm {
  from_location: string;
  to_location: string;
  transfer_date: string;
  status: TransferStatus;
  notes: string;
}

const statusVariant: Record<TransferStatus, 'secondary' | 'info' | 'success' | 'outline'> = {
  draft: 'secondary',
  confirmed: 'info',
  done: 'success',
  cancelled: 'outline',
};

const statusLabel: Record<TransferStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  done: 'Done',
  cancelled: 'Cancelled',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const BLANK_FORM: TransferForm = {
  from_location: '',
  to_location: '',
  transfer_date: todayStr(),
  status: 'draft',
  notes: '',
};

const BLANK_LINE: LineForm = {
  product_name: '',
  product_sku: '',
  quantity: '1',
  unit: 'pcs',
};

export default function Transfers() {
  const { user } = useAuth();
  const { rows: transfers, loading, insert, update, remove, setRows } =
    useTable<Transfer>('myerp_transfers', 'created_at', false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [form, setForm] = useState<TransferForm>(BLANK_FORM);

  // Per-transfer line counts
  const [lineCounts, setLineCounts] = useState<Record<string, number>>({});

  // Lines for the sheet (new transfer)
  const [lines, setLines] = useState<LineForm[]>([{ ...BLANK_LINE }]);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // KPIs
  const total = transfers.length;
  const draftCount = transfers.filter(t => t.status === 'draft').length;
  const confirmedCount = transfers.filter(t => t.status === 'confirmed').length;
  const doneCount = transfers.filter(t => t.status === 'done').length;

  // Fetch line counts for all transfers
  const fetchLineCounts = useCallback(async () => {
    if (!transfers.length) return;
    const ids = transfers.map(t => t.id);
    const { data } = await supabase
      .from('myerp_transfer_lines')
      .select('transfer_id')
      .in('transfer_id', ids);
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data as { transfer_id: string }[]) {
        counts[row.transfer_id] = (counts[row.transfer_id] ?? 0) + 1;
      }
      setLineCounts(counts);
    }
  }, [transfers]);

  useEffect(() => {
    fetchLineCounts();
  }, [fetchLineCounts]);

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_FORM, transfer_date: todayStr() });
    setLines([{ ...BLANK_LINE }]);
    setSheetOpen(true);
  }

  function openEdit(transfer: Transfer) {
    setEditing(transfer);
    setForm({
      from_location: transfer.from_location,
      to_location: transfer.to_location,
      transfer_date: transfer.transfer_date,
      status: transfer.status,
      notes: transfer.notes ?? '',
    });
    setLines([]);
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.from_location.trim()) { toast.error('From location is required'); return; }
    if (!form.to_location.trim()) { toast.error('To location is required'); return; }
    if (!form.transfer_date) { toast.error('Transfer date is required'); return; }

    const payload = {
      from_location: form.from_location.trim(),
      to_location: form.to_location.trim(),
      transfer_date: form.transfer_date,
      status: form.status,
      notes: form.notes,
    };

    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Transfer updated');
        setSheetOpen(false);
      } else {
        // Generate transfer number
        const year = new Date().getFullYear();
        const prefix = `TRF-${year}-`;
        const nums = transfers
          .map(t => t.transfer_number)
          .filter(n => n.startsWith(prefix))
          .map(n => parseInt(n.replace(prefix, ''), 10))
          .filter(n => !isNaN(n));
        const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        const transfer_number = `${prefix}${String(next).padStart(3, '0')}`;

        const created = await insert({ ...payload, transfer_number });

        // Insert lines
        const validLines = lines.filter(l => l.product_name.trim());
        if (validLines.length > 0 && user) {
          const lineRows = validLines.map(l => ({
            transfer_id: created.id,
            product_name: l.product_name.trim(),
            product_sku: l.product_sku.trim(),
            quantity: parseInt(l.quantity) || 1,
            unit: l.unit,
            user_id: user.id,
          }));
          const { error: lineErr } = await supabase
            .from('myerp_transfer_lines')
            .insert(lineRows);
          if (lineErr) toast.error(`Transfer saved but lines failed: ${lineErr.message}`);
          else {
            setLineCounts(prev => ({ ...prev, [created.id]: validLines.length }));
          }
        }

        toast.success('Transfer created');
        setSheetOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save transfer');
    }
  }

  async function handleDelete(id: string) {
    try {
      // Delete lines first
      await supabase.from('myerp_transfer_lines').delete().eq('transfer_id', id);
      await remove(id);
      toast.success('Transfer deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transfer');
    }
  }

  async function handleConfirm(transfer: Transfer) {
    setActionLoading(transfer.id + '-confirm');
    try {
      const updated = await update(transfer.id, { status: 'confirmed' });
      setRows(prev => prev.map(t => t.id === transfer.id ? updated : t));
      toast.success(`Transfer ${transfer.transfer_number} confirmed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm transfer');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkDone(transfer: Transfer) {
    setActionLoading(transfer.id + '-done');
    try {
      // Fetch lines
      const { data: lineData, error: lineErr } = await supabase
        .from('myerp_transfer_lines')
        .select('*')
        .eq('transfer_id', transfer.id);

      if (lineErr) throw lineErr;
      const transferLines = (lineData ?? []) as TransferLine[];

      // Update stock for each line (subtract from from_location / add to to_location)
      // We do a best-effort update on myerp_products by SKU
      for (const line of transferLines) {
        if (!line.product_sku) continue;
        // Fetch current stock
        const { data: productData } = await supabase
          .from('myerp_products')
          .select('id, stock_qty')
          .eq('sku', line.product_sku)
          .single();
        if (productData) {
          const currentQty = Number((productData as { id: string; stock_qty: number }).stock_qty) || 0;
          const newQty = Math.max(0, currentQty - line.quantity);
          await supabase
            .from('myerp_products')
            .update({ stock_qty: newQty })
            .eq('id', (productData as { id: string; stock_qty: number }).id);
        }
      }

      const updated = await update(transfer.id, { status: 'done' });
      setRows(prev => prev.map(t => t.id === transfer.id ? updated : t));
      toast.success(`Transfer ${transfer.transfer_number} marked as done`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark transfer as done');
    } finally {
      setActionLoading(null);
    }
  }

  function setField(key: keyof TransferForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function setLineField(index: number, key: keyof LineForm, value: string) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [key]: value } : l));
  }

  function addLine() {
    setLines(prev => [...prev, { ...BLANK_LINE }]);
  }

  function removeLine(index: number) {
    setLines(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <AppLayout title="Transfers">
      <PageHeader
        title="Stock Transfers"
        subtitle="Move inventory between locations and warehouses"
        action={{ label: 'New Transfer', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Transfers', value: total,          icon: ArrowRightLeft, color: 'text-primary'  },
          { label: 'Draft',           value: draftCount,     icon: FileEdit,       color: 'text-secondary-foreground' },
          { label: 'Confirmed',       value: confirmedCount, icon: CheckCircle2,   color: 'text-info'     },
          { label: 'Done',            value: doneCount,      icon: PackageCheck,   color: 'text-success'  },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer #</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No transfers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm font-medium">{t.transfer_number}</TableCell>
                        <TableCell>{t.from_location}</TableCell>
                        <TableCell>{t.to_location}</TableCell>
                        <TableCell>{formatDate(t.transfer_date)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[t.status]}>{statusLabel[t.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{lineCounts[t.id] ?? 0}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {t.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleConfirm(t)}
                                disabled={actionLoading === t.id + '-confirm'}
                              >
                                {actionLoading === t.id + '-confirm'
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : 'Confirm'}
                              </Button>
                            )}
                            {t.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleMarkDone(t)}
                                disabled={actionLoading === t.id + '-done'}
                              >
                                {actionLoading === t.id + '-done'
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : 'Mark Done'}
                              </Button>
                            )}
                            {t.status === 'draft' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDelete(t.id)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Transfer' : 'New Transfer'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tr-from">From Location</Label>
                <Input
                  id="tr-from"
                  value={form.from_location}
                  onChange={setField('from_location')}
                  placeholder="Warehouse A"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tr-to">To Location</Label>
                <Input
                  id="tr-to"
                  value={form.to_location}
                  onChange={setField('to_location')}
                  placeholder="Warehouse B"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tr-date">Date</Label>
                <Input
                  id="tr-date"
                  type="date"
                  value={form.transfer_date}
                  onChange={setField('transfer_date')}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tr-status">Status</Label>
                <Select id="tr-status" value={form.status} onChange={setField('status')}>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tr-notes">Notes</Label>
              <Textarea
                id="tr-notes"
                value={form.notes}
                onChange={setField('notes')}
                placeholder="Transfer notes…"
                rows={2}
              />
            </div>

            {/* Line Items — only shown for new transfers */}
            {!editing && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Line Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addLine}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
                  </Button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={idx} className="border rounded-md p-3 grid gap-2 relative">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Product Name</Label>
                          <Input
                            value={line.product_name}
                            onChange={e => setLineField(idx, 'product_name', e.target.value)}
                            placeholder="Product name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">SKU</Label>
                          <Input
                            value={line.product_sku}
                            onChange={e => setLineField(idx, 'product_sku', e.target.value)}
                            placeholder="SKU-001"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => setLineField(idx, 'quantity', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Unit</Label>
                          <Select
                            value={line.unit}
                            onChange={e => setLineField(idx, 'unit', e.target.value)}
                            className="h-8 text-sm"
                          >
                            <option value="pcs">pcs</option>
                            <option value="kg">kg</option>
                            <option value="L">L</option>
                            <option value="box">box</option>
                            <option value="pair">pair</option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editing && (
              <p className="text-xs text-muted-foreground italic">
                To manage line items, delete and recreate this transfer as a draft.
              </p>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Transfer'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
