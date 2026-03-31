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
import { formatDate, genId, today } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, LayoutList, Circle, Loader, CheckCircle2 } from 'lucide-react';

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskStatus   = 'todo' | 'in_progress' | 'review' | 'done';

interface Task {
  id: string;
  title: string;
  project: string;
  assigned_to: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
}

const INITIAL_TASKS: Task[] = [
  { id: '1',  title: 'Design wireframes',         project: 'Website Redesign',      assigned_to: 'Grace Turner',  due_date: '2026-04-05', priority: 'high',     status: 'done'        },
  { id: '2',  title: 'Setup CI/CD pipeline',      project: 'ERP Implementation',    assigned_to: 'Henry Park',    due_date: '2026-04-10', priority: 'critical', status: 'in_progress' },
  { id: '3',  title: 'Write unit tests',           project: 'Mobile App v2',         assigned_to: 'Eva Chen',      due_date: '2026-04-08', priority: 'medium',   status: 'todo'        },
  { id: '4',  title: 'Database schema review',     project: 'ERP Implementation',    assigned_to: 'James Brown',   due_date: '2026-04-03', priority: 'high',     status: 'review'      },
  { id: '5',  title: 'User acceptance testing',    project: 'Website Redesign',      assigned_to: 'Alice Johnson', due_date: '2026-04-15', priority: 'high',     status: 'todo'        },
  { id: '6',  title: 'Migrate legacy data',        project: 'Data Migration',        assigned_to: 'Henry Park',    due_date: '2026-03-31', priority: 'critical', status: 'done'        },
  { id: '7',  title: 'API endpoint documentation', project: 'API Integration Suite', assigned_to: 'Eva Chen',      due_date: '2026-04-20', priority: 'low',      status: 'todo'        },
  { id: '8',  title: 'Security penetration test',  project: 'Security Audit',        assigned_to: 'James Brown',   due_date: '2026-03-20', priority: 'critical', status: 'done'        },
  { id: '9',  title: 'Dashboard UI components',    project: 'Analytics Dashboard',   assigned_to: 'Grace Turner',  due_date: '2026-04-25', priority: 'medium',   status: 'in_progress' },
  { id: '10', title: 'Load testing',               project: 'Cloud Infrastructure',  assigned_to: 'Bob Martinez',  due_date: '2026-05-01', priority: 'medium',   status: 'todo'        },
  { id: '11', title: 'Stakeholder demo prep',      project: 'Mobile App v2',         assigned_to: 'Alice Johnson', due_date: '2026-04-12', priority: 'high',     status: 'review'      },
  { id: '12', title: 'Release notes drafting',     project: 'Website Redesign',      assigned_to: 'Grace Turner',  due_date: '2026-04-28', priority: 'low',      status: 'todo'        },
];

const BLANK: Omit<Task, 'id'> = {
  title: '', project: '', assigned_to: '', due_date: today(), priority: 'medium', status: 'todo',
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
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<Omit<Task, 'id'>>(BLANK);

  const total      = tasks.length;
  const todoCount  = tasks.filter(t => t.status === 'todo').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount  = tasks.filter(t => t.status === 'done').length;

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

  function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (editing) {
      setTasks(prev => prev.map(t => t.id === editing.id ? { ...editing, ...form } : t));
      toast.success('Task updated');
    } else {
      setTasks(prev => [...prev, { id: genId(), ...form }]);
      toast.success('Task created');
    }
    setOpen(false);
  }

  function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task removed');
  }

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
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
              {tasks.map(task => (
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

