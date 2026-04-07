import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
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
  Pencil, Trash2, Loader2, Fuel, BarChart3, DollarSign, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FuelUnit = 'liters' | 'gallons';

interface FuelLog extends Record<string, unknown> {
  id: string;
  user_id: string;
  vehicle_id: string;
  vehicle_name: string;
  log_date: string;
  mileage: number;
  fuel_qty: number;
  unit: FuelUnit;
  price_per_unit: number;
  total_cost: number;
  station: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Vehicle extends Record<string, unknown> {
  id: string;
  name: string;
}

interface FuelLogForm {
  vehicle_id: string;
  vehicle_name: string;
  log_date: string;
  mileage: string;
  fuel_qty: string;
  unit: FuelUnit;
  price_per_unit: string;
  total_cost: string;
  station: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNITS: FuelUnit[] = ['liters', 'gallons'];

const EMPTY_FORM: FuelLogForm = {
  vehicle_id: '',
  vehicle_name: '',
  log_date: new Date().toISOString().split('T')[0],
  mileage: '',
  fuel_qty: '',
  unit: 'liters',
  price_per_unit: '',
  total_cost: '',
  station: '',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTotalCost(qty: string, price: string): string {
  const q = parseFloat(qty);
  const p = parseFloat(price);
  if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
    return (q * p).toFixed(2);
  }
  return '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuelLogs() {
  const { rows: logs, loading, insert, update, remove } = useTable<FuelLog>(
    'myerp_fuel_logs',
    'log_date',
    false,
  );
  const { rows: vehicles } = useTable<Vehicle>('myerp_vehicles', 'name', true);

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FuelLogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalLogs = logs.length;

  // Total fuel — group by unit since mixing units doesn't make sense
  const totalLiters = logs
    .filter(l => l.unit === 'liters')
    .reduce((s, l) => s + Number(l.fuel_qty ?? 0), 0);
  const totalGallons = logs
    .filter(l => l.unit === 'gallons')
    .reduce((s, l) => s + Number(l.fuel_qty ?? 0), 0);
  const totalFuelLabel = (() => {
    const parts: string[] = [];
    if (totalLiters > 0) parts.push(`${totalLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`);
    if (totalGallons > 0) parts.push(`${totalGallons.toLocaleString(undefined, { maximumFractionDigits: 1 })} gal`);
    return parts.length > 0 ? parts.join(' / ') : '0 L';
  })();

  const totalSpent = logs.reduce((s, l) => s + Number(l.total_cost ?? 0), 0);

  const totalQtyForAvg = totalLiters + totalGallons; // simplified: mixed units average
  const avgCostPerUnit = totalQtyForAvg > 0 ? totalSpent / totalQtyForAvg : 0;

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = vehicleSearch.toLowerCase();
    return logs.filter(l => {
      const matchVehicle = !q || l.vehicle_name?.toLowerCase().includes(q);
      const matchFrom = !dateFrom || l.log_date >= dateFrom;
      const matchTo = !dateTo || l.log_date <= dateTo;
      return matchVehicle && matchFrom && matchTo;
    });
  }, [logs, vehicleSearch, dateFrom, dateTo]);

