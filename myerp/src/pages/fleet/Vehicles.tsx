import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { formatCurrency, formatDate } from '@/lib/mock';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Pencil, Trash2, Loader2, Car, CheckCircle, Wrench, DollarSign,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'lpg';
type VehicleStatus = 'active' | 'in_repair' | 'inactive' | 'sold';

interface Vehicle extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  license_plate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  color: string;
  fuel_type: FuelType;
  acquisition_date: string;
  acquisition_cost: number;
  current_mileage: number;
  status: VehicleStatus;
  driver_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface VehicleForm {
  name: string;
  license_plate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  color: string;
  fuel_type: FuelType;
  acquisition_date: string;
  acquisition_cost: string;
  current_mileage: string;
  status: VehicleStatus;
  driver_name: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TYPES: FuelType[] = ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg'];
const STATUSES: VehicleStatus[] = ['active', 'in_repair', 'inactive', 'sold'];

const STATUS_BADGE: Record<VehicleStatus, 'success' | 'warning' | 'secondary' | 'outline'> = {
  active: 'success',
  in_repair: 'warning',
  inactive: 'secondary',
  sold: 'outline',
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Active',
  in_repair: 'In Repair',
  inactive: 'Inactive',
  sold: 'Sold',
};

const EMPTY_FORM: VehicleForm = {
  name: '',
  license_plate: '',
  make: '',
  model: '',
  year: String(new Date().getFullYear()),
  vin: '',
  color: '',
  fuel_type: 'gasoline',
  acquisition_date: '',
  acquisition_cost: '',
  current_mileage: '',
  status: 'active',
  driver_name: '',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMileage(n: number | string): string {
  const val = Number(n);
  if (isNaN(val)) return '—';
  return val.toLocaleString() + ' mi';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Vehicles() {
  const { rows: vehicles, loading, insert, update, remove } = useTable<Vehicle>(
    'myerp_vehicles',
    'created_at',
    false,
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalCount = vehicles.length;
  const activeCount = vehicles.filter(v => v.status === 'active').length;
  const inRepairCount = vehicles.filter(v => v.status === 'in_repair').length;
  const totalFleetValue = vehicles.reduce((s, v) => s + Number(v.acquisition_cost ?? 0), 0);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter(v => {
      const matchSearch =
        !q ||
        v.name?.toLowerCase().includes(q) ||
        v.license_plate?.toLowerCase().includes(q) ||
        v.driver_name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, search, statusFilter]);

  // ── Sheet actions ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditId(v.id);
    setForm({
      name: v.name ?? '',
      license_plate: v.license_plate ?? '',
      make: v.make ?? '',
      model: v.model ?? '',
      year: String(v.year ?? ''),
      vin: v.vin ?? '',
      color: v.color ?? '',
      fuel_type: v.fuel_type ?? 'gasoline',
      acquisition_date: v.acquisition_date ?? '',
      acquisition_cost: v.acquisition_cost != null ? String(v.acquisition_cost) : '',
      current_mileage: v.current_mileage != null ? String(v.current_mileage) : '',
      status: v.status ?? 'active',
      driver_name: v.driver_name ?? '',
      notes: v.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Vehicle deleted');
    } catch {
      toast.error('Failed to delete vehicle');
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Vehicle name is required'); return; }
    if (!form.license_plate.trim()) { toast.error('License plate is required'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        license_plate: form.license_plate.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year.trim(),
        vin: form.vin.trim(),
        color: form.color.trim(),
        fuel_type: form.fuel_type,
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: form.acquisition_cost !== '' ? Number(form.acquisition_cost) : 0,
        current_mileage: form.current_mileage !== '' ? Number(form.current_mileage) : 0,
        status: form.status,
        driver_name: form.driver_name.trim(),
        notes: form.notes.trim(),
      };

      if (editId) {
        await update(editId, payload);
        toast.success('Vehicle updated');
      } else {
        await insert(payload);
        toast.success('Vehicle added');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Vehicles">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Vehicles">
      <PageHeader
        title="Vehicles"
        subtitle="Manage your fleet of vehicles."
        action={{ label: 'Add Vehicle', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Vehicles
            </CardTitle>
            <Car className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              In Repair
            </CardTitle>
            <Wrench className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{inRepairCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Fleet Value
            </CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(totalFleetValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by name, plate, or driver..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
        {(search || statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Make / Model</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Mileage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      No vehicles found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="font-mono text-sm">{v.license_plate}</TableCell>
                    <TableCell>
                      {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell>{v.year || '—'}</TableCell>
                    <TableCell className="capitalize">{v.fuel_type ?? '—'}</TableCell>
                    <TableCell>{v.driver_name || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMileage(v.current_mileage)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[v.status]}>
                        {STATUS_LABEL[v.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(v)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(v.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className={cn('w-full sm:max-w-lg overflow-y-auto')}>
          <SheetHeader className="mb-4">
            <SheetTitle>{editId ? 'Edit Vehicle' : 'Add Vehicle'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Identity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="v-name">Vehicle Name *</Label>
                <Input
                  id="v-name"
                  placeholder="e.g. Company Truck 1"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-plate">License Plate *</Label>
                <Input
                  id="v-plate"
                  placeholder="ABC-1234"
                  value={form.license_plate}
                  onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-vin">VIN</Label>
                <Input
                  id="v-vin"
                  placeholder="Vehicle ID Number"
                  value={form.vin}
                  onChange={e => setForm(f => ({ ...f, vin: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Make / Model / Year */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-make">Make</Label>
                <Input
                  id="v-make"
                  placeholder="Toyota"
                  value={form.make}
                  onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-model">Model</Label>
                <Input
                  id="v-model"
                  placeholder="Hilux"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-year">Year</Label>
                <Input
                  id="v-year"
                  placeholder="2023"
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-color">Color</Label>
                <Input
                  id="v-color"
                  placeholder="White"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-fuel">Fuel Type</Label>
                <Select
                  id="v-fuel"
                  value={form.fuel_type}
                  onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value as FuelType }))}
                >
                  {FUEL_TYPES.map(ft => (
                    <option key={ft} value={ft} className="capitalize">{ft}</option>
                  ))}
                </Select>
              </div>
            </div>

            <Separator />

            {/* Acquisition */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-acq-date">Acquisition Date</Label>
                <Input
                  id="v-acq-date"
                  type="date"
                  value={form.acquisition_date}
                  onChange={e => setForm(f => ({ ...f, acquisition_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-acq-cost">Acquisition Cost</Label>
                <Input
                  id="v-acq-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.acquisition_cost}
                  onChange={e => setForm(f => ({ ...f, acquisition_cost: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-mileage">Current Mileage</Label>
                <Input
                  id="v-mileage"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.current_mileage}
                  onChange={e => setForm(f => ({ ...f, current_mileage: e.target.value }))}
                />
                {form.current_mileage !== '' && !isNaN(Number(form.current_mileage)) && (
                  <p className="text-xs text-muted-foreground">
                    {Number(form.current_mileage).toLocaleString()} mi
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-status">Status</Label>
                <Select
                  id="v-status"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as VehicleStatus }))}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </Select>
              </div>
            </div>

            <Separator />

            {/* Driver */}
            <div className="space-y-1.5">
              <Label htmlFor="v-driver">Assigned Driver</Label>
              <Input
                id="v-driver"
                placeholder="Driver full name"
                value={form.driver_name}
                onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-notes">Notes</Label>
              <Textarea
                id="v-notes"
                placeholder="Any additional information..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editId ? 'Save Changes' : 'Add Vehicle'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
