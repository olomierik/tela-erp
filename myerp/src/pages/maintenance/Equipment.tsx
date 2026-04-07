import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Pencil, Trash2, Wrench, CheckCircle2, AlertTriangle, Settings2, Loader2,
} from 'lucide-react';

type EquipmentStatus = 'operational' | 'needs_repair' | 'under_maintenance' | 'scrapped';

interface Equipment extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  code: string;
  category: string;
  location: string;
  technician: string;
  acquisition_date: string;
  acquisition_cost: number;
  serial_number: string;
  manufacturer: string;
  model: string;
  warranty_expiry: string;
  status: EquipmentStatus;
  notes: string;
}

type EquipmentForm = {
  name: string;
  code: string;
  category: string;
  location: string;
  technician: string;
  acquisition_date: string;
  acquisition_cost: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  warranty_expiry: string;
  status: EquipmentStatus;
  notes: string;
};

const EMPTY_FORM: EquipmentForm = {
  name: '',
  code: '',
  category: '',
  location: '',
  technician: '',
  acquisition_date: '',
  acquisition_cost: '',
  serial_number: '',
  manufacturer: '',
  model: '',
  warranty_expiry: '',
  status: 'operational',
  notes: '',
};

const STATUS_BADGE: Record<EquipmentStatus, 'success' | 'destructive' | 'warning' | 'outline'> = {
  operational:       'success',
  needs_repair:      'destructive',
  under_maintenance: 'warning',
  scrapped:          'outline',
};

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  operational:       'Operational',
  needs_repair:      'Needs Repair',
  under_maintenance: 'Under Maintenance',
  scrapped:          'Scrapped',
};

function isWarrantyWarning(dateStr: string): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 30; // expired (<=0) or within 30 days
}

