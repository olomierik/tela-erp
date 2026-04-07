import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Factory, CheckCircle2, Wrench, Gauge, Loader2 } from 'lucide-react';

type WCStatus = 'active' | 'inactive' | 'maintenance';

interface WorkCenter extends Record<string, unknown> {
  id: string;
  name: string;
  code: string;
  capacity: number;
  cost_per_hour: number;
  status: WCStatus;
  notes: string;
}

type WorkCenterForm = {
  name: string;
  code: string;
  capacity: number;
  cost_per_hour: number;
  status: WCStatus;
  notes: string;
};

const BLANK: WorkCenterForm = {
  name: '', code: '', capacity: 1, cost_per_hour: 0, status: 'active', notes: '',
};

const statusVariant: Record<WCStatus, 'success' | 'secondary' | 'warning'> = {
  active: 'success',
  inactive: 'secondary',
  maintenance: 'warning',
};

const statusLabel: Record<WCStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
};

export default function WorkCenters() {
  const { rows: workCenters, loading, insert, update, remove } = useTable<WorkCenter>('myerp_work_centers', 'name', true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkCenter | null>(null);
  const [form, setForm] = useState<WorkCenterForm>(BLANK);
  const [saving, setSaving] = useState(false);

  const total = workCenters.length;
  const active = workCenters.filter(w => w.status === 'active').length;
  const maintenance = workCenters.filter(w => w.status === 'maintenance').length;
  const totalCapacity = workCenters
    .filter(w => w.status === 'active')
    .reduce((sum, w) => sum + Number(w.capacity), 0);

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(wc: WorkCenter) {
    setEditing(wc);
    setForm({
      name: wc.name as string,
      code: wc.code as string,
      capacity: wc.capacity as number,
      cost_per_hour: wc.cost_per_hour as number,
      status: wc.status as WCStatus,
      notes: wc.notes as string,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Work center updated');
      } else {
        await insert(form);
        toast.success('Work center created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Work center deleted');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field<K extends keyof WorkCenterForm>(key: K, value: WorkCenterForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Work Centers">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Work Centers">
      <PageHeader
        title="Work Centers"
        subtitle="Manage manufacturing work centers and their capacity"
        action={{ label: 'New Work Center', onClick: openNew }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: total, icon: Factory, color: 'text-primary' },
          { label: 'Active', value: active, icon: CheckCircle2, color: 'text-success' },
          { label: 'Under Maintenance', value: maintenance, icon: Wrench, color: 'text-warning' },
          { label: 'Total Capacity (Active)', value: `${totalCapacity.toLocaleString()} u/hr`, icon: Gauge, color: 'text-info' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Capacity (units/hr)</TableHead>
                <TableHead>Cost/Hour</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No work centers yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                workCenters.map(wc => (
                  <TableRow key={wc.id}>
                    <TableCell className="font-medium">{wc.name}</TableCell>
                    <TableCell className="font-mono text-xs">{wc.code}</TableCell>
                    <TableCell>{Number(wc.capacity).toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(Number(wc.cost_per_hour))}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[wc.status as WCStatus]}>
                        {statusLabel[wc.status as WCStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(wc)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(wc.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet form */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Work Center' : 'New Work Center'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="wc-name">Name</Label>
              <Input
                id="wc-name"
                value={form.name}
                onChange={e => field('name', e.target.value)}
                placeholder="e.g. CNC Machine A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wc-code">Code</Label>
              <Input
                id="wc-code"
                value={form.code}
                onChange={e => field('code', e.target.value.toUpperCase())}
                placeholder="e.g. CNC-A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wc-capacity">Capacity (units/hr)</Label>
              <Input
                id="wc-capacity"
                type="number"
                min={0}
                value={form.capacity}
                onChange={e => field('capacity', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wc-cost">Cost per Hour ($)</Label>
              <Input
                id="wc-cost"
                type="number"
                min={0}
                step={0.01}
                value={form.cost_per_hour}
                onChange={e => field('cost_per_hour', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wc-status">Status</Label>
              <Select
                id="wc-status"
                value={form.status}
                onChange={e => field('status', e.target.value as WCStatus)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wc-notes">Notes</Label>
              <Textarea
                id="wc-notes"
                value={form.notes}
                onChange={e => field('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Work Center'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
