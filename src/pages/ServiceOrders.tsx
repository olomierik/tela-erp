import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Wrench, Plus, Search, Trash2, FileDown, Clock, CheckCircle,
  XCircle, PlayCircle, CalendarDays, DollarSign, ChevronRight,
  MapPin, UserCheck, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { onServiceOrderCreated, onServiceOrderCancelled } from '@/hooks/use-cross-module';
import { generatePDFReport } from '@/lib/pdf-reports';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Service orders are stored in sales_orders with custom_fields.order_type = 'service'
// Display statuses: pending | confirmed | in_progress | completed | cancelled
// DB status column is constrained to: pending | confirmed | shipped | delivered | cancelled
// Mapping: in_progress <-> shipped, completed <-> delivered
// True display status is stored in custom_fields.service_status

const ORDER_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const STATUS_CONFIG: Record<OrderStatus, { label: string; class: string; icon: any }> = {
  pending:     { label: 'Pending',     class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',    icon: Clock },
  confirmed:   { label: 'Confirmed',   class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',       icon: CheckCircle },
  in_progress: { label: 'In Progress', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400', icon: PlayCircle },
  completed:   { label: 'Completed',   class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',   icon: CheckCircle },
  cancelled:   { label: 'Cancelled',   class: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',           icon: XCircle },
};

// Map display status to the DB-allowed value
function toDbStatus(displayStatus: string): string {
  if (displayStatus === 'in_progress') return 'shipped';
  if (displayStatus === 'completed') return 'delivered';
  return displayStatus;
}

// Derive display status from an order row (prefers custom_fields.service_status)
function getDisplayStatus(order: any): OrderStatus {
  const svcStatus = order.custom_fields?.service_status;
  if (svcStatus && ORDER_STATUSES.includes(svcStatus as OrderStatus)) return svcStatus as OrderStatus;
  // Fallback: reverse-map DB status
  if (order.status === 'shipped') return 'in_progress';
  if (order.status === 'delivered') return 'completed';
  return (order.status as OrderStatus) ?? 'pending';
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status as OrderStatus] ?? STATUS_CONFIG.pending;
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.class)}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}

function OrderTimeline({ status }: { status: string }) {
  const stages: OrderStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];
  const activeIdx = stages.indexOf(status as OrderStatus);
  if (status === 'cancelled') return (
    <div className="flex items-center gap-2 text-red-500 text-xs"><XCircle className="w-4 h-4" /> Cancelled</div>
  );
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => {
        const s = STATUS_CONFIG[stage];
        const done = i <= activeIdx;
        return (
          <div key={stage} className="flex items-center">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
              done ? s.class : 'bg-muted text-muted-foreground'
            )}>
              {done ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < stages.length - 1 && (
              <ChevronRight className={cn('w-3 h-3 mx-0.5', done ? 'text-teal-500' : 'text-muted-foreground/30')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Service Order Sheet ───────────────────────────────────────────────

interface ServiceLine {
  service_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

function CreateServiceOrderSheet({
  catalogItems, customers, onClose, isPending, onCreate,
}: {
  catalogItems: any[]; customers: any[]; onClose: () => void;
  isPending: boolean; onCreate: (row: Record<string, any>) => void;
}) {
  const { formatMoney } = useCurrency();
  const [form, setForm] = useState({
    order_number: `SRV-${String(Date.now()).slice(-6)}`,
    customer_id: '', customer_name: '', customer_email: '', customer_phone: '',
    scheduled_date: '', scheduled_time: '', assigned_to: '', location: '', notes: '',
    status: 'pending',
  });
  const [lines, setLines] = useState<ServiceLine[]>([
    { service_id: '', description: '', quantity: 1, unit_price: 0 },
  ]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCustomer = (id: string) => {
    const c = customers.find((c: any) => c.id === id);
    setForm(f => ({
      ...f, customer_id: id,
      customer_name: c?.name ?? '',
      customer_email: c?.email ?? '',
      customer_phone: c?.phone ?? '',
    }));
  };

  const handleServiceSelect = (i: number, serviceId: string) => {
    const svc = catalogItems.find((s: any) => s.id === serviceId);
    setLines(prev => prev.map((li, idx) => idx === i ? {
      ...li,
      service_id: serviceId,
      description: svc?.name ?? '',
      unit_price: svc ? Number(svc.selling_price) : 0,
    } : li));
  };

  const updateLine = (i: number, field: keyof ServiceLine, value: any) =>
    setLines(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));

  const addLine = () => setLines(prev => [...prev, { service_id: '', description: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  const handleSubmit = () => {
    if (!form.customer_name.trim() && !form.customer_id) { toast.error('Customer is required'); return; }
    const validLines = lines.filter(li => li.description.trim());
    if (validLines.length === 0) { toast.error('Add at least one service line'); return; }

    onCreate({
      order_number: form.order_number,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      status: toDbStatus(form.status),
      total_amount: total,
      custom_fields: {
        order_type: 'service',
        service_status: form.status,
        customer_phone: form.customer_phone || null,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        assigned_to: form.assigned_to || null,
        location: form.location || null,
        notes: form.notes || null,
        line_items: validLines.map(li => ({
          service_id: li.service_id || null,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
        })),
      },
    });
    onClose();
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>New Service Order</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Order info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Order Number</Label>
            <Input value={form.order_number} onChange={e => set('order_number', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Initial Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Customer */}
        {customers.length > 0 && (
          <div className="space-y-1.5">
            <Label>Select Existing Customer</Label>
            <Select value={form.customer_id} onValueChange={handleCustomer}>
              <SelectTrigger><SelectValue placeholder="Select customer (optional)" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer Name *</Label>
            <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+255 700 000 000" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={form.customer_email} onChange={e => set('customer_email', e.target.value)} placeholder="customer@email.com" type="email" />
        </div>

        {/* Scheduling */}
        <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduling</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Scheduled Date</Label>
              <Input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Staff / technician" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Site address" />
            </div>
          </div>
        </div>

        {/* Service Lines */}
        <div>
          <Label className="mb-2 block">Services</Label>
          <div className="space-y-2">
            {lines.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border bg-muted/20">
                <div className="col-span-5">
                  {catalogItems.length > 0 ? (
                    <Select
                      value={li.service_id}
                      onValueChange={v => {
                        if (v === '__custom__') {
                          setLines(prev => prev.map((l, idx) => idx === i ? { ...l, service_id: '__custom__', description: '', unit_price: 0 } : l));
                        } else {
                          handleServiceSelect(i, v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {catalogItems.map((svc: any) => (
                          <SelectItem key={svc.id} value={svc.id}>
                            {svc.name} — {formatMoney(Number(svc.selling_price))}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">Custom / Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-8 text-xs"
                      placeholder="Service description"
                      value={li.description}
                      onChange={e => updateLine(i, 'description', e.target.value)}
                    />
                  )}
                </div>
                {/* Show description field when service is custom or when selected from catalog */}
                <div className={cn(li.service_id && li.service_id !== '__custom__' && catalogItems.length > 0 ? 'col-span-2 hidden' : 'col-span-2')}>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Description"
                    value={li.description}
                    onChange={e => updateLine(i, 'description', e.target.value)}
                  />
                </div>
                {li.service_id && li.service_id !== '__custom__' && catalogItems.length > 0 && (
                  <div className="col-span-2 text-xs text-muted-foreground truncate">{li.description}</div>
                )}
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={li.quantity}
                    onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 1)}
                    className="h-8 text-xs text-center"
                    placeholder="Qty"
                    min="0.1"
                    step="0.5"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={li.unit_price}
                    onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right"
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-1 text-xs font-semibold text-right">
                  {formatMoney(li.quantity * li.unit_price)}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeLine(i)}>×</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5 border-dashed" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" /> Add Line
          </Button>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
          <span className="text-sm text-teal-700 dark:text-teal-300 font-medium">Order Total</span>
          <span className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatMoney(total)}</span>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Special instructions, access codes, customer preferences..."
            rows={2}
          />
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={handleSubmit} disabled={isPending}>
          <Wrench className="w-4 h-4" /> Create Order
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main ServiceOrders Page ──────────────────────────────────────────────────

export default function ServiceOrders() {
  const navigate = useNavigate();
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();

  // Both tables already exist in the database — no migration needed
  const { data: rawOrders, isLoading } = useTenantQuery('sales_orders');
  const { data: rawItems } = useTenantQuery('inventory_items');
  const { data: customersData } = useTenantQuery('customers');
  const insertMutation = useTenantInsert('sales_orders');
  const updateMutation = useTenantUpdate('sales_orders');
  const remove = useTenantDelete('sales_orders');
  useRealtimeSync('sales_orders');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  // Filter to service orders only (exclude product sales orders)
  const allOrders: any[] = rawOrders ?? [];
  const orders = allOrders.filter((o: any) => o.custom_fields?.order_type === 'service');

  // Filter catalog to service items only
  const allItems: any[] = rawItems ?? [];
  const catalogItems = allItems.filter((i: any) => i.custom_fields?.item_type === 'service' && i.custom_fields?.is_active !== false);

  const customers: any[] = customersData ?? [];

  // Stats
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const pendingCount = orders.filter((o: any) => getDisplayStatus(o) === 'pending').length;
  const inProgressCount = orders.filter((o: any) => getDisplayStatus(o) === 'in_progress').length;
  const completedCount = orders.filter((o: any) => getDisplayStatus(o) === 'completed').length;

  const filtered = orders.filter((o: any) => {
    const cf = o.custom_fields ?? {};
    const matchSearch = !search
      || o.order_number?.toLowerCase().includes(search.toLowerCase())
      || o.customer_name?.toLowerCase().includes(search.toLowerCase())
      || cf.assigned_to?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || getDisplayStatus(o) === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = (row: Record<string, any>) => {
    insertMutation.mutate(row, {
      onSuccess: async (data: any) => {
        if (!tenant?.id || !data?.id) return;
        // Post service revenue when order is confirmed immediately
        if (row.custom_fields?.service_status === 'confirmed' || row.status === 'confirmed') {
          await onServiceOrderCreated(tenant.id, {
            id: data.id,
            order_number: data.order_number,
            customer_name: data.customer_name,
            total_amount: Number(data.total_amount),
          });
        }
      },
    });
  };

  const handleStatusChange = async (order: any, newStatus: string) => {
    const currentDisplayStatus = getDisplayStatus(order);
    const updatedCf = {
      ...(order.custom_fields ?? {}),
      service_status: newStatus,
      ...(newStatus === 'completed' ? { completed_date: new Date().toISOString().split('T')[0] } : {}),
    };
    const updates: Record<string, any> = {
      id: order.id,
      status: toDbStatus(newStatus),
      custom_fields: updatedCf,
    };
    updateMutation.mutate(updates, {
      onSuccess: async () => {
        if (!tenant?.id) return;
        // Post revenue when transitioning to confirmed for the first time
        if (newStatus === 'confirmed' && currentDisplayStatus === 'pending') {
          await onServiceOrderCreated(tenant.id, {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            total_amount: Number(order.total_amount),
          });
        }
        // Reverse revenue if cancelling a confirmed/active order
        if (newStatus === 'cancelled' && ['confirmed', 'in_progress', 'completed'].includes(currentDisplayStatus)) {
          await onServiceOrderCancelled(tenant.id, {
            id: order.id,
            order_number: order.order_number,
            total_amount: Number(order.total_amount),
          });
        }
      },
    });
  };

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'Service Orders Report',
      subtitle: tenant?.name,
      tenantName: tenant?.name,
      headers: ['Order #', 'Customer', 'Scheduled', 'Assigned To', 'Amount', 'Status'],
      rows: filtered.map((o: any) => {
        const cf = o.custom_fields ?? {};
        return [
          o.order_number,
          o.customer_name,
          cf.scheduled_date ? new Date(cf.scheduled_date).toLocaleDateString() : '—',
          cf.assigned_to || '—',
          formatMoney(Number(o.total_amount)),
          STATUS_CONFIG[getDisplayStatus(o)]?.label ?? o.status,
        ];
      }),
      stats: [
        { label: 'Total Revenue', value: formatMoney(totalRevenue) },
        { label: 'Completed', value: String(completedCount) },
        { label: 'In Progress', value: String(inProgressCount) },
      ],
    });
  };

  const handleGenerateInvoice = (order: any) => {
    const cf = order.custom_fields ?? {};
    const lineItems = (cf.line_items ?? []).map((li: any) => {
      const svcName = catalogItems.find((s: any) => s.id === li.service_id)?.name;
      return {
        description: svcName || li.description || 'Service',
        quantity: li.quantity ?? 1,
        unit_price: li.unit_price ?? 0,
        discount_percent: 0,
      };
    });
    navigate('/invoices', {
      state: {
        prefill: {
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          reference: order.order_number,
          amount: order.total_amount,
          line_items: lineItems.length > 0 ? lineItems : undefined,
        },
      },
    });
    toast.info('Invoice pre-filled from service order — review and save');
  };

  return (
    <AppLayout title="Service Orders" subtitle="Schedule, track & deliver services">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Service Revenue', value: isDemo ? formatMoney(124500) : formatMoney(totalRevenue), icon: DollarSign, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
            { label: 'Pending', value: isDemo ? '8' : String(pendingCount), icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
            { label: 'In Progress', value: isDemo ? '5' : String(inProgressCount), icon: PlayCircle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Completed', value: isDemo ? '47' : String(completedCount), icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
          ].map(stat => (
            <motion.div key={stat.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="rounded-xl border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {!isDemo && (
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleExportPDF} disabled={filtered.length === 0}>
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </Button>
            )}
            {!isDemo && (
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> New Order
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading && !isDemo ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Order #</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Progress</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  {!isDemo && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o: any) => {
                  const cf = o.custom_fields ?? {};
                  const displayStatus = getDisplayStatus(o);
                  return (
                    <motion.tr key={o.id} className="hover:bg-accent/40 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.customer_name}</p>
                        {cf.customer_phone && <p className="text-xs text-muted-foreground">{cf.customer_phone}</p>}
                        {cf.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{cf.location}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {cf.scheduled_date ? (
                          <div>
                            <p className="text-xs font-medium text-foreground flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-muted-foreground" />
                              {new Date(cf.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            {cf.scheduled_time && <p className="text-xs text-muted-foreground ml-4">{cf.scheduled_time.slice(0, 5)}</p>}
                            {cf.assigned_to && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <UserCheck className="w-3 h-3" />{cf.assigned_to}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell"><OrderTimeline status={displayStatus} /></td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{formatMoney(Number(o.total_amount))}</td>
                      <td className="px-4 py-3"><StatusBadge status={displayStatus} /></td>
                      {!isDemo && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {['confirmed', 'in_progress', 'completed'].includes(displayStatus) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-700" title="Create Invoice" onClick={() => handleGenerateInvoice(o)}>
                                <FileText className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!['completed', 'cancelled'].includes(displayStatus) && (
                              <Select onValueChange={v => handleStatusChange(o, v)}>
                                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                                <SelectContent>
                                  {displayStatus === 'pending'     && <SelectItem value="confirmed">Confirm</SelectItem>}
                                  {displayStatus === 'confirmed'   && <SelectItem value="in_progress">Start Work</SelectItem>}
                                  {displayStatus === 'in_progress' && <SelectItem value="completed">Mark Complete</SelectItem>}
                                  <SelectItem value="cancelled">Cancel</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remove.mutate(o.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No service orders found</p>
                {!isDemo && (
                  <Button className="mt-4 bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4" /> Create First Order
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[560px] flex flex-col p-0" side="right">
          <CreateServiceOrderSheet
            catalogItems={catalogItems}
            customers={customers}
            onClose={() => setCreateOpen(false)}
            isPending={insertMutation.isPending}
            onCreate={handleCreate}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
