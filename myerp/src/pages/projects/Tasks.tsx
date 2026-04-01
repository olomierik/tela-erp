import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, LayoutList, Circle, Loader, CheckCircle2, Loader2 } from 'lucide-react';

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskStatus   = 'todo' | 'in_progress' | 'review' | 'done';

interface Task extends Record<string, unknown> {
  id: string;
  title: string;
  project: string;
  assigned_to: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
}

type TaskForm = { title: string; project: string; assigned_to: string; due_date: string; priority: TaskPriority; status: TaskStatus; };

const BLANK: TaskForm = {
  title: '', project: '', assigned_to: '', due_date: '', priority: 'medium', status: 'todo',
};

const priorityVariant: Record<TaskPriority, 'secondary' | 'info' | 'warning' | 'destructive'> = {
  low: 'secondary', medium: 'info', high: 'warning', critical: 'destructive',
};

const statusVariant: Record<TaskStatus, 'outline' | 'info' | 'warning' | 'success'> = {
  todo: 'outline', in_progress: 'info', review: 'warning', done: 'success',
};

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
};

export default function Tasks() {
  const { rows: items, loading, insert, update, remove } = useTable<Task>('myerp_tasks');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(BLANK);

  const total      = items.length;
  const todoCount  = items.filter(t => t.status === 'todo').length;
  const inProgress = items.filter(t => t.status === 'in_progress').length;
  const doneCount  = items.filter(t => t.status === 'done').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({ title: task.title, project: task.project, assigned_to: task.assigned_to, due_date: task.due_date, priority: task.priority, status: task.status });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Task updated');
      } else {
        await insert(form);
        toast.success('Task created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Task removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof TaskForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Tasks">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Tasks">
      <PageHeader title="Tasks" subtitle="Create, assign, and track project tasks" action={{ label: 'New Task', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tasks', value: total,      icon: LayoutList,  color: 'text-primary' },
          { label: 'To Do',       value: todoCount,  icon: Circle,      color: 'text-warning' },
          { label: 'In Progress', value: inProgress, icon: Loader,      color: 'text-info'    },
          { label: 'Done',        value: doneCount,  icon: CheckCircle2,color: 'text-success' },
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
                <TableHead>Title</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.project}</TableCell>
                  <TableCell>{task.assigned_to}</TableCell>
                  <TableCell>{formatDate(task.due_date)}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[task.priority]} className="capitalize">{task.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[task.status]}>{statusLabel[task.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(task)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
            <SheetTitle>{editing ? 'Edit Task' : 'New Task'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => field('title', e.target.value)} placeholder="Task title" />
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Input value={form.project} onChange={e => field('project', e.target.value)} placeholder="Project name" />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => field('assigned_to', e.target.value)} placeholder="Assignee name" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => field('due_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onChange={e => field('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Task'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
