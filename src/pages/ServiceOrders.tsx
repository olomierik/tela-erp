import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Wrench, Plus, Search, Trash2, FileDown, Clock, CheckCircle,
  XCircle, PlayCircle, CalendarDays, Users, DollarSign, TrendingUp,
  ChevronRight, MapPin, UserCheck, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const STATUS_CONFIG: Record<OrderStatus, { label: string; class: string; icon: any }> = {
  pending:     { label: 'Pending',     class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',    icon: Clock },
  confirmed:   { label: 'Confirmed',   class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',       icon: CheckCircle },
  in_progress: { label: 'In Progress', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400', icon: PlayCircle },
  completed:   { label: 'Completed',   class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',   icon: CheckCircle },
  cancelled:   { label: 'Cancelled',   class: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',           icon: XCircle },
};

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

interface ServiceLineItem {
  service_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

function CreateServiceOrderSheet({
  services, customers, onClose, isPending, onCreate,
}: {
  services: any[]; customers: any[]; onClose: () => void;
  isPending: boolean; onCreate: (row: Record<string, any>, lines: ServiceLineItem[]) => void;
}) {
  const { formatMoney } = useCurrency();
  const [form, setForm] = useState({
    order_number: `SRV-${String(Date.now()).slice(-6)}`,
    customer_id: '', customer_name: '', customer_email: '', customer_phone: '',
    scheduled_date: '', scheduled_time: '', assigned_to: '', location: '', notes: '',
    status: 'pending',
  });
  const [lineItems, setLineItems] = useState<ServiceLineItem[]>([
    { service_id: '', description: '', quantity: 1, unit_price: 0 },
  ]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCustomer = (id: string) => {
    const c = customers.find((c: any) => c.id === id);
    setForm(f => ({ ...f, customer_id: id, customer_name: c?.name ?? '', customer_email: c?.email ?? '', customer_phone: c?.phone ?? '' }));
  };

  const handleServiceChange = (i: number, serviceId: string) => {
    const svc = services.find((s: any) => s.id === serviceId);
    setLineItems(prev => prev.map((li, idx) => idx === i ? {
      ...li, service_id: serviceId,
      description: svc?.name ?? '',
      unit_price: svc ? Number(svc.price) : 0,
    } : li));
  };

  const updateLine = (i: number, field: keyof ServiceLineItem, value: any) =>
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));

  const addLine = () => setLineItems(prev => [...prev, { service_id: '', description: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const total = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const activeServices = services.filter((s: any) => s.is_active);

  const handleSubmit = () => {
    if (!form.customer_name.trim() && !form.customer_id) { toast.error('Customer is required'); return; }
    const validLines = lineItems.filter(li => li.description.trim());
    if (validLines.length === 0) { toast.error('Add at least one service line'); return; }
    onCreate(
      {
        order_number: form.order_number,
        customer_id: form.customer_id || null,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        status: form.status,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        assigned_to: form.assigned_to || null,
        location: form.location || null,
        notes: form.notes || null,
        total_amount: total,
        custom_fields: { line_items: validLines },
      },
      validLines
    );
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
              <Input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Staff / technician name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location / Address</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Site address" />
            </div>
          </div>
        </div>

        {/* Service Lines */}
        <div>
          <Label className="mb-2 block">Services</Label>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border bg-muted/20">
                <div className="col-span-5">
                  {activeServices.length > 0 ? (
                    <Select value={li.service_id} onValueChange={v => handleServiceChange(i, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {activeServices.map((svc: any) => (
                          <SelectItem key={svc.id} value={svc.id}>
                            {svc.name} — {formatMoney(Number(svc.price))}
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
                {/* Show description field when "custom" or after service selected */}
                {(li.service_id === '__custom__' || !li.service_id) && activeServices.length > 0 ? (
                  <div className="col-span-5">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Description"
                      value={li.description}
                      onChange={e => updateLine(i, 'description', e.target.value)}
                    />
                  </div>
                ) : null}
                <div className={cn(li.service_id === '__custom__' || !li.service_id ? 'col-span-1' : 'col-span-2')}>
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
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={li.unit_price}
                    onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right"
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-1 text-xs font-semibold text-right text-foreground">
                  {formatMoney(li.quantity * li.unit_price)}
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
  const { data, isLoading } = useTenantQuery('service_orders');
  const { data: servicesData } = useTenantQuery('services');
  const { data: customersData } = useTenantQuery('customers');
  const insertMutation = useTenantInsert('service_orders');
  const updateMutation = useTenantUpdate('service_orders');
  const remove = useTenantDelete('service_orders');
  useRealtimeSync('service_orders' as any);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const orders: any[] = data ?? [];
  const services: any[] = servicesData ?? [];
  const customers: any[] = customersData ?? [];

  // Stats
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
  const inProgressCount = orders.filter((o: any) => o.status === 'in_progress').length;
  const completedCount = orders.filter((o: any) => o.status === 'completed').length;

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search
      || o.order_number?.toLowerCase().includes(search.toLowerCase())
      || o.customer_name?.toLowerCase().includes(search.toLowerCase())
      || o.assigned_to?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = (row: Record<string, any>, lines: ServiceLineItem[]) => {
    insertMutation.mutate(row, {
      onSuccess: async (data: any) => {
        if (!tenant?.id || !data?.id) return;

        // Persist line items
        if (lines.length > 0) {
          const lineRows = lines.map(li => ({
            tenant_id: tenant.id,
            service_order_id: data.id,
            service_id: (li.service_id && li.service_id !== '__custom__') ? li.service_id : null,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            line_total: li.quantity * li.unit_price,
          }));
          await (supabase as any).from('service_order_lines').insert(lineRows);
        }

        // Post revenue when confirmed (not just pending)
        if (row.status === 'confirmed') {
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
    await updateMutation.mutateAsync({ id: order.id, status: newStatus, ...(newStatus === 'completed' ? { completed_date: new Date().toISOString().split('T')[0] } : {}) });

    if (!tenant?.id) return;

    if (newStatus === 'confirmed' && order.status === 'pending') {
      // Post revenue when transitioning from pending → confirmed
      await onServiceOrderCreated(tenant.id, {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        total_amount: Number(order.total_amount),
      });
    }

    if (newStatus === 'cancelled') {
      // Reverse revenue only if it was already confirmed/in_progress/completed
      if (['confirmed', 'in_progress', 'completed'].includes(order.status)) {
        await onServiceOrderCancelled(tenant.id, {
          id: order.id,
          order_number: order.order_number,
          total_amount: Number(order.total_amount),
        });
      }
    }
  };

  const handleGenerateInvoice = (order: any) => {
    // Navigate to invoices with prefilled query params (invoices page handles this gracefully)
    navigate('/invoices', {
      state: {
        prefill: {
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          reference: order.order_number,
          amount: order.total_amount,
          description: `Service Order ${order.order_number}`,
        },
      },
    });
    toast.info('Create an invoice for this service order in Invoices');
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
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => generatePDFReport({
                title: 'Service Orders Report',
                subtitle: tenant?.name,
                tenantName: tenant?.name,
                headers: ['Order #', 'Customer', 'Scheduled', 'Assigned To', 'Amount', 'Status'],
                rows: orders.map((o: any) => [
                  o.order_number, o.customer_name,
                  o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString() : '—',
                  o.assigned_to || '—',
                  formatMoney(Number(o.total_amount)),
                  STATUS_CONFIG[o.status as OrderStatus]?.label ?? o.status,
                ]),
                stats: [
                  { label: 'Total Revenue', value: formatMoney(totalRevenue) },
                  { label: 'Completed', value: String(completedCount) },
                ],
              })} disabled={orders.length === 0}>
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
                {filtered.map((o: any) => (
                  <motion.tr key={o.id} className="hover:bg-accent/40 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{o.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.customer_name}</p>
                      {o.customer_phone && <p className="text-xs text-muted-foreground">{o.customer_phone}</p>}
                      {o.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{o.location}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {o.scheduled_date ? (
                        <div>
                          <p className="text-xs font-medium text-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-muted-foreground" />
                            {new Date(o.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {o.scheduled_time && <p className="text-xs text-muted-foreground ml-4">{o.scheduled_time.slice(0, 5)}</p>}
                          {o.assigned_to && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <UserCheck className="w-3 h-3" />{o.assigned_to}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell"><OrderTimeline status={o.status} /></td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{formatMoney(Number(o.total_amount))}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    {!isDemo && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Invoice shortcut */}
                          {['confirmed', 'in_progress', 'completed'].includes(o.status) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-700" title="Create Invoice" onClick={() => handleGenerateInvoice(o)}>
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {/* Status updater */}
                          {!['completed', 'cancelled'].includes(o.status) && (
                            <Select onValueChange={(v) => handleStatusChange(o, v)}>
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                              <SelectContent>
                                {o.status === 'pending'     && <SelectItem value="confirmed">Confirm</SelectItem>}
                                {o.status === 'confirmed'   && <SelectItem value="in_progress">Start Work</SelectItem>}
                                {o.status === 'in_progress' && <SelectItem value="completed">Mark Complete</SelectItem>}
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
                ))}
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

      {/* Create Order Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[560px] flex flex-col p-0" side="right">
          <CreateServiceOrderSheet
            services={services}
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
