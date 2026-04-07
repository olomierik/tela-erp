import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import DataTable, { Column } from '@/components/erp/DataTable';
import { Wrench, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const MAINTENANCE_TYPES = ['Preventive', 'Corrective', 'Inspection', 'Emergency', 'Upgrade', 'Other'];
const STATUSES = ['new', 'in_progress', 'on_hold', 'done', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function Maintenance() {
  const { isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    equipment: '',
    type: 'Preventive',
    priority: 'medium',
    status: 'new',
    assigned_to: '',
    scheduled_date: new Date().toISOString().slice(0, 10),
    estimated_cost: '',
    notes: '',
  });

  const { data: rawData, isLoading } = useTenantQuery('maintenance_requests' as any);
  const insertRequest = useTenantInsert('maintenance_requests' as any);

  const demoData = [
    {
      id: '1', request_number: 'MNT-001', equipment_name: 'CNC Machine #3', maintenance_type: 'Corrective',
      priority: 'critical', status: 'in_progress', assigned_to: 'John Mensah',
      scheduled_date: new Date().toISOString().slice(0, 10), cost: 1800,
      created_at: new Date().toISOString(),
    },
    {
      id: '2', request_number: 'MNT-002', equipment_name: 'Air Compressor', maintenance_type: 'Preventive',
      priority: 'medium', status: 'new', assigned_to: 'Grace Asante',
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), cost: 350,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3', request_number: 'MNT-003', equipment_name: 'Forklift #2', maintenance_type: 'Inspection',
      priority: 'low', status: 'done', assigned_to: 'Samuel Adu',
      scheduled_date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10), cost: 120,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: '4', request_number: 'MNT-004', equipment_name: 'Conveyor Belt A', maintenance_type: 'Emergency',
      priority: 'high', status: 'in_progress', assigned_to: 'Isaac Boateng',
      scheduled_date: new Date().toISOString().slice(0, 10), cost: 2500,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: '5', request_number: 'MNT-005', equipment_name: 'Generator B', maintenance_type: 'Preventive',
      priority: 'medium', status: 'on_hold', assigned_to: 'Ama Owusu',
      scheduled_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10), cost: 600,
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];

  const requests: any[] = (isDemo ? demoData : rawData) ?? [];

  const totalRequests = requests.length;
  const newCount = requests.filter(r => r.status === 'new').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const doneCount = requests.filter(r => r.status === 'done').length;

  const handleCreate = async () => {
    if (isDemo) { toast.success('Maintenance request created (demo)'); setCreateOpen(false); return; }
    if (!form.equipment) {
      toast.error('Equipment name is required');
      return;
    }
    await insertRequest.mutateAsync({
      request_number: `MNT-${Date.now().toString(36).toUpperCase()}`,
      equipment_name: form.equipment,
      maintenance_type: form.type,
      priority: form.priority,
      status: form.status,
      assigned_to: form.assigned_to,
      scheduled_date: form.scheduled_date,
      cost: Number(form.estimated_cost) || 0,
      notes: form.notes,
    });
    toast.success('Maintenance request created');
    setCreateOpen(false);
    setForm({
      equipment: '', type: 'Preventive', priority: 'medium', status: 'new',
      assigned_to: '', scheduled_date: new Date().toISOString().slice(0, 10),
      estimated_cost: '', notes: '',
    });
  };

  const columns: Column[] = [
    { key: 'request_number', label: 'Request #', className: 'font-mono text-xs' },
    { key: 'equipment_name', label: 'Equipment', render: v => <span className="font-medium">{v}</span> },
    { key: 'maintenance_type', label: 'Type', className: 'text-sm' },
    {
      key: 'priority', label: 'Priority',
      render: v => (
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', PRIORITY_COLORS[v] ?? PRIORITY_COLORS.medium)}>
          {v}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: v => (
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[v] ?? STATUS_COLORS.new)}>
          {STATUS_LABELS[v] ?? v}
        </span>
      ),
    },
    { key: 'assigned_to', label: 'Assigned To', className: 'text-sm' },
    {
      key: 'scheduled_date', label: 'Scheduled Date',
      render: v => <span className="text-sm">{v ? new Date(v).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'cost', label: 'Est. Cost',
      render: v => <span className="font-semibold">{formatMoney(v)}</span>,
    },
  ];

  return (
    <AppLayout title="Maintenance" subtitle="Equipment maintenance and repair requests">
      <div className="max-w-7xl">
        <PageHeader
          title="Maintenance"
          subtitle="Track equipment maintenance requests, repairs, and scheduled servicing"
          icon={Wrench}
          breadcrumb={[{ label: 'Operations' }, { label: 'Maintenance' }]}
          actions={[
            { label: 'New Request', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Total Requests', value: totalRequests },
            { label: 'New', value: newCount, color: 'text-blue-600' },
            { label: 'In Progress', value: inProgressCount, color: 'text-amber-600' },
            { label: 'Done', value: doneCount, color: 'text-emerald-600' },
          ]}
        />

        <DataTable
          data={requests}
          columns={columns}
          loading={isLoading && !isDemo}
          searchPlaceholder="Search maintenance requests..."
          emptyTitle="No maintenance requests yet"
          emptyDescription="Log your first maintenance request to start tracking equipment health."
          emptyAction={{ label: 'New Request', onClick: () => setCreateOpen(true) }}
        />

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" /> New Maintenance Request
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label>Equipment / Asset *</Label>
                <Input
                  value={form.equipment}
                  onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
                  placeholder="e.g. CNC Machine #3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
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
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    value={form.estimated_cost}
                    onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Assigned To</Label>
                  <Input
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    placeholder="Technician name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Describe the issue or maintenance work required..."
                />
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={insertRequest.isPending} onClick={handleCreate}>
                {insertRequest.isPending ? 'Creating...' : 'Create Request'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
