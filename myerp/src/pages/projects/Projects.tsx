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
import { formatCurrency, formatDate, genId, today } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, FolderOpen, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

interface Project {
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

const INITIAL_PROJECTS: Project[] = [
  { id: '1', name: 'ERP Implementation',    client: 'Acme Corp',       manager: 'Alice Johnson', start_date: '2026-01-10', end_date: '2026-06-30', budget: 120000, spent: 74000,  status: 'active',    notes: 'Phase 2 in progress'         },
  { id: '2', name: 'Website Redesign',       client: 'BlueWave LLC',    manager: 'Grace Turner',  start_date: '2026-02-01', end_date: '2026-04-30', budget: 35000,  spent: 28000,  status: 'active',    notes: 'Final review pending'        },
  { id: '3', name: 'Mobile App v2',          client: 'TechNova Inc',    manager: 'Eva Chen',      start_date: '2026-01-15', end_date: '2026-05-15', budget: 80000,  spent: 45000,  status: 'active',    notes: 'UI complete, API in progress' },
  { id: '4', name: 'Data Migration',         client: 'RetailPlus',      manager: 'Henry Park',    start_date: '2026-03-01', end_date: '2026-03-31', budget: 15000,  spent: 15200,  status: 'completed', notes: 'Delivered on time'           },
  { id: '5', name: 'Security Audit',         client: 'FinGroup Ltd',    manager: 'James Brown',   start_date: '2026-02-15', end_date: '2026-03-15', budget: 22000,  spent: 21500,  status: 'completed', notes: 'Report submitted'            },
  { id: '6', name: 'Cloud Infrastructure',   client: 'StartupXYZ',      manager: 'Bob Martinez',  start_date: '2026-04-01', end_date: '2026-07-31', budget: 60000,  spent: 0,      status: 'planning',  notes: 'Kickoff scheduled April 1'   },
  { id: '7', name: 'Analytics Dashboard',    client: 'MegaRetail',      manager: 'Grace Turner',  start_date: '2026-03-10', end_date: '2026-05-10', budget: 40000,  spent: 12000,  status: 'on_hold',   notes: 'Awaiting client sign-off'    },
  { id: '8', name: 'API Integration Suite',  client: 'Globalex Co',     manager: 'Eva Chen',      start_date: '2026-04-15', end_date: '2026-08-15', budget: 55000,  spent: 0,      status: 'planning',  notes: 'Requirements gathering'      },
];

const BLANK: Omit<Project, 'id' | 'spent'> = {
  name: '', client: '', manager: '', start_date: today(), end_date: today(), budget: 0, status: 'planning', notes: '',
};

const statusVariant: Record<ProjectStatus, 'secondary' | 'info' | 'warning' | 'success'> = {
  planning: 'secondary', active: 'info', on_hold: 'warning', completed: 'success',
};

const statusLabel: Record<ProjectStatus, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed',
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Omit<Project, 'id' | 'spent'>>(BLANK);

  const activeCount   = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const totalBudget   = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent    = projects.reduce((s, p) => s + p.spent, 0);
  const remaining     = totalBudget - totalSpent;

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

  function handleSave() {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    if (editing) {
      setProjects(prev => prev.map(p => p.id === editing.id ? { ...editing, ...form } : p));
      toast.success('Project updated');
    } else {
      setProjects(prev => [...prev, { id: genId(), spent: 0, ...form }]);
      toast.success('Project created');
    }
    setOpen(false);
  }

  function handleDelete(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success('Project removed');
  }

  function field(key: keyof typeof form, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <AppLayout title="Projects">
      <PageHeader title="Projects" subtitle="Plan, track and manage client projects" action={{ label: 'New Project', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Projects',   value: activeCount,             icon: FolderOpen,   color: 'text-info'    },
          { label: 'Completed',         value: completedCount,          icon: CheckCircle2, color: 'text-success' },
          { label: 'Total Budget',      value: formatCurrency(totalBudget), icon: DollarSign,   color: 'text-primary' },
          { label: 'Budget Remaining',  value: formatCurrency(remaining),   icon: TrendingUp,   color: remaining >= 0 ? 'text-success' : 'text-destructive' },
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
              {projects.map(project => {
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
