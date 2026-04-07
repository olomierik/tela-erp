import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import DataTable, { Column } from '@/components/erp/DataTable';
import { Truck, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  in_repair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  idle: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  sold: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  retired: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  in_repair: 'In Repair',
  idle: 'Idle',
  sold: 'Sold',
  retired: 'Retired',
};

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG', 'CNG'];
const VEHICLE_STATUSES = ['active', 'in_repair', 'idle', 'sold', 'retired'];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

export default function Fleet() {
  const { isDemo } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    license_plate: '',
    make: '',
    model: '',
    year: String(CURRENT_YEAR),
    fuel_type: 'Diesel',
    status: 'active',
    driver_name: '',
    mileage: '',
  });

  const { data: rawData, isLoading } = useTenantQuery('vehicles' as any);
  const insertVehicle = useTenantInsert('vehicles' as any);

  const demoData = [
    { id: '1', name: 'Delivery Van 01', license_plate: 'ABC-1234', make: 'Toyota', model: 'HiAce', year: 2021, fuel_type: 'Diesel', status: 'active', driver_name: 'James Okafor', current_mileage: 42000 },
    { id: '2', name: 'Company Truck 01', license_plate: 'XYZ-5678', make: 'Ford', model: 'Ranger', year: 2020, fuel_type: 'Petrol', status: 'active', driver_name: 'Grace Mensah', current_mileage: 68500 },
    { id: '3', name: 'Executive SUV', license_plate: 'MGR-0012', make: 'Toyota', model: 'Land Cruiser', year: 2022, fuel_type: 'Diesel', status: 'active', driver_name: 'Unassigned', current_mileage: 15200 },
    { id: '4', name: 'Service Van 02', license_plate: 'SVC-3344', make: 'Nissan', model: 'NV200', year: 2019, fuel_type: 'Diesel', status: 'in_repair', driver_name: 'Samuel Adu', current_mileage: 91000 },
    { id: '5', name: 'Old Pickup', license_plate: 'OLD-9999', make: 'Mitsubishi', model: 'L200', year: 2015, fuel_type: 'Diesel', status: 'sold', driver_name: '—', current_mileage: 210000 },
  ];

  const vehicles: any[] = (isDemo ? demoData : rawData) ?? [];

  const totalVehicles = vehicles.length;
  const activeCount = vehicles.filter(v => v.status === 'active').length;
  const inRepairCount = vehicles.filter(v => v.status === 'in_repair').length;
  const soldCount = vehicles.filter(v => v.status === 'sold').length;

  const handleCreate = async () => {
    if (isDemo) { toast.success('Vehicle added (demo)'); setCreateOpen(false); return; }
    if (!form.name || !form.license_plate) {
      toast.error('Name and license plate are required');
      return;
    }
    await insertVehicle.mutateAsync({
      name: form.name,
      license_plate: form.license_plate,
      make: form.make,
      model: form.model,
      year: Number(form.year),
      fuel_type: form.fuel_type,
      status: form.status,
      driver_name: form.driver_name,
      current_mileage: Number(form.mileage) || 0,
    });
    toast.success('Vehicle added successfully');
    setCreateOpen(false);
    setForm({ name: '', license_plate: '', make: '', model: '', year: String(CURRENT_YEAR), fuel_type: 'Diesel', status: 'active', driver_name: '', mileage: '' });
  };

  const columns: Column[] = [
    { key: 'name', label: 'Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'license_plate', label: 'License Plate', className: 'font-mono text-xs' },
    {
      key: 'make', label: 'Make / Model',
      render: (v, row) => <span className="text-sm">{v} {row.model}</span>,
    },
    { key: 'year', label: 'Year', className: 'text-sm' },
    { key: 'fuel_type', label: 'Fuel Type', className: 'text-sm' },
    {
      key: 'status', label: 'Status',
      render: v => (
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[v] ?? STATUS_COLORS.idle)}>
          {STATUS_LABELS[v] ?? v}
        </span>
      ),
    },
    { key: 'driver_name', label: 'Driver', className: 'text-sm' },
    { key: 'current_mileage', label: 'Mileage', render: v => <span className="text-sm">{Number(v).toLocaleString()} km</span> },
  ];

  return (
    <AppLayout title="Fleet" subtitle="Vehicle and fleet management">
      <div className="max-w-7xl">
        <PageHeader
          title="Fleet Management"
          subtitle="Track vehicles, drivers, and fleet operations"
          icon={Truck}
          breadcrumb={[{ label: 'Operations' }, { label: 'Fleet' }]}
          actions={[
            { label: 'New Vehicle', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Total Vehicles', value: totalVehicles },
            { label: 'Active', value: activeCount, color: 'text-emerald-600' },
            { label: 'In Repair', value: inRepairCount, color: 'text-amber-600' },
            { label: 'Sold / Retired', value: soldCount },
          ]}
        />

        <DataTable
          data={vehicles}
          columns={columns}
          loading={isLoading && !isDemo}
          searchPlaceholder="Search vehicles..."
          emptyTitle="No vehicles yet"
          emptyDescription="Add your first vehicle to start managing your fleet."
          emptyAction={{ label: 'New Vehicle', onClick: () => setCreateOpen(true) }}
        />

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" /> New Vehicle
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label>Vehicle Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Delivery Van 01"
                />
              </div>
              <div className="space-y-1.5">
                <Label>License Plate *</Label>
                <Input
                  value={form.license_plate}
                  onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))}
                  placeholder="e.g. ABC-1234"
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Input
                    value={form.make}
                    onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                    placeholder="e.g. Toyota"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    placeholder="e.g. HiAce"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mileage (km)</Label>
                  <Input
                    type="number"
                    value={form.mileage}
                    onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Driver</Label>
                <Input
                  value={form.driver_name}
                  onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}
                  placeholder="Driver name (optional)"
                />
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={insertVehicle.isPending} onClick={handleCreate}>
                {insertVehicle.isPending ? 'Adding...' : 'Add Vehicle'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
