import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Users, Plus, Search, Trash2, Edit, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';

function CreateCustomerDialog({ onCreated, isPending }: { onCreated: (r: Record<string, any>) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', address: '', city: '', country: '', tax_id: '', credit_limit: '0' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreated({ ...form, credit_limit: parseFloat(form.credit_limit) || 0 });
    setOpen(false);
    setForm({ name: '', company: '', email: '', phone: '', address: '', city: '', country: '', tax_id: '', credit_limit: '0' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" /> New Customer</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Name *</Label><Input required className="h-8 text-xs" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Company</Label><Input className="h-8 text-xs" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" className="h-8 text-xs" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input className="h-8 text-xs" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Address</Label><Input className="h-8 text-xs" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">City</Label><Input className="h-8 text-xs" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Country</Label><Input className="h-8 text-xs" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Tax ID</Label><Input className="h-8 text-xs" value={form.tax_id} onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Credit Limit</Label><Input type="number" className="h-8 text-xs" value={form.credit_limit} onChange={e => setForm(p => ({ ...p, credit_limit: e.target.value }))} /></div>
          </div>
          <Button type="submit" className="w-full h-8 text-xs" disabled={isPending}>{isPending ? 'Creating...' : 'Add Customer'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const { isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('customers');
  const insert = useTenantInsert('customers');
  const remove = useTenantDelete('customers');
  useRealtimeSync('customers');
  const [search, setSearch] = useState('');

  const customers = data ?? [];
  const filtered = customers.filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));
  const totalOutstanding = customers.reduce((s: number, c: any) => s + Number(c.outstanding_balance || 0), 0);

  return (
    <AppLayout title="Customers" subtitle="Customer profiles & balances">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-lg font-bold text-foreground">{customers.length}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-lg font-bold text-foreground">{customers.filter((c: any) => c.is_active).length}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-warning">{formatMoney(totalOutstanding)}</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search customers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {!isDemo && <CreateCustomerDialog onCreated={insert.mutate} isPending={insert.isPending} />}
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
                {['Name', 'Company', 'Contact', 'Location', 'Credit Limit', 'Outstanding', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.company || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-2.5">{formatMoney(Number(c.credit_limit || 0))}</td>
                    <td className="px-4 py-2.5 font-medium">{formatMoney(Number(c.outstanding_balance || 0))}</td>
                    <td className="px-4 py-2.5">
                      {!isDemo && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No customers found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
