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
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Warehouse as WarehouseIcon, CheckCircle, MapPin, Users, Loader2 } from 'lucide-react';

interface Warehouse extends Record<string, unknown> {
  id: string;
  name: string;
  location: string;
  manager: string;
  status: 'active' | 'inactive';
}

const statusVariant: Record<Warehouse['status'], 'success' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
};

type WarehouseForm = {
  name: string;
  location: string;
  manager: string;
  status: 'active' | 'inactive';
};

export default function Warehouses() {
  const { rows: warehouses, loading, insert, update, remove } = useTable<Warehouse>('myerp_warehouses');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseForm>({
    name: '',
    location: '',
    manager: '',
    status: 'active',
  });

  const totalWarehouses = warehouses.length;
  const activeWarehouses = warehouses.filter(w => w.status === 'active').length;
  const locations = new Set(warehouses.map(w => w.location)).size;
  const managers = new Set(warehouses.map(w => w.manager).filter(Boolean)).size;

  function openCreate() {
    setEditing(null);
    setForm({ name: '', location: '', manager: '', status: 'active' });
    setSheetOpen(true);
  }

  function openEdit(warehouse: Warehouse) {
    setEditing(warehouse);
    setForm({
      name: warehouse.name,
      location: warehouse.location,
      manager: warehouse.manager,
      status: warehouse.status,
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Warehouse name is required'); return; }  // form.name is string
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Warehouse updated');
      } else {
        await insert(form);
        toast.success('Warehouse added');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save warehouse');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Warehouse removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete warehouse');
    }
  }

  const set = (key: keyof WarehouseForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <AppLayout title="Warehouses">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Warehouses">
      <PageHeader
        title="Warehouses"
        subtitle="Configure multiple warehouses, storage locations, and management"
        action={{ label: 'Add Warehouse', onClick: openCreate }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Warehouses</CardTitle>
            <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalWarehouses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{activeWarehouses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Locations</CardTitle>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{locations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Managers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{managers}</div>
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
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.location}</TableCell>
                    <TableCell>{w.manager}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[w.status]} className="capitalize">{w.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(w)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(w.id)}>
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
            <SheetTitle>{editing ? 'Edit Warehouse' : 'Add Warehouse'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="wh-name">Name</Label>
              <Input id="wh-name" value={form.name} onChange={set('name')} placeholder="Main Warehouse" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-location">Location</Label>
              <Input id="wh-location" value={form.location} onChange={set('location')} placeholder="City, Country" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-manager">Manager</Label>
              <Input id="wh-manager" value={form.manager} onChange={set('manager')} placeholder="Manager name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-status">Status</Label>
              <Select id="wh-status" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Warehouse'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
