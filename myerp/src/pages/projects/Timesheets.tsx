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
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Clock, CheckCircle2, FileText, Loader2 } from 'lucide-react';

type TimesheetStatus = 'draft' | 'submitted' | 'approved';

interface Timesheet extends Record<string, unknown> {
  id: string;
  employee: string;
  project: string;
  task: string;
  date: string;
  hours: number;
  notes: string;
  status: TimesheetStatus;
}

type TimesheetForm = { employee: string; project: string; task: string; date: string; hours: number; notes: string; status: TimesheetStatus; };

const BLANK: TimesheetForm = {
  employee: '', project: '', task: '', date: '', hours: 0, notes: '', status: 'draft',
};

const statusVariant: Record<TimesheetStatus, 'secondary' | 'info' | 'success'> = {
  draft: 'secondary', submitted: 'info', approved: 'success',
};

const statusLabel: Record<TimesheetStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved',
};

export default function Timesheets() {
  const { rows: items, loading, insert, update, remove } = useTable<Timesheet>('myerp_timesheets');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Timesheet | null>(null);
  const [form, setForm] = useState<TimesheetForm>(BLANK);

  const totalHours   = items.reduce((s, t) => s + t.hours, 0);
  const draftCount   = items.filter(t => t.status === 'draft').length;
  const approvedCount = items.filter(t => t.status === 'approved').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(timesheet: Timesheet) {
    setEditing(timesheet);
    setForm({ employee: timesheet.employee, project: timesheet.project, task: timesheet.task, date: timesheet.date, hours: timesheet.hours, notes: timesheet.notes, status: timesheet.status });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.employee.trim()) { toast.error('Employee is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Timesheet updated');
      } else {
        await insert(form);
        toast.success('Timesheet created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Timesheet removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof TimesheetForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Timesheets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Timesheets">
      <PageHeader title="Timesheets" subtitle="Log time against projects and tasks, approve timesheets, and generate billing reports." action={{ label: 'New Timesheet', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Entries',   value: items.length,  icon: FileText,    color: 'text-primary' },
          { label: 'Total Hours',     value: totalHours,    icon: Clock,       color: 'text-info'    },
          { label: 'Drafts',          value: draftCount,    icon: FileText,    color: 'text-warning' },
          { label: 'Approved',        value: approvedCount, icon: CheckCircle2,color: 'text-success' },
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(ts => (
                <TableRow key={ts.id}>
                  <TableCell className="font-medium">{ts.employee}</TableCell>
                  <TableCell>{ts.project}</TableCell>
                  <TableCell>{ts.task}</TableCell>
                  <TableCell>{formatDate(ts.date)}</TableCell>
                  <TableCell>{ts.hours}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[ts.status]}>{statusLabel[ts.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(ts)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(ts.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Timesheet' : 'New Timesheet'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Input value={form.employee} onChange={e => field('employee', e.target.value)} placeholder="Employee name" />
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Input value={form.project} onChange={e => field('project', e.target.value)} placeholder="Project name" />
            </div>
            <div className="space-y-1.5">
              <Label>Task</Label>
              <Input value={form.task} onChange={e => field('task', e.target.value)} placeholder="Task description" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => field('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input type="number" value={form.hours} onChange={e => field('hours', Number(e.target.value))} min={0} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => field('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Timesheet'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
