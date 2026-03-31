import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { genId } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, Building2, Globe, Star, Users } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  category: string;
  payment_terms: string;
  rating: number;
  status: 'active' | 'inactive' | 'blacklisted';
}

const INITIAL_VENDORS: Vendor[] = [
  { id: genId(), name: 'Apex Raw Materials Ltd', contact_person: 'James Okafor', email: 'james@apexraw.com', phone: '+1-555-0101', country: 'USA', category: 'Raw Materials', payment_terms: 'Net 30', rating: 4.5, status: 'active' },
  { id: genId(), name: 'TechParts Global', contact_person: 'Lin Wei', email: 'lin.wei@techparts.cn', phone: '+86-21-5500-1234', country: 'China', category: 'Electronics', payment_terms: 'Net 60', rating: 4.1, status: 'active' },
  { id: genId(), name: 'OfficeWorld Supplies', contact_person: 'Priya Sharma', email: 'priya@officeworld.in', phone: '+91-80-4100-5678', country: 'India', category: 'Office Supplies', payment_terms: 'COD', rating: 3.8, status: 'active' },
  { id: genId(), name: 'FastFreight Logistics', contact_person: 'Carlos Mendez', email: 'carlos@fastfreight.mx', phone: '+52-55-1234-5678', country: 'Mexico', category: 'Logistics', payment_terms: 'Net 30', rating: 4.7, status: 'active' },
  { id: genId(), name: 'ProServ Consulting', contact_person: 'Sophie Laurent', email: 'sophie@proserv.fr', phone: '+33-1-4200-9900', country: 'France', category: 'Services', payment_terms: 'Net 90', rating: 3.5, status: 'inactive' },
  { id: genId(), name: 'NorthStar Materials', contact_person: 'Erik Hansen', email: 'erik@northstar.no', phone: '+47-21-00-1234', country: 'Norway', category: 'Raw Materials', payment_terms: 'Net 60', rating: 4.3, status: 'active' },
  { id: genId(), name: 'CircuitBase Inc', contact_person: 'Tomoko Nakamura', email: 'tnakamura@circuitbase.jp', phone: '+81-3-5555-9876', country: 'Japan', category: 'Electronics', payment_terms: 'Net 30', rating: 4.9, status: 'active' },
  { id: genId(), name: 'QuickShip Co', contact_person: 'Ahmed Al-Rashid', email: 'ahmed@quickship.ae', phone: '+971-4-555-0099', country: 'UAE', category: 'Logistics', payment_terms: 'COD', rating: 2.1, status: 'blacklisted' },
  { id: genId(), name: 'Stationery Hub', contact_person: 'Amara Diallo', email: 'amara@stationeryhub.ng', phone: '+234-1-555-2345', country: 'Nigeria', category: 'Office Supplies', payment_terms: 'Net 30', rating: 3.9, status: 'active' },
  { id: genId(), name: 'Global Consult Group', contact_person: 'Lena Becker', email: 'lena@globalconsult.de', phone: '+49-30-1234-5678', country: 'Germany', category: 'Services', payment_terms: 'Net 60', rating: 4.0, status: 'inactive' },
];

const CATEGORIES = ['Raw Materials', 'Electronics', 'Office Supplies', 'Logistics', 'Services'];
const PAYMENT_TERMS = ['Net 30', 'Net 60', 'Net 90', 'COD'];

const statusVariant: Record<Vendor['status'], 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  inactive: 'secondary',
  blacklisted: 'destructive',
};

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Omit<Vendor, 'id'>>({
    name: '', contact_person: '', email: '', phone: '',
    country: '', category: 'Raw Materials', payment_terms: 'Net 30',
    rating: 4.0, status: 'active',
  });

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.status === 'active').length;
  const countries = new Set(vendors.map(v => v.country)).size;
  const avgRating = vendors.length ? vendors.reduce((s, v) => s + v.rating, 0) / vendors.length : 0;

  function openCreate() {
    setEditing(null);
    setForm({ name: '', contact_person: '', email: '', phone: '', country: '', category: 'Raw Materials', payment_terms: 'Net 30', rating: 4.0, status: 'active' });
    setSheetOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditing(vendor);
    const { id: _id, ...rest } = vendor;
    setForm(rest);
    setSheetOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Vendor name is required'); return; }
    if (editing) {
      setVendors(vs => vs.map(v => v.id === editing.id ? { ...form, id: editing.id } : v));
      toast.success('Vendor updated');
    } else {
      setVendors(vs => [...vs, { ...form, id: genId() }]);
      toast.success('Vendor added');
    }
    setSheetOpen(false);
  }

  function handleDelete(id: string) {
    setVendors(vs => vs.filter(v => v.id !== id));
    toast.success('Vendor removed');
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <AppLayout title="Vendors">
      <PageHeader
        title="Vendors"
        subtitle="Manage supplier profiles, ratings, and payment terms"
        action={{ label: 'Add Vendor', onClick: openCreate }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Vendors</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{activeVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Countries</CardTitle>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{countries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Rating</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">★ {avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>
                      <div>{v.contact_person}</div>
                      <div className="text-xs text-muted-foreground">{v.email}</div>
                    </TableCell>
                    <TableCell>{v.country}</TableCell>
                    <TableCell>{v.category}</TableCell>
                    <TableCell>{v.payment_terms}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm font-medium text-warning">
                        <Star className="w-3.5 h-3.5 fill-warning" />
                        {v.rating.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[v.status]} className="capitalize">{v.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="v-name">Name</Label>
              <Input id="v-name" value={form.name} onChange={set('name')} placeholder="Vendor name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-contact">Contact Person</Label>
              <Input id="v-contact" value={form.contact_person} onChange={set('contact_person')} placeholder="Full name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-email">Email</Label>
              <Input id="v-email" type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-phone">Phone</Label>
              <Input id="v-phone" value={form.phone} onChange={set('phone')} placeholder="+1-555-0000" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-country">Country</Label>
              <Input id="v-country" value={form.country} onChange={set('country')} placeholder="Country" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-category">Category</Label>
              <Select id="v-category" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-terms">Payment Terms</Label>
              <Select id="v-terms" value={form.payment_terms} onChange={set('payment_terms')}>
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-status">Status</Label>
              <Select id="v-status" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Vendor'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
