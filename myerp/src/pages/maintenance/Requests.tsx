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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Pencil, Trash2, ClipboardList, Plus, Activity, CheckCircle2, Loader2,
} from 'lucide-react';

type MaintenanceType = 'corrective' | 'preventive' | 'electrical' | 'mechanical' | 'other';
type Priority        = 'low' | 'normal' | 'high' | 'very_high';
type RequestStatus   = 'new' | 'in_progress' | 'done' | 'cancelled';

interface MaintenanceRequest extends Record<string, unknown> {
  id: string;
  user_id: string;
  request_number: string;
  equipment_id: string | null;
  equipment_name: string;
  maintenance_type: MaintenanceType;
  priority: Priority;
  description: string;
  requested_by: string;
  assigned_to: string;
  request_date: string;
  scheduled_date: string;
  completion_date: string;
  duration_hours: number | null;
  cost: number | null;
  status: RequestStatus;
  notes: string;
}

type RequestForm = {
  equipment_id: string;
  equipment_name: string;
  maintenance_type: MaintenanceType;
  priority: Priority;
  description: string;
  requested_by: string;
  assigned_to: string;
  request_date: string;
  scheduled_date: string;
  completion_date: string;
  duration_hours: string;
  cost: string;
  status: RequestStatus;
  notes: string;
};

const EMPTY_FORM: RequestForm = {
  equipment_id:     '',
  equipment_name:   '',
  maintenance_type: 'corrective',
  priority:         'normal',
  description:      '',
  requested_by:     '',
  assigned_to:      '',
  request_date:     new Date().toISOString().split('T')[0],
  scheduled_date:   '',
  completion_date:  '',
  duration_hours:   '',
  cost:             '',
  status:           'new',
  notes:            '',
};

const PRIORITY_BADGE: Record<Priority, 'secondary' | 'outline' | 'warning' | 'destructive'> = {
  low:       'secondary',
  normal:    'outline',
  high:      'warning',
  very_high: 'destructive',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low:       'Low',
  normal:    'Normal',
  high:      'High',
  very_high: 'Very High',
};

const STATUS_BADGE: Record<RequestStatus, 'secondary' | 'warning' | 'success' | 'outline'> = {
  new:         'secondary',
  in_progress: 'warning',
  done:        'success',
  cancelled:   'outline',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  new:         'New',
  in_progress: 'In Progress',
  done:        'Done',
  cancelled:   'Cancelled',
};

const TYPE_LABEL: Record<MaintenanceType, string> = {
  corrective:  'Corrective',
  preventive:  'Preventive',
  electrical:  'Electrical',
  mechanical:  'Mechanical',
  other:       'Other',
};

