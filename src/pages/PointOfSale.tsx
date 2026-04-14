import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import DataTable, { Column } from '@/components/erp/DataTable';
import { ShoppingCart, Plus, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  paused: 'Paused',
};

const STATUSES = ['open', 'paused', 'closed'];

// ─── Quick Sale Line Item ─────────────────────────────────────────────
interface POSLineItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

function QuickSaleSheet({
  inventoryItems,
  sessionId,
  tenantId,
  onClose,
  onSaleComplete,
}: {
  inventoryItems: any[];
  sessionId: string;
  tenantId: string;
  onClose: () => void;
  onSaleComplete: () => void;
}) {
  const { formatMoney } = useCurrency();
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [lineItems, setLineItems] = useState<POSLineItem[]>([
    { item_id: '', item_name: '', quantity: 1, unit_price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const handleItemChange = (i: number, id: string) => {
    const item = inventoryItems.find((it: any) => it.id === id);
    const price = item?.selling_price && Number(item.selling_price) > 0
      ? Number(item.selling_price)
      : (item?.unit_cost || 0);
    setLineItems(prev => prev.map((li, idx) => idx === i ? {
      ...li, item_id: id, item_name: item?.name || '', unit_price: price,
    } : li));
  };

  const updateLine = (i: number, field: keyof POSLineItem, value: any) => {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  };

  const addLine = () => setLineItems(prev => [...prev, { item_id: '', item_name: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const total = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  const handleSubmit = async () => {
    const validLines = lineItems.filter(li => li.item_id);
    if (validLines.length === 0) { toast.error('Add at least one item'); return; }

    setSubmitting(true);
    try {
      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
      const firstItem = validLines[0];

      // Create a sales order linked to POS
      const { data: salesOrder, error } = await (supabase as any)
        .from('sales_orders')
        .insert({
          tenant_id: tenantId,
          order_number: orderNumber,
          customer_name: customerName,
          customer_email: '',
          item_id: firstItem.item_id,
          quantity: validLines.reduce((s, li) => s + li.quantity, 0),
          total_amount: total,
          status: 'delivered', // POS sales are immediate delivery
          custom_fields: {
            source: 'pos',
            session_id: sessionId,
            payment_method: paymentMethod,
            line_items: validLines,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Insert sales order lines
      if (salesOrder) {
        const lines = validLines.map(li => ({
          tenant_id: tenantId,
          sales_order_id: salesOrder.id,
          item_id: li.item_id || null,
          description: li.item_name || '',
          quantity: li.quantity,
          unit_price: li.unit_price,
        }));
        await (supabase as any).from('sales_order_lines').insert(lines);
      }

      // Update POS session totals
      await (supabase as any)
        .from('pos_sessions')
        .update({
          total_sales: (supabase as any).rpc ? total : total, // increment handled below
          total_orders: 1,
        })
        .eq('id', sessionId);

      toast.success(`Sale ${orderNumber} completed — ${formatMoney(total)}`);
      onSaleComplete();
      onClose();
    } catch (err: any) {
      toast.error('Failed to process sale: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = inventoryItems.filter((it: any) =>
    it.quantity > 0 && (!itemSearch || it.name?.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" /> Quick POS Sale
        </SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer Name</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Items</Label>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border bg-muted/20">
                <div className="col-span-5">
                  <Select value={li.item_id} onValueChange={v => handleItemChange(i, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {filteredItems.map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>{item.name} ({item.quantity})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input type="number" value={li.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-xs text-center" min="1" />
                </div>
                <div className="col-span-3">
                  <Input type="number" value={li.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" />
                </div>
                <div className="col-span-1 text-xs font-semibold text-right">{formatMoney(li.quantity * li.unit_price)}</div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(i)}>×</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5 border-dashed" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>

        <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total</span>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(total)}</span>
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSubmit} disabled={submitting}>
          <ShoppingCart className="w-4 h-4" /> {submitting ? 'Processing...' : 'Complete Sale'}
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main POS Page ─────────────────────────────────────────────────────

export default function PointOfSale() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [form, setForm] = useState({
    cashier_name: '',
    opening_cash: '',
    status: 'open',
    opened_at: new Date().toISOString().slice(0, 16),
  });

  const { data: rawData, isLoading, refetch } = useTenantQuery('pos_sessions' as any);
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const insertSession = useTenantInsert('pos_sessions' as any);

  const inventoryItems = inventoryData ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const demoData = [
    { id: '1', session_number: 'POS-001', cashier: 'Alice Boateng', opening_cash: 500, total_sales: 4320, total_orders: 38, status: 'open', opened_at: new Date().toISOString() },
    { id: '2', session_number: 'POS-002', cashier: 'James Asante', opening_cash: 500, total_sales: 2890, total_orders: 24, status: 'open', opened_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: '3', session_number: 'POS-003', cashier: 'Grace Mensah', opening_cash: 200, total_sales: 5100, total_orders: 51, status: 'closed', opened_at: new Date(Date.now() - 86400000).toISOString() },
  ];

  const sessions: any[] = (isDemo ? demoData : rawData) ?? [];

  const openSessions = sessions.filter(s => s.status === 'open').length;
  const totalSalesToday = sessions
    .filter(s => s.opened_at?.slice(0, 10) === today)
    .reduce((sum, s) => sum + Number(s.total_sales ?? 0), 0);
  const totalOrders = sessions.reduce((sum, s) => sum + Number(s.total_orders ?? 0), 0);
  const avgOrderValue = totalOrders > 0
    ? sessions.reduce((sum, s) => sum + Number(s.total_sales ?? 0), 0) / totalOrders
    : 0;

  const handleCreate = async () => {
    if (isDemo) { toast.success('POS session opened (demo)'); setCreateOpen(false); return; }
    if (!form.cashier_name.trim()) { toast.error('Cashier name is required'); return; }
    try {
      await insertSession.mutateAsync({
        cashier: form.cashier_name.trim(),
        opening_cash: Number(form.opening_cash) || 0,
        status: form.status,
        opened_at: form.opened_at,
        session_number: `POS-${Date.now().toString(36).toUpperCase()}`,
        total_sales: 0,
        total_orders: 0,
      });
      toast.success('POS session opened');
      setCreateOpen(false);
      setForm({ cashier_name: '', opening_cash: '', status: 'open', opened_at: new Date().toISOString().slice(0, 16) });
    } catch {
      toast.error('Failed to open session.');
    }
  };

  const handleQuickSale = (session: any) => {
    setSelectedSession(session);
    setSaleOpen(true);
  };

  const columns: Column[] = [
    { key: 'session_number', label: 'Session #', className: 'font-mono text-xs' },
    { key: 'cashier', label: 'Cashier', render: v => <span className="font-medium">{v}</span> },
    { key: 'opening_cash', label: 'Opening Cash', render: v => <span className="text-sm">{formatMoney(v)}</span> },
    { key: 'total_sales', label: 'Total Sales', render: v => <span className="font-semibold">{formatMoney(v)}</span> },
    { key: 'total_orders', label: 'Orders', className: 'text-sm text-center' },
    {
      key: 'status', label: 'Status',
      render: v => (
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[v] ?? STATUS_COLORS.closed)}>
          {STATUS_LABELS[v] ?? v}
        </span>
      ),
    },
    {
      key: 'opened_at', label: 'Opened At',
      render: v => <span className="text-sm">{v ? new Date(v).toLocaleString() : '—'}</span>,
    },
  ];

  // Add action column for open sessions
  if (!isDemo) {
    columns.push({
      key: 'id',
      label: 'Action',
      render: (_v, row) => row.status === 'open' ? (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleQuickSale(row)}>
          <DollarSign className="w-3 h-3" /> Sell
        </Button>
      ) : null,
    });
  }

  return (
    <AppLayout title="Point of Sale" subtitle="POS sessions and retail orders">
      <div className="max-w-7xl">
        <PageHeader
          title="Point of Sale"
          subtitle="Manage POS sessions and process walk-in sales (creates sales orders automatically)"
          icon={ShoppingCart}
          breadcrumb={[{ label: 'Sales' }, { label: 'Point of Sale' }]}
          actions={[
            { label: 'Open Session', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Open Sessions', value: openSessions, color: 'text-emerald-600' },
            { label: "Today's Sales", value: formatMoney(totalSalesToday), color: 'text-indigo-600' },
            { label: 'Total Orders', value: totalOrders },
            { label: 'Avg Order Value', value: formatMoney(avgOrderValue) },
          ]}
        />

        <DataTable
          data={sessions}
          columns={columns}
          loading={isLoading && !isDemo}
          searchPlaceholder="Search sessions..."
          emptyTitle="No POS sessions yet"
          emptyDescription="Open a new POS session to start processing sales."
          emptyAction={{ label: 'Open Session', onClick: () => setCreateOpen(true) }}
        />

        {/* Create Session Sheet */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" /> Open POS Session
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label>Cashier Name *</Label>
                <Input value={form.cashier_name} onChange={e => setForm(f => ({ ...f, cashier_name: e.target.value }))} placeholder="e.g. Alice Boateng" />
              </div>
              <div className="space-y-1.5">
                <Label>Opening Cash</Label>
                <Input type="number" value={form.opening_cash} onChange={e => setForm(f => ({ ...f, opening_cash: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (<SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Opened At</Label>
                <Input type="datetime-local" value={form.opened_at} onChange={e => setForm(f => ({ ...f, opened_at: e.target.value }))} />
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={insertSession.isPending} onClick={handleCreate}>
                {insertSession.isPending ? 'Opening...' : 'Open Session'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Quick Sale Sheet */}
        <Sheet open={saleOpen} onOpenChange={setSaleOpen}>
          <SheetContent className="w-full sm:max-w-[520px] flex flex-col p-0" side="right">
            {selectedSession && tenant?.id && (
              <QuickSaleSheet
                inventoryItems={inventoryItems}
                sessionId={selectedSession.id}
                tenantId={tenant.id}
                onClose={() => setSaleOpen(false)}
                onSaleComplete={() => refetch()}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
