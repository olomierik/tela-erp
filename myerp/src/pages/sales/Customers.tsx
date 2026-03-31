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
import { genId, formatCurrency, formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, Users, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  country: string;
  total_orders: number;
  total_revenue: number;
  status: 'active' | 'inactive';
  created_at: string;
}

const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@techvision.com', phone: '+1 415 555 0192', company: 'TechVision Ltd', industry: 'Technology', country: 'USA', total_orders: 14, total_revenue: 128450, status: 'active', created_at: '2024-01-15' },
  { id: '2', name: 'Marcus Johnson', email: 'm.johnson@globalmart.com', phone: '+1 312 555 0847', company: 'GlobalMart', industry: 'Retail', country: 'USA', total_orders: 8, total_revenue: 54200, status: 'active', created_at: '2024-02-03' },
  { id: '3', name: 'Elena Petrova', email: 'e.petrova@datacore.io', phone: '+44 20 7946 0831', company: 'DataCore Systems', industry: 'Technology', country: 'UK', total_orders: 22, total_revenue: 211600, status: 'active', created_at: '2023-11-20' },
  { id: '4', name: 'James Okafor', email: 'j.okafor@sunriseretail.ng', phone: '+234 1 555 0374', company: 'Sunrise Retail', industry: 'Retail', country: 'Nigeria', total_orders: 5, total_revenue: 31750, status: 'active', created_at: '2024-03-10' },
  { id: '5', name: 'Priya Nair', email: 'priya@medibridge.in', phone: '+91 98765 43210', company: 'MediBridge Health', industry: 'Healthcare', country: 'India', total_orders: 11, total_revenue: 89300, status: 'active', created_at: '2024-01-28' },
  { id: '6', name: 'Thomas Ritter', email: 't.ritter@acmecorp.de', phone: '+49 30 555 0622', company: 'Acme Corp', industry: 'Manufacturing', country: 'Germany', total_orders: 19, total_revenue: 175800, status: 'active', created_at: '2023-09-05' },
  { id: '7', name: 'Aisha Diallo', email: 'aisha@nexafinance.fr', phone: '+33 1 55 00 4821', company: 'Nexa Finance', industry: 'Finance', country: 'France', total_orders: 7, total_revenue: 63400, status: 'inactive', created_at: '2024-04-15' },
  { id: '8', name: 'Carlos Mendez', email: 'c.mendez@logistix.mx', phone: '+52 55 5555 0928', company: 'LogistiX', industry: 'Logistics', country: 'Mexico', total_orders: 16, total_revenue: 142100, status: 'active', created_at: '2023-12-01' },
  { id: '9', name: 'Yuki Tanaka', email: 'y.tanaka@oriontech.jp', phone: '+81 3 5555 0741', company: 'Orion Technologies', industry: 'Technology', country: 'Japan', total_orders: 3, total_revenue: 18500, status: 'inactive', created_at: '2024-05-20' },
  { id: '10', name: 'Fatima Al-Rashid', email: 'f.alrashid@pharmaplus.ae', phone: '+971 4 555 0283', company: 'PharmaPlus', industry: 'Healthcare', country: 'UAE', total_orders: 9, total_revenue: 77650, status: 'active', created_at: '2024-02-14' },
  { id: '11', name: 'Liam O\'Brien', email: 'l.obrien@greenchain.ie', phone: '+353 1 555 0519', company: 'GreenChain Logistics', industry: 'Logistics', country: 'Ireland', total_orders: 12, total_revenue: 104200, status: 'active', created_at: '2023-10-08' },
  { id: '12', name: 'Natasha Volkov', email: 'n.volkov@nordmanufacturing.se', phone: '+46 8 555 0367', company: 'Nord Manufacturing', industry: 'Manufacturing', country: 'Sweden', total_orders: 6, total_revenue: 47300, status: 'inactive', created_at: '2024-06-01' },
];

const INDUSTRIES = ['Technology', 'Healthcare', 'Retail', 'Manufacturing', 'Finance', 'Logistics'];

const emptyForm = {
  name: '', email: '', phone: '', company: '', industry: '', country: '', status: 'active' as 'active' | 'inactive',
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = customers.reduce((s, c) => s + c.total_revenue, 0);
  const activeCount = customers.filter(c => c.status === 'active').length;
  const avgRevenue = customers.length ? totalRevenue / customers.length : 0;

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id);
    setForm({ name: c.name, email: c.email, phone: c.phone, company: c.company, industry: c.industry, country: c.country, status: c.status });
    setSheetOpen(true);
  }

  function handleDelete(id: string) {
    setCustomers(prev => prev.filter(c => c.id !== id));
    toast.success('Customer deleted');
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (editId) {
      setCustomers(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
      toast.success('Customer updated');
    } else {
      const newCustomer: Customer = {
        id: genId(),
        ...form,
        total_orders: 0,
        total_revenue: 0,
        created_at: new Date().toISOString().split('T')[0],
      };
      setCustomers(prev => [newCustomer, ...prev]);
      toast.success('Customer created');
    }
    setSheetOpen(false);
  }

  return (
    <AppLayout title="Customers">
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles, contact history, and relationship data."
        action={{ label: 'New Customer', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Customers</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{customers.length}</span>
              <Users className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{activeCount}</span>
              <Activity className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
              <DollarSign className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg. Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(avgRevenue)}</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-40">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">No customers found.</TableCell>
                </TableRow>
              )}
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell>{c.industry}</TableCell>
                  <TableCell>{c.country}</TableCell>
                  <TableCell className="text-right">{c.total_orders}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(c.total_revenue)}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'active' ? 'success' : 'outline'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Customer' : 'New Customer'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Sarah Chen" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="sarah@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+1 415 555 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Acme Corp" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input placeholder="USA" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Save Changes' : 'Create Customer'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
