import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, FolderOpen, CheckCircle2, DollarSign, TrendingUp, Loader2 } from 'lucide-react';

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

interface Project extends Record<string, unknown> {
  id: string;
  name: string;
  client: string;
  manager: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  status: ProjectStatus;
  notes: string;
}

type ProjectForm = { name: string; client: string; manager: string; start_date: string; end_date: string; budget: number; status: ProjectStatus; notes: string; };

const BLANK: ProjectForm = {
  name: '', client: '', manager: '', start_date: '', end_date: '', budget: 0, status: 'planning', notes: '',
};

const statusVariant: Record<ProjectStatus, 'secondary' | 'info' | 'warning' | 'success'> = {
  planning: 'secondary', active: 'info', on_hold: 'warning', completed: 'success',
};

const statusLabel: Record<ProjectStatus, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed',
};

export default function Projects() {
  const { rows: items, loading, insert, update, remove } = useTable<Project>('myerp_projects');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(BLANK);

  const activeCount    = items.filter(p => p.status === 'active').length;
  const completedCount = items.filter(p => p.status === 'completed').length;
  const totalBudget    = items.reduce((s, p) => s + p.budget, 0);
  const totalSpent     = items.reduce((s, p) => s + p.spent, 0);
  const remaining      = totalBudget - totalSpent;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({ name: project.name, client: project.client, manager: project.manager, start_date: project.start_date, end_date: project.end_date, budget: project.budget, status: project.status, notes: project.notes });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('Project updated');
      } else {
        await insert({ ...form, spent: 0 });
        toast.success('Project created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Project removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof ProjectForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Projects">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Projects">
      <PageHeader title="Projects" subtitle="Plan, track and manage client projects" action={{ label: 'New Project', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Projects',   value: activeCount,              icon: FolderOpen,   color: 'text-info'    },
          { label: 'Completed',         value: completedCount,           icon: CheckCircle2, color: 'text-success' },
          { label: 'Total Budget',      value: formatCurrency(totalBudget),  icon: DollarSign,   color: 'text-primary' },
          { label: 'Budget Remaining',  value: formatCurrency(remaining),    icon: TrendingUp,   color: remaining >= 0 ? 'text-success' : 'text-destructive' },
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
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(project => {
                const pct = project.budget > 0 ? Math.min(100, Math.round((project.spent / project.budget) * 100)) : 0;
                const barColor = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-success';
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client}</TableCell>
                    <TableCell>{project.manager}</TableCell>
                    <TableCell>{formatDate(project.start_date)}</TableCell>
                    <TableCell>{formatDate(project.end_date)}</TableCell>
                    <TableCell>{formatCurrency(project.budget)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 min-w-[90px]">
                        <span className="text-sm">{formatCurrency(project.spent)}</span>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[project.status]}>{statusLabel[project.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(project)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(project.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Project' : 'New Project'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => field('name', e.target.value)} placeholder="Project name" />
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Input value={form.client} onChange={e => field('client', e.target.value)} placeholder="Client name" />
            </div>
            <div className="space-y-1.5">
              <Label>Manager</Label>
              <Input value={form.manager} onChange={e => field('manager', e.target.value)} placeholder="Project manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => field('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => field('end_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Input type="number" value={form.budget} onChange={e => field('budget', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => field('notes', e.target.value)} placeholder="Project notes..." rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Project'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
