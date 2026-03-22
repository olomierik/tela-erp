import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Plus, Search, Trash2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

function CreateSupplierDialog({ onCreated, isPending }: { onCreated: (r: Record<string, any>) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', city: '', country: '', payment_terms: 'net_30' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreated(form);
    setOpen(false);
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '', city: '', country: '', payment_terms: 'net_30' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" /> New Supplier</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Company Name *</Label><Input required className="h-8 text-xs" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Contact Person</Label><Input className="h-8 text-xs" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" className="h-8 text-xs" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input className="h-8 text-xs" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Address</Label><Input className="h-8 text-xs" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">City</Label><Input className="h-8 text-xs" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Country</Label><Input className="h-8 text-xs" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Payment Terms</Label>
              <Select value={form.payment_terms} onValueChange={v => setForm(p => ({ ...p, payment_terms: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">COD</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full h-8 text-xs" disabled={isPending}>{isPending ? 'Creating...' : 'Add Supplier'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Suppliers() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useTenantQuery('suppliers');
  const insert = useTenantInsert('suppliers');
  const remove = useTenantDelete('suppliers');
  useRealtimeSync('suppliers');
  const [search, setSearch] = useState('');

  const suppliers = data ?? [];
  const filtered = suppliers.filter((s: any) => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout title="Suppliers" subtitle="Vendor management & contacts">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Suppliers</p><p className="text-lg font-bold text-foreground">{suppliers.length}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-lg font-bold text-foreground">{suppliers.filter((s: any) => s.is_active).length}</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search suppliers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {!isDemo && <CreateSupplierDialog onCreated={insert.mutate} isPending={insert.isPending} />}
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
                {['Supplier', 'Contact', 'Location', 'Payment Terms', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground">{s.name}</div>
                      {s.contact_person && <div className="text-xs text-muted-foreground">{s.contact_person}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                      {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{(s.payment_terms || 'net_30').replace('_', ' ').toUpperCase()}</Badge></td>
                    <td className="px-4 py-2.5">
                      {!isDemo && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No suppliers found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