function generateRequestNumber(existing: MaintenanceRequest[]): string {
  const year = new Date().getFullYear();
  const prefix = `MR-${year}-`;
  const nums = existing
    .map(r => r.request_number)
    .filter(n => n?.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export default function MaintenanceRequests() {
  const { rows: items, loading, insert, update, remove } = useTable<MaintenanceRequest>(
    'myerp_maintenance_requests',
    'created_at',
    false,
  );

  const [search, setSearch]               = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [editId, setEditId]               = useState<string | null>(null);
  const [form, setForm]                   = useState<RequestForm>(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);

  // KPI counts
  const totalCount      = items.length;
  const newCount        = items.filter(r => r.status === 'new').length;
  const inProgressCount = items.filter(r => r.status === 'in_progress').length;
  const doneCount       = items.filter(r => r.status === 'done').length;

  // Filtered rows
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(r => {
      const matchSearch =
        (r.request_number ?? '').toLowerCase().includes(q) ||
        (r.equipment_name ?? '').toLowerCase().includes(q);
      const matchPriority = priorityFilter === 'all' || r.priority === priorityFilter;
      const matchStatus   = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchPriority && matchStatus;
    });
  }, [items, search, priorityFilter, statusFilter]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(r: MaintenanceRequest) {
    setEditId(r.id);
    setForm({
      equipment_id:     r.equipment_id ?? '',
      equipment_name:   r.equipment_name ?? '',
      maintenance_type: r.maintenance_type,
      priority:         r.priority,
      description:      r.description ?? '',
      requested_by:     r.requested_by ?? '',
      assigned_to:      r.assigned_to ?? '',
      request_date:     r.request_date ?? '',
      scheduled_date:   r.scheduled_date ?? '',
      completion_date:  r.completion_date ?? '',
      duration_hours:   r.duration_hours != null ? String(r.duration_hours) : '',
      cost:             r.cost != null ? String(r.cost) : '',
      status:           r.status,
      notes:            r.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Request deleted');
    } catch {
      toast.error('Failed to delete request');
    }
  }

  async function handleSave() {
    if (!form.equipment_name.trim()) { toast.error('Equipment name is required'); return; }
    if (!form.description.trim())    { toast.error('Description is required'); return; }
    if (!form.requested_by.trim())   { toast.error('Requested by is required'); return; }

    setSaving(true);
    try {
      const prevStatus = editId ? items.find(r => r.id === editId)?.status : undefined;
      const becomingDone = prevStatus !== 'done' && form.status === 'done';

      const payload = {
        equipment_id:     form.equipment_id.trim() || null,
        equipment_name:   form.equipment_name.trim(),
        maintenance_type: form.maintenance_type,
        priority:         form.priority,
        description:      form.description.trim(),
        requested_by:     form.requested_by.trim(),
        assigned_to:      form.assigned_to.trim(),
        request_date:     form.request_date || null,
        scheduled_date:   form.scheduled_date || null,
        completion_date:  form.completion_date || null,
        duration_hours:   form.duration_hours !== '' ? Number(form.duration_hours) : null,
        cost:             form.cost !== '' ? Number(form.cost) : null,
        status:           form.status,
        notes:            form.notes.trim(),
      };

      if (editId) {
        await update(editId, payload);
        toast.success('Request updated');
      } else {
        const request_number = generateRequestNumber(items);
        await insert({ ...payload, request_number });
        toast.success('Request created');
      }

      // Cross-table update: when status changes to 'done', mark equipment as operational
      if (becomingDone && form.equipment_id.trim()) {
        const { error: eqErr } = await supabase
          .from('myerp_equipment')
          .update({ status: 'operational' })
          .eq('id', form.equipment_id.trim());
        if (eqErr) {
          toast.error('Request saved, but failed to update equipment status');
        }
      }

      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save request');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Maintenance Requests">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Maintenance Requests">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Log and track all equipment maintenance work orders."
        action={{ label: 'New Request', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Requests
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
              New
            </CardTitle>
            <Plus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{newCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              In Progress
            </CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Done
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{doneCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by request # or equipment..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="very_high">Very High</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        {(search || priorityFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => { setSearch(''); setPriorityFilter('all'); setStatusFilter('all'); }}
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
                  <TableHead>Request #</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Duration (h)</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                      No maintenance requests found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-medium">{r.request_number}</TableCell>
                    <TableCell className="font-medium">{r.equipment_name || '—'}</TableCell>
                    <TableCell>{TYPE_LABEL[r.maintenance_type]}</TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_BADGE[r.priority]}>
                        {PRIORITY_LABEL[r.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.requested_by || '—'}</TableCell>
                    <TableCell>
                      {r.assigned_to || <span className="text-muted-foreground text-xs">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      {r.scheduled_date ? formatDate(r.scheduled_date) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.duration_hours != null ? r.duration_hours : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.cost != null ? formatCurrency(Number(r.cost)) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(r.id)}
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

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Request' : 'New Maintenance Request'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Equipment Name & ID */}
            <div className="space-y-1.5">
              <Label htmlFor="mr-eq-name">Equipment Name *</Label>
              <Input
                id="mr-eq-name"
                placeholder="e.g. Air Compressor"
                value={form.equipment_name}
                onChange={e => setForm(f => ({ ...f, equipment_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mr-eq-id">Equipment ID (UUID)</Label>
              <Input
                id="mr-eq-id"
                placeholder="Link to equipment record (optional)"
                value={form.equipment_id}
                onChange={e => setForm(f => ({ ...f, equipment_id: e.target.value }))}
              />
            </div>
            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mr-type">Maintenance Type</Label>
                <Select
                  id="mr-type"
                  value={form.maintenance_type}
                  onChange={e => setForm(f => ({ ...f, maintenance_type: e.target.value as MaintenanceType }))}
                >
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                  <option value="electrical">Electrical</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mr-priority">Priority</Label>
                <Select
                  id="mr-priority"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="very_high">Very High</option>
                </Select>
              </div>
            </div>
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="mr-description">Description *</Label>
              <Textarea
                id="mr-description"
                placeholder="Describe the issue or maintenance needed..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            {/* Requested By & Assigned To */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mr-requested-by">Requested By *</Label>
                <Input
                  id="mr-requested-by"
                  placeholder="Name"
                  value={form.requested_by}
                  onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mr-assigned-to">Assigned To</Label>
                <Input
                  id="mr-assigned-to"
                  placeholder="Technician name"
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                />
              </div>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mr-request-date">Request Date</Label>
                <Input
                  id="mr-request-date"
                  type="date"
                  value={form.request_date}
                  onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mr-scheduled-date">Scheduled Date</Label>
                <Input
                  id="mr-scheduled-date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mr-completion-date">Completion Date</Label>
              <Input
                id="mr-completion-date"
                type="date"
                value={form.completion_date}
                onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))}
              />
            </div>
            {/* Duration & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mr-duration">Duration (hours)</Label>
                <Input
                  id="mr-duration"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={form.duration_hours}
                  onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mr-cost">Cost</Label>
                <Input
                  id="mr-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                />
              </div>
            </div>
            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="mr-status">Status</Label>
              <Select
                id="mr-status"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as RequestStatus }))}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="mr-notes">Notes</Label>
              <Textarea
                id="mr-notes"
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
              {editId ? 'Save Changes' : 'Create Request'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
