import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Plus, Search, Clock, Calendar, DollarSign, CheckCircle,
  Folder, User, Trash2, Edit, Timer, BarChart2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── Status Config ─────────────────────────────────────────────────────────

const projectStatuses = [
  { id: 'planning', label: 'Planning', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'active', label: 'Active', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

const taskStatuses = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-100 dark:bg-slate-800', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'review', label: 'Review', color: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'done', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

function StatusBadge({ status, type = 'project' }: { status: string; type?: 'project' | 'task' }) {
  const list = type === 'project' ? projectStatuses : taskStatuses;
  const s = list.find(x => x.id === status);
  const colorClass = type === 'project' ? s?.color : (s as any)?.badge;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass || 'bg-gray-100 text-gray-600')}>
      {s?.label || status}
    </span>
  );
}

// ─── Create Project Sheet ──────────────────────────────────────────────────

function CreateProjectSheet({ onClose, onCreate, isPending }: {
  onClose: () => void;
  onCreate: (data: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: '', client: '', manager: '', start_date: '', end_date: '',
    budget: '0', status: 'planning', notes: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    onCreate({
      name: form.name,
      client: form.client,
      manager: form.manager,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      status: form.status,
      notes: form.notes,
    });
    onClose();
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>New Project</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Project Name *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Website Redesign" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Input value={form.client} onChange={e => set('client', e.target.value)} placeholder="Client name" />
          </div>
          <div className="space-y-1.5">
            <Label>Project Manager</Label>
            <Input value={form.manager} onChange={e => set('manager', e.target.value)} placeholder="Manager name" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Budget</Label>
            <Input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {projectStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Project description..." rows={3} />
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSubmit} disabled={isPending}>
          <Plus className="w-4 h-4" /> Create Project
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Create Task Dialog ────────────────────────────────────────────────────

function CreateTaskDialog({ projectName, onCreated, isPending }: {
  projectName: string;
  onCreated: (data: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', assigned_to: '', due_date: '', priority: 'medium', status: 'todo' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Task title is required'); return; }
    onCreated({
      title: form.title,
      project: projectName,
      assigned_to: form.assigned_to,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
    });
    setOpen(false);
    setForm({ title: '', assigned_to: '', due_date: '', priority: 'medium', status: 'todo' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Add Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Title *</Label><Input required className="h-8 text-xs" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Assigned To</Label><Input className="h-8 text-xs" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Due Date</Label><Input type="date" className="h-8 text-xs" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {taskStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full h-8 text-xs" disabled={isPending}>{isPending ? 'Creating...' : 'Create Task'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Project Detail Sheet ──────────────────────────────────────────────────

function ProjectDetailSheet({ project, tasks, onClose, onUpdateProject, onUpdateTask, onDeleteTask, onCreateTask, taskInsertPending }: {
  project: any;
  tasks: any[];
  onClose: () => void;
  onUpdateProject: (data: Record<string, any>) => void;
  onUpdateTask: (data: Record<string, any>) => void;
  onDeleteTask: (id: string) => void;
  onCreateTask: (data: Record<string, any>) => void;
  taskInsertPending: boolean;
}) {
  const { formatMoney } = useCurrency();
  const [tab, setTab] = useState('tasks');

  const projectTasks = tasks.filter(t => t.project === project.name);
  const doneTasks = projectTasks.filter(t => t.status === 'done').length;
  const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
  const budgetUsed = project.budget > 0 ? Math.round((Number(project.spent) / Number(project.budget)) * 100) : 0;

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-lg">{project.name}</SheetTitle>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          {project.client && <span className="flex items-center gap-1"><User className="w-3 h-3" />{project.client}</span>}
          {project.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(project.start_date).toLocaleDateString()}</span>}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Progress Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-lg border-border">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Task Progress</p>
              <p className="text-lg font-bold text-foreground">{progress}%</p>
              <Progress value={progress} className="h-1.5 mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">{doneTasks}/{projectTasks.length} tasks done</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-border">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Budget Used</p>
              <p className="text-lg font-bold text-foreground">{formatMoney(Number(project.spent))}</p>
              <Progress value={budgetUsed} className="h-1.5 mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">of {formatMoney(Number(project.budget))}</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Change */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Status:</Label>
          <Select value={project.status} onValueChange={v => onUpdateProject({ id: project.id, status: v })}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {projectStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="h-8">
              <TabsTrigger value="tasks" className="text-xs h-7">Tasks ({projectTasks.length})</TabsTrigger>
              <TabsTrigger value="kanban" className="text-xs h-7">Kanban</TabsTrigger>
            </TabsList>
            <CreateTaskDialog projectName={project.name} onCreated={onCreateTask} isPending={taskInsertPending} />
          </div>

          <TabsContent value="tasks" className="mt-3">
            <div className="space-y-2">
              {projectTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No tasks yet. Click "Add Task" to get started.</p>
              )}
              {projectTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.assigned_to && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{task.assigned_to}</span>}
                      {task.due_date && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(task.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Select value={task.status} onValueChange={v => onUpdateTask({ id: task.id, status: v })}>
                    <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taskStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteTask(task.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="kanban" className="mt-3">
            <div className="grid grid-cols-4 gap-2">
              {taskStatuses.map(col => {
                const colTasks = projectTasks.filter(t => t.status === col.id);
                return (
                  <div key={col.id} className={cn('rounded-lg p-2 min-h-[120px]', col.color)}>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{col.label} ({colTasks.length})</p>
                    <div className="space-y-1.5">
                      {colTasks.map(task => (
                        <div key={task.id} className="bg-card rounded-md p-2 border border-border shadow-sm text-xs">
                          <p className="font-medium text-foreground">{task.title}</p>
                          {task.assigned_to && <p className="text-[10px] text-muted-foreground mt-0.5">{task.assigned_to}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ─── Main Projects Page ────────────────────────────────────────────────────

export default function Projects() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();

  // Backend queries
  const { data: projectsData, isLoading: projectsLoading } = useTenantQuery('projects');
  const { data: tasksData, isLoading: tasksLoading } = useTenantQuery('project_tasks');
  const insertProject = useTenantInsert('projects');
  const updateProject = useTenantUpdate('projects');
  const deleteProject = useTenantDelete('projects');
  const insertTask = useTenantInsert('project_tasks');
  const updateTask = useTenantUpdate('project_tasks');
  const deleteTask = useTenantDelete('project_tasks');
  useRealtimeSync('projects');
  useRealtimeSync('project_tasks');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const projects = projectsData ?? [];
  const tasks = tasksData ?? [];

  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.budget || 0), 0);
  const totalSpent = projects.reduce((s: number, p: any) => s + Number(p.spent || 0), 0);
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;

  const filtered = projects.filter((p: any) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isLoading = projectsLoading || tasksLoading;

  return (
    <AppLayout title="Projects" subtitle="Project management & task tracking">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Projects', value: String(projects.length), icon: Folder, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Active', value: String(activeProjects), icon: BarChart2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Total Budget', value: formatMoney(totalBudget), icon: DollarSign, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Total Spent', value: formatMoney(totalSpent), icon: Timer, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          ].map(stat => (
            <motion.div key={stat.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="rounded-xl border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {projectStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isDemo && (
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> New Project
            </Button>
          )}
        </div>

        {/* Projects Grid */}
        {isLoading && !isDemo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No projects found</p>
            {!isDemo && (
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> Create First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project: any) => {
              const projectTasks = tasks.filter((t: any) => t.project === project.name);
              const doneTasks = projectTasks.filter((t: any) => t.status === 'done').length;
              const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

              return (
                <motion.div key={project.id} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <Card
                    className="rounded-xl border-border cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                          {project.client && <p className="text-xs text-muted-foreground mt-0.5">{project.client}</p>}
                        </div>
                        <StatusBadge status={project.status} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{projectTasks.length} tasks</span>
                        <span>{formatMoney(Number(project.budget || 0))}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {project.manager && <><User className="w-3 h-3" /><span>{project.manager}</span></>}
                        </div>
                        {!isDemo && (
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); deleteProject.mutate(project.id); }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[520px] flex flex-col p-0" side="right">
          <CreateProjectSheet
            onClose={() => setCreateOpen(false)}
            onCreate={insertProject.mutate}
            isPending={insertProject.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0" side="right">
          {selectedProject && (
            <ProjectDetailSheet
              project={selectedProject}
              tasks={tasks}
              onClose={() => setSelectedProject(null)}
              onUpdateProject={(data) => updateProject.mutate(data)}
              onUpdateTask={(data) => updateTask.mutate(data)}
              onDeleteTask={(id) => deleteTask.mutate(id)}
              onCreateTask={(data) => insertTask.mutate(data)}
              taskInsertPending={insertTask.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
