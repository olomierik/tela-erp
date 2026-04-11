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
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/mock';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Pencil, Trash2, Loader2, ClipboardList, Clock, CheckCircle, DollarSign,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType = 'maintenance' | 'repair' | 'inspection' | 'tires' | 'oil_change' | 'other';
type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface VehicleService extends Record<string, unknown> {
  id: string;
  user_id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: ServiceType;
  description: string;
  service_date: string;
  mileage_at_service: number;
  cost: number;
  vendor: string;
  next_service_date: string;
  next_service_mileage: number;
  status: ServiceStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Vehicle extends Record<string, unknown> {
  id: string;
  name: string;
  current_mileage: number;
}

interface ServiceForm {
  vehicle_id: string;
  vehicle_name: string;
  service_type: ServiceType;
  description: string;
  service_date: string;
  mileage_at_service: string;
  cost: string;
  vendor: string;
  next_service_date: string;
  next_service_mileage: string;
  status: ServiceStatus;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPES: ServiceType[] = [
  'maintenance', 'repair', 'inspection', 'tires', 'oil_change', 'other',
];
const STATUSES: ServiceStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];

const STATUS_BADGE: Record<ServiceStatus, 'secondary' | 'warning' | 'success' | 'outline'> = {
  scheduled: 'secondary',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'outline',
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  maintenance: 'Maintenance',
  repair: 'Repair',
  inspection: 'Inspection',
  tires: 'Tires',
  oil_change: 'Oil Change',
  other: 'Other',
};

const EMPTY_FORM: ServiceForm = {
  vehicle_id: '',
  vehicle_name: '',
  service_type: 'maintenance',
  description: '',
  service_date: new Date().toISOString().split('T')[0],
  mileage_at_service: '',
  cost: '',
  vendor: '',
  next_service_date: '',
  next_service_mileage: '',
  status: 'scheduled',
  notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleServices() {
  const { rows: services, loading, insert, update, remove } = useTable<VehicleService>(
    'myerp_vehicle_services',
    'created_at',
    false,
  );
  const { rows: vehicles } = useTable<Vehicle>('myerp_vehicles', 'name', true);

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalCount = services.length;
  const scheduledCount = services.filter(s => s.status === 'scheduled').length;
  const inProgressCount = services.filter(s => s.status === 'in_progress').length;
  const totalCost = services.reduce((sum, s) => sum + Number(s.cost ?? 0), 0);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = vehicleSearch.toLowerCase();
    return services.filter(s => {
      const matchVehicle = !q || s.vehicle_name?.toLowerCase().includes(q);
      const matchType = serviceTypeFilter === 'all' || s.service_type === serviceTypeFilter;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchVehicle && matchType && matchStatus;
    });
  }, [services, vehicleSearch, serviceTypeFilter, statusFilter]);

  // ── Sheet actions ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(s: VehicleService) {
    setEditId(s.id);
    setForm({
      vehicle_id: s.vehicle_id ?? '',
      vehicle_name: s.vehicle_name ?? '',
      service_type: s.service_type ?? 'maintenance',
      description: s.description ?? '',
      service_date: s.service_date ?? '',
      mileage_at_service: s.mileage_at_service != null ? String(s.mileage_at_service) : '',
      cost: s.cost != null ? String(s.cost) : '',
      vendor: s.vendor ?? '',
      next_service_date: s.next_service_date ?? '',
      next_service_mileage: s.next_service_mileage != null ? String(s.next_service_mileage) : '',
      status: s.status ?? 'scheduled',
      notes: s.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Service record deleted');
    } catch {
      toast.error('Failed to delete service record');
    }
  }

  function handleVehicleChange(vehicleId: string) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setForm(f => ({
      ...f,
      vehicle_id: vehicleId,
      vehicle_name: vehicle?.name ?? '',
    }));
  }

  async function handleSave() {
    if (!form.vehicle_id) { toast.error('Please select a vehicle'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.service_date) { toast.error('Service date is required'); return; }

    setSaving(true);
    try {
      const mileageAtService = form.mileage_at_service !== '' ? Number(form.mileage_at_service) : 0;
      const payload = {
        vehicle_id: form.vehicle_id,
        vehicle_name: form.vehicle_name,
        service_type: form.service_type,
        description: form.description.trim(),
        service_date: form.service_date,
        mileage_at_service: mileageAtService,
        cost: form.cost !== '' ? Number(form.cost) : 0,
        vendor: form.vendor.trim(),
        next_service_date: form.next_service_date || null,
        next_service_mileage: form.next_service_mileage !== '' ? Number(form.next_service_mileage) : null,
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editId) {
        await update(editId, payload);
        toast.success('Service record updated');
      } else {
        await insert(payload);
        toast.success('Service record created');
      }

      // Cross-table update: if completed and vehicle exists, update mileage if higher
      if (form.status === 'completed' && form.vehicle_id && mileageAtService > 0) {
        const vehicle = vehicles.find(v => v.id === form.vehicle_id);
        if (vehicle && mileageAtService > Number(vehicle.current_mileage ?? 0)) {
          await supabase
            .from('myerp_vehicles')
            .update({ current_mileage: mileageAtService })
            .eq('id', form.vehicle_id);
        }
      }

      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save service record');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Vehicle Services">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Vehicle Services">
      <PageHeader
        title="Vehicle Services"
        subtitle="Track maintenance, repairs, and inspections for your fleet."
        action={{ label: 'New Service', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Services
            </CardTitle>
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Scheduled
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{scheduledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              In Progress
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Cost
            </CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by vehicle name..."
          value={vehicleSearch}
          onChange={e => setVehicleSearch(e.target.value)}
        />
        <Select
          value={serviceTypeFilter}
          onChange={e => setServiceTypeFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Types</option>
          {SERVICE_TYPES.map(t => (
            <option key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</option>
          ))}
        </Select>
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
        {(vehicleSearch || serviceTypeFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => { setVehicleSearch(''); setServiceTypeFilter('all'); setStatusFilter('all'); }}
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
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Mileage</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No service records found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.vehicle_name || '—'}</TableCell>
                    <TableCell>{SERVICE_TYPE_LABEL[s.service_type] ?? s.service_type}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{s.description}</TableCell>
                    <TableCell>{s.service_date ? formatDate(s.service_date) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.mileage_at_service ? Number(s.mileage_at_service).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(Number(s.cost ?? 0))}
                    </TableCell>
                    <TableCell>{s.vendor || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.next_service_date ? formatDate(s.next_service_date) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[s.status]}>
                        {STATUS_LABEL[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(s.id)}
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
            <SheetTitle>{editId ? 'Edit Service Record' : 'New Service Record'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Vehicle selector */}
            <div className="space-y-1.5">
              <Label htmlFor="svc-vehicle">Vehicle *</Label>
              <Select
                id="svc-vehicle"
                value={form.vehicle_id}
                onChange={e => handleVehicleChange(e.target.value)}
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name as string}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-type">Service Type</Label>
                <Select
                  id="svc-type"
                  value={form.service_type}
                  onChange={e => setForm(f => ({ ...f, service_type: e.target.value as ServiceType }))}
                >
                  {SERVICE_TYPES.map(t => (
                    <option key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-status">Status</Label>
                <Select
                  id="svc-status"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as ServiceStatus }))}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">Description *</Label>
              <Input
                id="svc-desc"
                placeholder="Describe the service performed..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-date">Service Date *</Label>
                <Input
                  id="svc-date"
                  type="date"
                  value={form.service_date}
                  onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-mileage">Mileage at Service</Label>
                <Input
                  id="svc-mileage"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.mileage_at_service}
                  onChange={e => setForm(f => ({ ...f, mileage_at_service: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-cost">Cost</Label>
                <Input
                  id="svc-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-vendor">Vendor</Label>
                <Input
                  id="svc-vendor"
                  placeholder="Service provider name"
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-next-date">Next Service Date</Label>
                <Input
                  id="svc-next-date"
                  type="date"
                  value={form.next_service_date}
                  onChange={e => setForm(f => ({ ...f, next_service_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-next-mileage">Next Service Mileage</Label>
                <Input
                  id="svc-next-mileage"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.next_service_mileage}
                  onChange={e => setForm(f => ({ ...f, next_service_mileage: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-notes">Notes</Label>
              <Textarea
                id="svc-notes"
                placeholder="Any additional notes..."
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
              {editId ? 'Save Changes' : 'Create Record'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
