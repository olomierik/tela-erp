import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Truck, Clock, CheckCircle, FileText, Trash2, Search, Plus,
  Package, Star, XCircle, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert, useTenantDelete, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { onProcurementReceived } from '@/hooks/use-cross-module';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  draft: { label: 'Draft', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
  submitted: { label: 'Submitted', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: CheckCircle },
  received: { label: 'Received', class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400', icon: Package },
  cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusConfig[status] || statusConfig.draft;
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.class)}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}

// Demo GRN data
const demoGRNItems = [
  { id: '1', po_number: 'PO-0044', supplier: 'TechSuppliers Ltd', received_date: '2026-03-20', items_ordered: 50, items_received: 48, status: 'partial', notes: '2 units damaged on arrival' },
  { id: '2', po_number: 'PO-0041', supplier: 'Global Parts Co', received_date: '2026-03-18', items_ordered: 100, items_received: 100, status: 'complete', notes: '' },
  { id: '3', po_number: 'PO-0039', supplier: 'SupplyWorld', received_date: '2026-03-15', items_ordered: 25, items_received: 25, status: 'complete', notes: '' },
];

// Demo Suppliers
const demoSuppliers = [
  { id: '1', name: 'TechSuppliers Ltd', email: 'orders@techsuppliers.com', phone: '+1 555 0300', lead_time: 7, rating: 4, categories: ['Electronics', 'Components'] },
  { id: '2', name: 'Global Parts Co', email: 'sales@globalparts.com', phone: '+1 555 0301', lead_time: 14, rating: 5, categories: ['Hardware', 'Raw Materials'] },
  { id: '3', name: 'SupplyWorld', email: 'info@supplyworld.com', phone: '+1 555 0302', lead_time: 5, rating: 3, categories: ['Packaging', 'Office'] },
];

// ─── Create PO Sheet ───────────────────────────────────────────────────────

function CreatePOSheet({ onClose, isPending, onCreate }: {
  onClose: () => void; isPending: boolean; onCreate: (row: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    po_number: `PO-${String(Date.now()).slice(-4)}`,
    supplier_name: '',
    expected_delivery: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
  });
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unit_price: 0 },
  ]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) =>
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));

  const total = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  const handleSubmit = () => {
    if (!form.supplier_name) { toast.error('Supplier is required'); return; }
    onCreate({ ...form, total_amount: total });
    onClose();
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>New Purchase Order</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>PO Number</Label>
            <Input value={form.po_number} onChange={e => set('po_number', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Supplier Name</Label>
            <Select value={form.supplier_name} onValueChange={v => set('supplier_name', v)}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {demoSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                <SelectItem value="__other__">Other...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Order Date</Label>
            <Input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Expected Delivery</Label>
            <Input type="date" value={form.expected_delivery} onChange={e => set('expected_delivery', e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Line Items</Label>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border bg-muted/20">
                <div className="col-span-6">
                  <Input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)}
                    placeholder="Item description" className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={li.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-8 text-sm text-center" placeholder="Qty" min="1" />
                </div>
                <div className="col-span-3">
                  <Input type="number" value={li.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm text-right" placeholder="Unit price" />
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeLine(i)}>×</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5 border-dashed" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>

        <div className="flex justify-between p-3 rounded-lg bg-muted/40 border border-border">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-base font-bold text-indigo-600">${total.toFixed(2)}</span>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submit to Supplier</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSubmit} disabled={isPending}>
          <Truck className="w-4 h-4" /> Create PO
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main Procurement Page ─────────────────────────────────────────────────

export default function Procurement() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('purchase_orders');
  const insertBase = useTenantInsert('purchase_orders');
  const remove = useTenantDelete('purchase_orders');
  const updateMutation = useTenantUpdate('purchase_orders');
  useRealtimeSync('purchase_orders');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  const pos = data ?? [];
  const open = pos.filter((p: any) => !['received', 'cancelled'].includes(p.status)).length;
  const pending = pos.filter((p: any) => ['submitted', 'approved'].includes(p.status)).length;
  const received = pos.filter((p: any) => p.status === 'received').length;
  const totalSpend = pos.reduce((s: number, p: any) => s + Number(p.total_amount), 0);

  const filtered = pos.filter((p: any) => {
    const matchSearch = !search || p.po_number?.toLowerCase().includes(search.toLowerCase()) || p.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = (row: Record<string, any>) => {
    insertBase.mutate(row, {
      onSuccess: (data: any) => {
        if (data.status === 'received' && tenant?.id) {
          onProcurementReceived(tenant.id, { po_number: data.po_number, supplier_name: data.supplier_name, total_amount: Number(data.total_amount) });
        }
      },
    });
  };

  return (
    <AppLayout title="Procurement" subtitle="Purchase orders, GRN & suppliers">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Open POs', value: isDemo ? '18' : String(open), color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Pending Delivery', value: isDemo ? '7' : String(pending), color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Received (MTD)', value: isDemo ? '12' : String(received), color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Total Spend', value: isDemo ? formatMoney(55650) : formatMoney(totalSpend), color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
          ].map(stat => (
            <Card key={stat.label} className="rounded-xl border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn('text-xl font-bold mt-1', stat.color.split(' ')[0])}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
              <TabsTrigger value="grn">GRN</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            </TabsList>
            {!isDemo && activeTab === 'orders' && (
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> New PO
              </Button>
            )}
          </div>

          {/* ── Orders ── */}
          <TabsContent value="orders" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.keys(statusConfig).map(s => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading && !isDemo ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3 font-medium">PO #</th>
                      <th className="text-left px-4 py-3 font-medium">Supplier</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Order Date</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Expected</th>
                      {!isDemo && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p: any) => (
                      <motion.tr key={p.id} className="hover:bg-accent/40 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{p.po_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{p.supplier_name}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatMoney(Number(p.total_amount))}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{p.order_date || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{p.expected_delivery || '—'}</td>
                        {!isDemo && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.status === 'approved' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 hover:bg-green-50" onClick={() => updateMutation.mutate({ id: p.id, status: 'received' })}>
                                  <ArrowDown className="w-3 h-3" /> Receive
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remove.mutate(p.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <Truck className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No purchase orders found</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── GRN ── */}
          <TabsContent value="grn" className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">PO Reference</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-center px-4 py-3 font-medium">Ordered</th>
                    <th className="text-center px-4 py-3 font-medium">Received</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {demoGRNItems.map((grn) => (
                    <tr key={grn.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{grn.po_number}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{grn.supplier}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{grn.items_ordered}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('font-semibold', grn.items_received === grn.items_ordered ? 'text-green-600' : 'text-amber-600')}>
                          {grn.items_received}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          grn.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {grn.status === 'complete' ? 'Complete' : 'Partial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{grn.received_date}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{grn.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── Suppliers ── */}
          <TabsContent value="suppliers" className="mt-4">
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 h-8">
                  <Plus className="w-3.5 h-3.5" /> Add Supplier
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoSuppliers.map((supplier) => (
                  <Card key={supplier.id} className="rounded-xl border-border hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {supplier.name.charAt(0)}
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={cn('w-3.5 h-3.5', n <= supplier.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                          ))}
                        </div>
                      </div>
                      <p className="font-semibold text-sm text-foreground">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{supplier.email}</p>
                      <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {supplier.categories.map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 rounded text-[10px] bg-accent text-foreground">{cat}</span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Lead time: <span className="font-medium text-foreground">{supplier.lead_time} days</span></p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create PO Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0" side="right">
          <CreatePOSheet onClose={() => setCreateOpen(false)} isPending={insertBase.isPending} onCreate={handleCreate} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