  // ── Sheet actions ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(l: FuelLog) {
    setEditId(l.id);
    setForm({
      vehicle_id: l.vehicle_id ?? '',
      vehicle_name: l.vehicle_name ?? '',
      log_date: l.log_date ?? new Date().toISOString().split('T')[0],
      mileage: l.mileage != null ? String(l.mileage) : '',
      fuel_qty: l.fuel_qty != null ? String(l.fuel_qty) : '',
      unit: l.unit ?? 'liters',
      price_per_unit: l.price_per_unit != null ? String(l.price_per_unit) : '',
      total_cost: l.total_cost != null ? String(l.total_cost) : '',
      station: l.station ?? '',
      notes: l.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Fuel log deleted');
    } catch {
      toast.error('Failed to delete fuel log');
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

  function handleQtyChange(value: string) {
    setForm(f => ({
      ...f,
      fuel_qty: value,
      total_cost: computeTotalCost(value, f.price_per_unit),
    }));
  }

  function handlePriceChange(value: string) {
    setForm(f => ({
      ...f,
      price_per_unit: value,
      total_cost: computeTotalCost(f.fuel_qty, value),
    }));
  }

  async function handleSave() {
    if (!form.vehicle_id) { toast.error('Please select a vehicle'); return; }
    if (!form.log_date) { toast.error('Log date is required'); return; }
    if (!form.fuel_qty || isNaN(Number(form.fuel_qty))) {
      toast.error('Fuel quantity is required'); return;
    }

    setSaving(true);
    try {
      const payload = {
        vehicle_id: form.vehicle_id,
        vehicle_name: form.vehicle_name,
        log_date: form.log_date,
        mileage: form.mileage !== '' ? Number(form.mileage) : 0,
        fuel_qty: Number(form.fuel_qty),
        unit: form.unit,
        price_per_unit: form.price_per_unit !== '' ? Number(form.price_per_unit) : 0,
        total_cost: form.total_cost !== '' ? Number(form.total_cost) : 0,
        station: form.station.trim(),
        notes: form.notes.trim(),
      };

      if (editId) {
        await update(editId, payload);
        toast.success('Fuel log updated');
      } else {
        await insert(payload);
        toast.success('Fuel log added');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fuel log');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Fuel Logs">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Fuel Logs">
      <PageHeader
        title="Fuel Logs"
        subtitle="Track fuel consumption and costs across your fleet."
        action={{ label: 'Add Fuel Log', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Logs
            </CardTitle>
            <Fuel className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Fuel
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalFuelLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Spent
            </CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Avg Cost / Unit
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(avgCostPerUnit)}</div>
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
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap shrink-0">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap shrink-0">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        {(vehicleSearch || dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => { setVehicleSearch(''); setDateFrom(''); setDateTo(''); }}
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
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Mileage</TableHead>
                  <TableHead className="text-right">Qty + Unit</TableHead>
                  <TableHead className="text-right">Price / Unit</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No fuel logs found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.vehicle_name || '—'}</TableCell>
                    <TableCell>{l.log_date ? formatDate(l.log_date) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.mileage ? Number(l.mileage).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.fuel_qty != null
                        ? `${Number(l.fuel_qty).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${l.unit === 'liters' ? 'L' : 'gal'}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.price_per_unit != null ? formatCurrency(Number(l.price_per_unit)) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(Number(l.total_cost ?? 0))}
                    </TableCell>
                    <TableCell>{l.station || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(l)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(l.id)}
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
            <SheetTitle>{editId ? 'Edit Fuel Log' : 'Add Fuel Log'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Vehicle */}
            <div className="space-y-1.5">
              <Label htmlFor="fl-vehicle">Vehicle *</Label>
              <Select
                id="fl-vehicle"
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
                <Label htmlFor="fl-date">Log Date *</Label>
                <Input
                  id="fl-date"
                  type="date"
                  value={form.log_date}
                  onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fl-mileage">Mileage</Label>
                <Input
                  id="fl-mileage"
                  type="number"
                  min="0"
                  placeholder="Current odometer reading"
                  value={form.mileage}
                  onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Fuel qty + unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fl-qty">Fuel Quantity *</Label>
                <Input
                  id="fl-qty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.fuel_qty}
                  onChange={e => handleQtyChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fl-unit">Unit</Label>
                <Select
                  id="fl-unit"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value as FuelUnit }))}
                >
                  {UNITS.map(u => (
                    <option key={u} value={u} className="capitalize">{u}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fl-price">Price per Unit</Label>
                <Input
                  id="fl-price"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={form.price_per_unit}
                  onChange={e => handlePriceChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fl-total">Total Cost</Label>
                <Input
                  id="fl-total"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Auto-computed"
                  value={form.total_cost}
                  onChange={e => setForm(f => ({ ...f, total_cost: e.target.value }))}
                />
                {form.fuel_qty && form.price_per_unit && (
                  <p className="text-xs text-muted-foreground">
                    {form.fuel_qty} × {form.price_per_unit} = {form.total_cost}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="fl-station">Station</Label>
              <Input
                id="fl-station"
                placeholder="Fuel station name or location"
                value={form.station}
                onChange={e => setForm(f => ({ ...f, station: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fl-notes">Notes</Label>
              <Textarea
                id="fl-notes"
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
              {editId ? 'Save Changes' : 'Add Log'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
