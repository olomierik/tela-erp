import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Truck, Plus, Search, Trash2, Edit, Mail, Phone, MapPin, FileDown, Eye, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePDFReport } from '@/lib/pdf-reports';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ─── Supplier Form ─────────────────────────────────────────────────────────

interface SupplierFormData {
  name: string; contact_person: string; email: string; phone: string;
  address: string; city: string; country: string; tax_id: string;
  payment_terms: string; rating: string; notes: string;
}

const emptyForm: SupplierFormData = {
  name: '', contact_person: '', email: '', phone: '', address: '', city: '',
  country: '', tax_id: '', payment_terms: 'net_30', rating: '3', notes: '',
};

function SupplierFormFields({ form, setForm }: { form: SupplierFormData; setForm: (f: SupplierFormData) => void }) {
  const set = (k: keyof SupplierFormData, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Supplier Name *</Label><Input required className="h-8 text-xs" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Contact Person</Label><Input className="h-8 text-xs" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} /></div>
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
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Tax ID</Label><Input className="h-8 text-xs" value={form.tax_id} onChange={e => set('tax_id', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Payment Terms</Label>
          <Select value={form.payment_terms} onValueChange={v => set('payment_terms', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="net_15">Net 15</SelectItem>
              <SelectItem value="net_30">Net 30</SelectItem>
              <SelectItem value="net_60">Net 60</SelectItem>
              <SelectItem value="net_90">Net 90</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Rating (1-5)</Label>
          <Select value={form.rating} onValueChange={v => set('rating', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(r => <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? 's' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea className="text-xs" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
    </div>
  );
}

// ─── Create Supplier Dialog ────────────────────────────────────────────────

function CreateSupplierDialog({ onCreated, isPending }: { onCreated: (r: Record<string, any>) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupplierFormData>({ ...emptyForm });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    onCreated({ ...form, rating: parseInt(form.rating) || 3 });
    setOpen(false);
    setForm({ ...emptyForm });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-3.5 h-3.5" /> New Supplier</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <SupplierFormFields form={form} setForm={setForm} />
          <Button type="submit" className="w-full h-8 text-xs mt-4" disabled={isPending}>{isPending ? 'Creating...' : 'Add Supplier'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Supplier Sheet ───────────────────────────────────────────────────

function EditSupplierSheet({ supplier, onClose, onUpdate, isPending }: {
  supplier: any; onClose: () => void; onUpdate: (data: Record<string, any>) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<SupplierFormData>({
    name: supplier.name || '', contact_person: supplier.contact_person || '',
    email: supplier.email || '', phone: supplier.phone || '',
    address: supplier.address || '', city: supplier.city || '',
    country: supplier.country || '', tax_id: supplier.tax_id || '',
    payment_terms: supplier.payment_terms || 'net_30',
    rating: String(supplier.rating || 3), notes: supplier.notes || '',
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    onUpdate({ id: supplier.id, ...form, rating: parseInt(form.rating) || 3 });
    onClose();
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border"><SheetTitle>Edit Supplier</SheetTitle></SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4"><SupplierFormFields form={form} setForm={setForm} /></div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={isPending}>Save Changes</Button>
      </SheetFooter>
    </>
  );
}

// ─── Supplier Detail Sheet ─────────────────────────────────────────────────

function SupplierDetailSheet({ supplier, purchaseOrders, onClose }: {
  supplier: any; purchaseOrders: any[]; onClose: () => void;
}) {
  const { formatMoney } = useCurrency();
  const supplierPOs = purchaseOrders.filter((po: any) => po.supplier_id === supplier.id || po.supplier_name === supplier.name);
  const totalPurchased = supplierPOs.reduce((s: number, po: any) => s + Number(po.total_amount || 0), 0);

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>{supplier.name}</SheetTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {supplier.contact_person && <span>{supplier.contact_person}</span>}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn('w-3 h-3', i < (supplier.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
            ))}
          </div>
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <Card className="rounded-lg border-border">
          <CardContent className="p-3 space-y-2 text-sm">
            {supplier.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /><span>{supplier.email}</span></div>}
            {supplier.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span>{supplier.phone}</span></div>}
            {(supplier.address || supplier.city || supplier.country) && (
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /><span>{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ')}</span></div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[10px] text-muted-foreground">POs</p><p className="text-lg font-bold">{supplierPOs.length}</p></div>
          <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[10px] text-muted-foreground">Total Purchased</p><p className="text-lg font-bold">{formatMoney(totalPurchased)}</p></div>
          <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[10px] text-muted-foreground">Terms</p><p className="text-lg font-bold">{(supplier.payment_terms || 'net_30').replace('_', ' ')}</p></div>
        </div>

        {supplierPOs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent Purchase Orders</h4>
            <div className="space-y-1">
              {supplierPOs.slice(0, 5).map((po: any) => (
                <div key={po.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-xs">
                  <span className="font-mono font-medium">{po.po_number}</span>
                  <span className="text-muted-foreground">{formatMoney(Number(po.total_amount))}</span>
                  <Badge variant="outline" className="text-[10px]">{po.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Suppliers Page ───────────────────────────────────────────────────

export default function Suppliers() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('suppliers');
  const { data: posData } = useTenantQuery('purchase_orders');
  const insert = useTenantInsert('suppliers');
  const update = useTenantUpdate('suppliers');
  const remove = useTenantDelete('suppliers');
  useRealtimeSync('suppliers');
  const [search, setSearch] = useState('');
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [viewSupplier, setViewSupplier] = useState<any>(null);

  const suppliers = data ?? [];
  const purchaseOrders = posData ?? [];
  const filtered = suppliers.filter((s: any) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()) || s.contact_person?.toLowerCase().includes(search.toLowerCase()));

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'Supplier Report',
      subtitle: `Generated for ${tenant?.name || 'TELA-ERP'}`,
      tenantName: tenant?.name,
      headers: ['Name', 'Contact', 'Email', 'Phone', 'City', 'Terms', 'Rating'],
      rows: filtered.map((s: any) => [s.name, s.contact_person || '', s.email || '', s.phone || '', s.city || '', s.payment_terms || '', `${s.rating || 0}/5`]),
      stats: [{ label: 'Total Suppliers', value: String(suppliers.length) }],
    });
  };

  return (
    <AppLayout title="Suppliers" subtitle="Supplier management & purchase tracking">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Suppliers</p><p className="text-lg font-bold text-foreground">{suppliers.length}</p></div>
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Purchase Orders</p><p className="text-lg font-bold text-foreground">{purchaseOrders.length}</p></div>
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Avg Rating</p><p className="text-lg font-bold text-foreground">{suppliers.length > 0 ? (suppliers.reduce((s: number, x: any) => s + Number(x.rating || 0), 0) / suppliers.length).toFixed(1) : '0'}/5</p></div>
          <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Purchased</p><p className="text-lg font-bold text-foreground">{formatMoney(purchaseOrders.reduce((s: number, po: any) => s + Number(po.total_amount || 0), 0))}</p></div>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search suppliers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                {!isDemo && <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportPDF}><FileDown className="w-3.5 h-3.5" /> PDF</Button>}
                {!isDemo && <CreateSupplierDialog onCreated={insert.mutate} isPending={insert.isPending} />}
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
                  {['Supplier', 'Contact', 'Email', 'Location', 'Terms', 'Rating', 'Actions'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map((s: any) => (
                    <motion.tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setViewSupplier(s)}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.contact_person || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.email || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-2.5 text-xs"><Badge variant="outline">{(s.payment_terms || 'net_30').replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('w-3 h-3', i < (s.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        {!isDemo && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewSupplier(s)}><Eye className="w-3.5 h-3.5 text-blue-500" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSupplier(s)}><Edit className="w-3.5 h-3.5 text-primary" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No suppliers found</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Supplier Sheet */}
      <Sheet open={!!editSupplier} onOpenChange={() => setEditSupplier(null)}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          {editSupplier && (
            <EditSupplierSheet supplier={editSupplier} onClose={() => setEditSupplier(null)} onUpdate={update.mutate} isPending={update.isPending} />
          )}
        </SheetContent>
      </Sheet>

      {/* View Supplier Sheet */}
      <Sheet open={!!viewSupplier} onOpenChange={() => setViewSupplier(null)}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          {viewSupplier && (
            <SupplierDetailSheet supplier={viewSupplier} purchaseOrders={purchaseOrders} onClose={() => setViewSupplier(null)} />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
