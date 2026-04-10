import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Users, Plus, Search, Trash2, Edit, Mail, Phone, MapPin, FileDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { triggerAutomation } from '@/lib/automation';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePDFReport } from '@/lib/pdf-reports';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ─── Customer Form ─────────────────────────────────────────────────────────

interface CustomerFormData {
  name: string; company: string; email: string; phone: string;
  address: string; city: string; country: string; tax_id: string; credit_limit: string;
}

const emptyForm: CustomerFormData = { name: '', company: '', email: '', phone: '', address: '', city: '', country: '', tax_id: '', credit_limit: '0' };

function CustomerFormFields({ form, setForm }: { form: CustomerFormData; setForm: (f: CustomerFormData) => void }) {
  const set = (k: keyof CustomerFormData, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Name *</Label><Input required className="h-8 text-xs" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Company</Label><Input className="h-8 text-xs" value={form.company} onChange={e => set('company', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" className="h-8 text-xs" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Phone</Label><Input className="h-8 text-xs" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Address</Label><Input className="h-8 text-xs" value={form.address} onChange={e => set('address', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">City</Label><Input className="h-8 text-xs" value={form.city} onChange={e => set('city', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Country</Label><Input className="h-8 text-xs" value={form.country} onChange={e => set('country', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Tax ID</Label><Input className="h-8 text-xs" value={form.tax_id} onChange={e => set('tax_id', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Credit Limit</Label><Input type="number" className="h-8 text-xs" value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} /></div>
      </div>
    </div>
  );
}

// ─── Create Customer Dialog ────────────────────────────────────────────────

function CreateCustomerDialog({ onCreated, isPending }: { onCreated: (r: Record<string, any>) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>({ ...emptyForm });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Customer name is required'); return; }
    onCreated({ ...form, credit_limit: parseFloat(form.credit_limit) || 0 });
    setOpen(false);
    setForm({ ...emptyForm });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-3.5 h-3.5" /> New Customer</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <CustomerFormFields form={form} setForm={setForm} />
          <Button type="submit" className="w-full h-8 text-xs mt-4" disabled={isPending}>{isPending ? 'Creating...' : 'Add Customer'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Customer Sheet ───────────────────────────────────────────────────

function EditCustomerSheet({ customer, onClose, onUpdate, isPending }: {
  customer: any; onClose: () => void; onUpdate: (data: Record<string, any>) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<CustomerFormData>({
    name: customer.name || '', company: customer.company || '', email: customer.email || '',
    phone: customer.phone || '', address: customer.address || '', city: customer.city || '',
    country: customer.country || '', tax_id: customer.tax_id || '',
    credit_limit: String(customer.credit_limit || 0),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Customer name is required'); return; }
    onUpdate({ id: customer.id, ...form, credit_limit: parseFloat(form.credit_limit) || 0 });
    onClose();
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>Edit Customer</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <CustomerFormFields form={form} setForm={setForm} />
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={isPending}>Save Changes</Button>
      </SheetFooter>
    </>
  );
}

// ─── Customer Detail Sheet ─────────────────────────────────────────────────

function CustomerDetailSheet({ customer, orders, invoices, onClose }: {
  customer: any; orders: any[]; invoices: any[]; onClose: () => void;
}) {
  const { formatMoney } = useCurrency();
  const custOrders = orders.filter((o: any) => o.customer_id === customer.id || o.customer_name === customer.name);
  const custInvoices = invoices.filter((i: any) => i.customer_id === customer.id);
  const totalSpent = custOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>{customer.name}</SheetTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          {customer.company && <span>{customer.company}</span>}
          {customer.is_active ? <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge> : <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Contact Info */}
        <Card className="rounded-lg border-border">
          <CardContent className="p-3 space-y-2 text-sm">
            {customer.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /><span>{customer.email}</span></div>}
            {customer.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span>{customer.phone}</span></div>}
            {(customer.address || customer.city || customer.country) && (
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /><span>{[customer.address, customer.city, customer.country].filter(Boolean).join(', ')}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[10px] text-muted-foreground">Orders</p><p className="text-lg font-bold">{custOrders.length}</p></div>
          <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[10px] text-muted-foreground">Total Spent</p><p className="text-lg font-bold">{formatMoney(totalSpent)}</p></div>
          <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[10px] text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-warning">{formatMoney(Number(customer.outstanding_balance || 0))}</p></div>
        </div>

        {/* Recent Orders */}
        {custOrders.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent Orders</h4>
            <div className="space-y-1">
              {custOrders.slice(0, 5).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-xs">
                  <span className="font-mono font-medium">{o.order_number}</span>
                  <span className="text-muted-foreground">{formatMoney(Number(o.total_amount))}</span>
                  <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Customers Page ───────────────────────────────────────────────────

export default function Customers() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('customers');
  const { data: ordersData } = useTenantQuery('sales_orders');
  const { data: invoicesData } = useTenantQuery('invoices');
  const insert = useTenantInsert('customers');
  const update = useTenantUpdate('customers');
  const remove = useTenantDelete('customers');
  useRealtimeSync('customers');
  const [search, setSearch] = useState('');
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [viewCustomer, setViewCustomer] = useState<any>(null);

  const customers = data ?? [];
  const orders = ordersData ?? [];
  const invoices = invoicesData ?? [];
  const filtered = customers.filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()));
  const totalOutstanding = customers.reduce((s: number, c: any) => s + Number(c.outstanding_balance || 0), 0);
  const activeCount = customers.filter((c: any) => c.is_active !== false).length;

  const handleCreate = async (row: Record<string, any>) => {
    const created = await insert.mutateAsync(row);
    void triggerAutomation('new_customer', {
      name: row.name,
      email: row.email,
    }, tenant?.id ?? '');
    return created;
  };

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'Customer Report',
      subtitle: `Generated for ${tenant?.name || 'TELA-ERP'}`,
      tenantName: tenant?.name,
      headers: ['Name', 'Company', 'Email', 'Phone', 'City', 'Credit Limit', 'Outstanding'],
      rows: filtered.map((c: any) => [c.name, c.company || '', c.email || '', c.phone || '', c.city || '', formatMoney(Number(c.credit_limit || 0)), formatMoney(Number(c.outstanding_balance || 0))]),
      stats: [
        { label: 'Total Customers', value: String(customers.length) },
        { label: 'Active', value: String(activeCount) },
        { label: 'Outstanding', value: formatMoney(totalOutstanding) },
      ],
    });
  };

  return (
    <AppLayout title="Customers" subtitle="Customer profiles, orders & balances">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-lg font-bold text-foreground">{customers.length}</p></div>
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-lg font-bold text-foreground">{activeCount}</p></div>
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-warning">{formatMoney(totalOutstanding)}</p></div>
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-lg font-bold text-foreground">{orders.length}</p></div>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search customers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                {!isDemo && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportPDF} disabled={filtered.length === 0}>
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </Button>
                )}
                {!isDemo && <CreateCustomerDialog onCreated={handleCreate} isPending={insert.isPending} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {isLoading && !isDemo ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  {['Name', 'Company', 'Contact', 'Location', 'Credit Limit', 'Outstanding', 'Actions'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map((c: any) => (
                    <motion.tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setViewCustomer(c)}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.company || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-2.5">{formatMoney(Number(c.credit_limit || 0))}</td>
                      <td className="px-4 py-2.5 font-medium">{formatMoney(Number(c.outstanding_balance || 0))}</td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        {!isDemo && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewCustomer(c)}>
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCustomer(c)}>
                              <Edit className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(c.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No customers found</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Customer Sheet */}
      <Sheet open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          {editCustomer && (
            <EditCustomerSheet
              customer={editCustomer}
              onClose={() => setEditCustomer(null)}
              onUpdate={update.mutate}
              isPending={update.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* View Customer Sheet */}
      <Sheet open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          {viewCustomer && (
            <CustomerDetailSheet
              customer={viewCustomer}
              orders={orders}
              invoices={invoices}
              onClose={() => setViewCustomer(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
