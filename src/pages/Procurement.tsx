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

import { supabase } from '@/integrations/supabase/client';
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

// ─── Create PO Sheet ───────────────────────────────────────────────────────

interface POLineItem {
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

function CreatePOSheet({
  onClose, isPending, onCreate, suppliers, inventoryItems,
}: {
  onClose: () => void;
  isPending: boolean;
  onCreate: (row: Record<string, any>, lineItems: POLineItem[]) => void;
  suppliers: any[];
  inventoryItems: any[];
}) {
  const [form, setForm] = useState({
    po_number: `PO-${String(Date.now()).slice(-4)}`,
    supplier_name: '',
    expected_delivery: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
  });
  const [lineItems, setLineItems] = useState<POLineItem[]>([
    { item_id: null, description: '', quantity: 1, unit_price: 0 },
  ]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () =>
    setLineItems(prev => [...prev, { item_id: null, description: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof POLineItem, value: any) =>
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));

  const handleItemLink = (i: number, itemId: string) => {
    const invItem = inventoryItems.find((it: any) => it.id === itemId);
    setLineItems(prev => prev.map((li, idx) => idx === i ? {
      ...li,
      item_id: itemId === '__none__' ? null : itemId,
      description: invItem ? invItem.name : li.description,
      unit_price: invItem ? Number(invItem.unit_cost) : li.unit_price,
    } : li));
  };

  const total = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  const handleSubmit = () => {
    if (!form.supplier_name) { toast.error('Supplier is required'); return; }
    if (lineItems.every(li => !li.description)) { toast.error('Add at least one item'); return; }
    const poline = lineItems.map(li => ({
      item_id: li.item_id,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
    }));
    onCreate(
      { ...form, total_amount: total, custom_fields: { line_items: poline } },
      lineItems
    );
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
            <Label>Supplier</Label>
            {suppliers.length > 0 ? (
              <Select value={form.supplier_name} onValueChange={v => set('supplier_name', v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Other (type below)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="Supplier name" />
            )}
            {form.supplier_name === '__other__' && (
              <Input className="mt-1" placeholder="Supplier name" onChange={e => set('supplier_name', e.target.value)} />
            )}
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
              <div key={i} className="p-2 rounded-lg border border-border bg-muted/20 space-y-2">
                {/* Link to inventory item (optional) */}
                <Select
                  value={li.item_id ?? '__none__'}
                  onValueChange={v => handleItemLink(i, v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Link to inventory item (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No link (service/other) —</SelectItem>
                    {inventoryItems.map((it: any) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} ({it.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <Input
                      value={li.description}
                      onChange={e => updateLine(i, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number" value={li.quantity}
                      onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-8 text-sm text-center" placeholder="Qty" min="1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number" value={li.unit_price}
                      onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right" placeholder="Unit price"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lineItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400"
                        onClick={() => removeLine(i)}>×</Button>
                    )}
                  </div>
                </div>
                {li.item_id && (
                  <p className="text-[10px] text-indigo-600 pl-1">
                    ✓ Receiving this PO will update inventory stock for this item
                  </p>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button" variant="outline" size="sm"
            className="mt-2 h-8 text-xs gap-1.5 border-dashed"
            onClick={addLine}
          >
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
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          onClick={handleSubmit}
          disabled={isPending}
        >
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
  const { data: suppliersData } = useTenantQuery('suppliers');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const insertBase = useTenantInsert('purchase_orders');
  const remove = useTenantDelete('purchase_orders');
  const updateMutation = useTenantUpdate('purchase_orders');
  useRealtimeSync('purchase_orders');
  useRealtimeSync('inventory_items');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  const pos = data ?? [];
  const suppliers = suppliersData ?? [];
  const inventoryItems = inventoryData ?? [];

  const open = pos.filter((p: any) => !['received', 'cancelled'].includes(p.status)).length;
  const pending = pos.filter((p: any) => ['submitted', 'approved'].includes(p.status)).length;
  const received = pos.filter((p: any) => p.status === 'received').length;
  const totalSpend = pos.reduce((s: number, p: any) => s + Number(p.total_amount), 0);

  const filtered = pos.filter((p: any) => {
    const matchSearch = !search
      || p.po_number?.toLowerCase().includes(search.toLowerCase())
      || p.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // GRN: real received POs
  const receivedPOs = pos.filter((p: any) => p.status === 'received');

  const handleCreate = (row: Record<string, any>, lineItems: POLineItem[]) => {
    insertBase.mutate(row, {
      onSuccess: (data: any) => {
        if (!tenant?.id || !data?.id || lineItems.length === 0) return;
        const lines = lineItems.map((li: POLineItem) => ({
          tenant_id: tenant.id,
          purchase_order_id: data.id,
          item_id: li.item_id || null,
          description: li.description || '',
          quantity: li.quantity,
          unit_price: li.unit_price,
        }));

        (supabase as any)
          .from('purchase_order_lines')
          .insert(lines)
          .then(({ error }: any) => {
            if (error) {
              console.error('Failed to insert purchase_order_lines:', error);
              toast.error('PO saved, but line item links were not saved');
            }
          });
      },
    });
  };

  /** Receives a PO: updates status to 'received'.
   * Inventory/accounting now run in backend automation to keep data consistent. */
  const handleReceivePO = (po: any) => {
    updateMutation.mutate({ id: po.id, status: 'received' });
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
              <TabsTrigger value="grn">
                GRN
                {receivedPOs.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{receivedPOs.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            </TabsList>
            {!isDemo && activeTab === 'orders' && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
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
                  {Object.keys(statusConfig).map(s => (
                    <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                  ))}
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
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 text-xs gap-1 text-green-600 hover:bg-green-50"
                                  onClick={() => handleReceivePO(p)}
                                >
                                  <ArrowDown className="w-3 h-3" /> Receive
                                </Button>
                              )}
                              {p.status === 'draft' && (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => updateMutation.mutate({ id: p.id, status: 'submitted' })}
                                >
                                  Submit
                                </Button>
                              )}
                              {p.status === 'submitted' && (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                                  onClick={() => updateMutation.mutate({ id: p.id, status: 'approved' })}
                                >
                                  Approve
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

          {/* ── GRN (real received POs) ── */}
          <TabsContent value="grn" className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">PO Reference</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-right px-4 py-3 font-medium">Value</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Received Date</th>
                    <th className="text-left px-4 py-3 font-medium">Items Linked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receivedPOs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>No goods received yet — receive a PO from the Orders tab</p>
                    </td></tr>
                  ) : receivedPOs.map((p: any) => {
                    const lines: any[] = p.custom_fields?.line_items ?? [];
                    const linkedCount = lines.filter((l: any) => l.item_id).length;
                    return (
                      <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{p.po_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{p.supplier_name}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatMoney(Number(p.total_amount))}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                            <Package className="w-3 h-3" /> Received
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(p.updated_at || p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {lines.length > 0 ? (
                            <span className={cn(
                              'font-medium',
                              linkedCount === lines.length ? 'text-green-600' : 'text-amber-600'
                            )}>
                              {linkedCount}/{lines.length} inventory-linked
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── Suppliers (real data from DB) ── */}
          <TabsContent value="suppliers" className="mt-4">
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 h-8">
                  <Plus className="w-3.5 h-3.5" /> Add Supplier
                </Button>
              </div>
              {suppliers.length === 0 ? (
                <div className="rounded-xl border border-border py-12 text-center text-sm text-muted-foreground">
                  <Truck className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>No suppliers yet — add your first supplier</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.map((supplier: any) => (
                    <Card key={supplier.id} className="rounded-xl border-border hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-sm">
                            {supplier.name?.charAt(0) || '?'}
                          </div>
                          {supplier.rating != null && (
                            <div className="flex">
                              {[1,2,3,4,5].map(n => (
                                <Star key={n} className={cn('w-3.5 h-3.5', n <= supplier.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-foreground">{supplier.name}</p>
                        {supplier.email && <p className="text-xs text-muted-foreground mt-1">{supplier.email}</p>}
                        {supplier.phone && <p className="text-xs text-muted-foreground">{supplier.phone}</p>}
                        {supplier.lead_time && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Lead time: <span className="font-medium text-foreground">{supplier.lead_time} days</span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create PO Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[540px] flex flex-col p-0" side="right">
          <CreatePOSheet
            onClose={() => setCreateOpen(false)}
            isPending={insertBase.isPending}
            onCreate={handleCreate}
            suppliers={suppliers}
            inventoryItems={inventoryItems}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