export default function EquipmentPage() {
  const { rows: items, loading, insert, update, remove } = useTable<Equipment>(
    'myerp_equipment',
    'created_at',
    false,
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // KPI counts
  const totalCount        = items.length;
  const operationalCount  = items.filter(e => e.status === 'operational').length;
  const needsRepairCount  = items.filter(e => e.status === 'needs_repair').length;
  const underMaintCount   = items.filter(e => e.status === 'under_maintenance').length;

  // Filtered rows
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(e => {
      const matchSearch =
        e.name.toLowerCase().includes(q) ||
        (e.code ?? '').toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(eq: Equipment) {
    setEditId(eq.id);
    setForm({
      name:             eq.name,
      code:             eq.code ?? '',
      category:         eq.category ?? '',
      location:         eq.location ?? '',
      technician:       eq.technician ?? '',
      acquisition_date: eq.acquisition_date ?? '',
      acquisition_cost: eq.acquisition_cost != null ? String(eq.acquisition_cost) : '',
      serial_number:    eq.serial_number ?? '',
      manufacturer:     eq.manufacturer ?? '',
      model:            eq.model ?? '',
      warranty_expiry:  eq.warranty_expiry ?? '',
      status:           eq.status,
      notes:            eq.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Equipment deleted');
    } catch {
      toast.error('Failed to delete equipment');
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Equipment name is required'); return; }
    if (!form.code.trim()) { toast.error('Equipment code is required'); return; }

    setSaving(true);
    try {
      const payload = {
        name:             form.name.trim(),
        code:             form.code.trim(),
        category:         form.category.trim(),
        location:         form.location.trim(),
        technician:       form.technician.trim(),
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: form.acquisition_cost !== '' ? Number(form.acquisition_cost) : null,
        serial_number:    form.serial_number.trim(),
        manufacturer:     form.manufacturer.trim(),
        model:            form.model.trim(),
        warranty_expiry:  form.warranty_expiry || null,
        status:           form.status,
        notes:            form.notes.trim(),
      };

      if (editId) {
        await update(editId, payload);
        toast.success('Equipment updated');
      } else {
        await insert(payload);
        toast.success('Equipment added');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save equipment');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Equipment">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Equipment">
      <PageHeader
        title="Equipment"
        subtitle="Track and manage all maintenance equipment and assets."
        action={{ label: 'Add Equipment', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Equipment
            </CardTitle>
            <Wrench className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Operational
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{operationalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Needs Repair
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{needsRepairCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Under Maintenance
            </CardTitle>
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{underMaintCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by name, code, or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-52"
        >
          <option value="all">All Statuses</option>
          <option value="operational">Operational</option>
          <option value="needs_repair">Needs Repair</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="scrapped">Scrapped</option>
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
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manufacturer / Model</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Warranty Expiry</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No equipment found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(eq => {
                  const warrantyWarn = isWarrantyWarning(eq.warranty_expiry);
                  return (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell className="font-mono text-xs">{eq.code}</TableCell>
                      <TableCell>{eq.category || '—'}</TableCell>
                      <TableCell>{eq.location || '—'}</TableCell>
                      <TableCell>
                        {eq.manufacturer || eq.model ? (
                          <div>
                            {eq.manufacturer && <div className="text-sm">{eq.manufacturer}</div>}
                            {eq.model && <div className="text-xs text-muted-foreground">{eq.model}</div>}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{eq.serial_number || '—'}</TableCell>
                      <TableCell>
                        {eq.warranty_expiry ? (
                          <span className={cn('text-sm', warrantyWarn && 'text-destructive font-medium')}>
                            {formatDate(eq.warranty_expiry)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{eq.technician || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[eq.status]}>
                          {STATUS_LABEL[eq.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(eq)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(eq.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Equipment' : 'Add Equipment'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Name & Code */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eq-name">Name *</Label>
                <Input
                  id="eq-name"
                  placeholder="e.g. Air Compressor"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eq-code">Code *</Label>
                <Input
                  id="eq-code"
                  placeholder="e.g. EQ-001"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                />
              </div>
            </div>
            {/* Category & Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eq-category">Category</Label>
                <Input
                  id="eq-category"
                  placeholder="e.g. Mechanical"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eq-location">Location</Label>
                <Input
                  id="eq-location"
                  placeholder="e.g. Warehouse A"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            {/* Manufacturer & Model */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eq-manufacturer">Manufacturer</Label>
                <Input
                  id="eq-manufacturer"
                  placeholder="e.g. Bosch"
                  value={form.manufacturer}
                  onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eq-model">Model</Label>
                <Input
                  id="eq-model"
                  placeholder="e.g. GBH 2-26"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                />
              </div>
            </div>
            {/* Serial Number */}
            <div className="space-y-1.5">
              <Label htmlFor="eq-serial">Serial Number</Label>
              <Input
                id="eq-serial"
                placeholder="e.g. SN-20240101-001"
                value={form.serial_number}
                onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
              />
            </div>
            {/* Acquisition Date & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eq-acq-date">Acquisition Date</Label>
                <Input
                  id="eq-acq-date"
                  type="date"
                  value={form.acquisition_date}
                  onChange={e => setForm(f => ({ ...f, acquisition_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eq-acq-cost">Acquisition Cost</Label>
                <Input
                  id="eq-acq-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.acquisition_cost}
                  onChange={e => setForm(f => ({ ...f, acquisition_cost: e.target.value }))}
                />
              </div>
            </div>
            {/* Warranty Expiry */}
            <div className="space-y-1.5">
              <Label htmlFor="eq-warranty">Warranty Expiry</Label>
              <Input
                id="eq-warranty"
                type="date"
                value={form.warranty_expiry}
                onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))}
              />
            </div>
            {/* Technician */}
            <div className="space-y-1.5">
              <Label htmlFor="eq-technician">Assigned Technician</Label>
              <Input
                id="eq-technician"
                placeholder="Technician name"
                value={form.technician}
                onChange={e => setForm(f => ({ ...f, technician: e.target.value }))}
              />
            </div>
            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="eq-status">Status</Label>
              <Select
                id="eq-status"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipmentStatus }))}
              >
                <option value="operational">Operational</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="scrapped">Scrapped</option>
              </Select>
            </div>
            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="eq-notes">Notes</Label>
              <Textarea
                id="eq-notes"
                placeholder="Additional notes..."
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
              {editId ? 'Save Changes' : 'Add Equipment'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
