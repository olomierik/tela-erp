import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { ArrowRightLeft, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

function CreateTransferDialog({ stores, inventoryItems, onCreated, isPending }: {
  stores: any[]; inventoryItems: any[]; onCreated: (r: Record<string, any>) => void; isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ transfer_number: '', source_store_id: '', destination_store_id: '', item_id: '', quantity: '1', notes: '' });

  const selectedItem = inventoryItems.find((i: any) => i.id === form.item_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.source_store_id === form.destination_store_id) { toast.error('Source and destination must be different'); return; }
    const qty = parseInt(form.quantity) || 1;
    if (selectedItem && qty > selectedItem.quantity) { toast.error(`Insufficient stock. Available: ${selectedItem.quantity}`); return; }
    onCreated({ ...form, quantity: qty });
    setOpen(false);
    setForm({ transfer_number: '', source_store_id: '', destination_store_id: '', item_id: '', quantity: '1', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" /> New Transfer</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Transfer #</Label><Input required className="h-8 text-xs" value={form.transfer_number} onChange={e => setForm(p => ({ ...p, transfer_number: e.target.value }))} placeholder="TRF-001" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">From Store *</Label>
              <Select value={form.source_store_id} onValueChange={v => setForm(p => ({ ...p, source_store_id: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source..." /></SelectTrigger>
                <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">To Store *</Label>
              <Select value={form.destination_store_id} onValueChange={v => setForm(p => ({ ...p, destination_store_id: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Destination..." /></SelectTrigger>
                <SelectContent>{stores.filter(s => s.id !== form.source_store_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Item *</Label>
            <Select value={form.item_id} onValueChange={v => setForm(p => ({ ...p, item_id: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item..." /></SelectTrigger>
              <SelectContent>
                {inventoryItems.filter((i: any) => i.quantity > 0).map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku}) — {item.quantity} in stock</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Quantity</Label><Input type="number" min="1" required className="h-8 text-xs" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Input className="h-8 text-xs" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          {selectedItem && <div className="bg-primary/5 text-primary text-xs px-3 py-2 rounded-md">Available: {selectedItem.quantity} units</div>}
          <Button type="submit" className="w-full h-8 text-xs" disabled={isPending}>{isPending ? 'Creating...' : 'Create Transfer'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StockTransfers() {
  const { isDemo } = useAuth();
  const { stores } = useStore();
  const { data, isLoading } = useTenantQuery('stock_transfers');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const insert = useTenantInsert('stock_transfers');
  const update = useTenantUpdate('stock_transfers');
  const remove = useTenantDelete('stock_transfers');
  useRealtimeSync('stock_transfers');
  const [search, setSearch] = useState('');

  const transfers = data ?? [];
  const inventoryItems = inventoryData ?? [];
  const filtered = transfers.filter((t: any) => !search || t.transfer_number.toLowerCase().includes(search.toLowerCase()));
  const storeMap = Object.fromEntries(stores.map(s => [s.id, s.name]));

  return (
    <AppLayout title="Stock Transfers" subtitle="Inter-store inventory movement">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Transfers</p><p className="text-lg font-bold text-foreground">{transfers.length}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold text-warning">{transfers.filter((t: any) => t.status === 'pending').length}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Completed</p><p className="text-lg font-bold text-foreground">{transfers.filter((t: any) => t.status === 'completed').length}</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search transfers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {!isDemo && stores.length >= 2 && <CreateTransferDialog stores={stores} inventoryItems={inventoryItems} onCreated={insert.mutate} isPending={insert.isPending} />}
          </div>
        </CardContent>
      </Card>

      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {['Transfer #', 'From → To', 'Qty', 'Status', 'Date', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((t: any) => {
                  const s = statusMap[t.status] || statusMap.pending;
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">{t.transfer_number}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">{storeMap[t.source_store_id] || 'Unknown'}</span>
                        <ArrowRightLeft className="w-3 h-3 inline mx-1.5 text-muted-foreground" />
                        <span className="text-foreground">{storeMap[t.destination_store_id] || 'Unknown'}</span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{t.quantity}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={s.label} variant={s.variant} /></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-2.5">
                        {!isDemo && t.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => update.mutate({ id: t.id, status: 'completed' })}>Complete</Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(t.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">{stores.length < 2 ? 'Create at least 2 stores to enable transfers' : 'No transfers found'}</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
