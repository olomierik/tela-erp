import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Plus, Search, Clock, Calendar, DollarSign, CheckCircle,
  Folder, ArrowRight, User, AlertCircle, Timer, BarChart2,
  Trash2, Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

// ─── Demo Data ─────────────────────────────────────────────────────────────

const demoProjects = [
  { id: '1', name: 'Website Redesign', description: 'Full redesign of company website', customer: 'Acme Corp', start_date: '2026-03-01', end_date: '2026-04-30', budget: 25000, hours_logged: 62, hourly_rate: 150, status: 'active' },
  { id: '2', name: 'ERP Integration', description: 'Custom ERP module for inventory', customer: 'Wayne Industries', start_date: '2026-02-01', end_date: '2026-05-31', budget: 80000, hours_logged: 210, hourly_rate: 200, status: 'active' },
  { id: '3', name: 'Marketing Campaign', description: 'Q1 digital marketing push', customer: 'Stark Industries', start_date: '2026-01-01', end_date: '2026-03-31', budget: 15000, hours_logged: 88, hourly_rate: 100, status: 'completed' },
  { id: '4', name: 'Mobile App MVP', description: 'Cross-platform mobile app', customer: 'Daily Planet', start_date: '2026-04-01', end_date: '2026-07-31', budget: 60000, hours_logged: 0, hourly_rate: 175, status: 'planning' },
];

const demoTasks = [
  { id: '1', project_id: '1', title: 'Design mockups', description: 'Create high-fidelity mockups for all pages', due_date: '2026-03-15', priority: 'high', status: 'done', estimated_hours: 12 },
  { id: '2', project_id: '1', title: 'Frontend development', description: 'Implement React components', due_date: '2026-04-10', priority: 'high', status: 'in_progress', estimated_hours: 40 },
  { id: '3', project_id: '1', title: 'Backend API', description: 'RESTful API endpoints', due_date: '2026-04-15', priority: 'medium', status: 'todo', estimated_hours: 20 },
  { id: '4', project_id: '1', title: 'Testing & QA', description: 'End-to-end testing', due_date: '2026-04-25', priority: 'medium', status: 'todo', estimated_hours: 15 },
  { id: '5', project_id: '1', title: 'Deployment', description: 'Setup CI/CD and deploy', due_date: '2026-04-28', priority: 'urgent', status: 'review', estimated_hours: 8 },
];

const demoTimeLogs = [
  { id: '1', task_id: '1', task_title: 'Design mockups', hours: 4, description: 'Completed homepage mockup', log_date: '2026-03-12' },
  { id: '2', task_id: '1', task_title: 'Design mockups', hours: 8, description: 'Completed all interior pages', log_date: '2026-03-13' },
  { id: '3', task_id: '2', task_title: 'Frontend development', hours: 6, description: 'Built header and nav components', log_date: '2026-03-20' },
];

const taskStatuses = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-100 dark:bg-slate-800', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'review', label: 'Review', color: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'done', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: 'bg-gray-100 text-gray-500',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };
  return <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase', map[priority] || map.medium)}>{priority}</span>;
}

function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-600',
    active: 'bg-blue-100 text-blue-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  const labels: Record<string, string> = { planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' };
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', map[status] || map.active)}>{labels[status] || status}</span>;
}

// ─── Project Detail ────────────────────────────────────────────────────────

function ProjectDetail({ project, onClose }: { project: any; onClose: () => void }) {
  const { formatMoney } = useCurrency();
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('kanban');

  const tasks = demoTasks.filter(t => t.project_id === project.id);
  const totalHours = demoTimeLogs.filter(l => tasks.some(t => t.id === l.task_id)).reduce((s, l) => s + l.hours, 0);
  const revenueLogged = totalHours * project.hourly_rate;
  const budgetUsed = Math.round((revenueLogged / project.budget) * 100);

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <SheetTitle>{project.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{project.customer}</p>
          </div>
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{formatMoney(project.budget)}</p>
            <p className="text-xs text-muted-foreground">Budget</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">Logged</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className={cn('text-lg font-bold', budgetUsed > 80 ? 'text-red-500' : 'text-foreground')}>{budgetUsed}%</p>
            <p className="text-xs text-muted-foreground">Budget Used</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget progress</span>
            <span>{formatMoney(revenueLogged)} / {formatMoney(project.budget)}</span>
          </div>
          <Progress value={Math.min(budgetUsed, 100)} className="h-2" />
        </div>

        <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
          <TabsList className="w-full">
            <TabsTrigger value="kanban" className="flex-1">Tasks</TabsTrigger>
            <TabsTrigger value="timelog" className="flex-1">Time Log</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-3">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {taskStatuses.map(s => {
                const stageTasks = tasks.filter(t => t.status === s.id);
                return (
                  <div key={s.id} className={cn('flex-shrink-0 w-[180px] rounded-xl p-2.5', s.color)}>
                    <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5 block text-center mb-2', s.badge)}>
                      {s.label} ({stageTasks.length})
                    </span>
                    <div className="space-y-2">
                      {stageTasks.map(task => (
                        <div key={task.id} className="bg-card rounded-lg p-2.5 border border-border shadow-sm text-xs">
                          <p className="font-semibold text-foreground leading-snug">{task.title}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <PriorityBadge priority={task.priority} />
                            <span className="text-muted-foreground">{task.estimated_hours}h</span>
                          </div>
                          {task.due_date && (
                            <p className="text-muted-foreground/60 mt-1 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />{task.due_date}
                            </p>
                          )}
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-muted-foreground border border-dashed border-border">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="timelog" className="mt-3 space-y-3">
            <div className="bg-muted/40 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Log Time</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" className="h-8 text-sm" />
                <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-8 text-sm" />
              </div>
              <Input value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="What did you work on?" className="h-8 text-sm" />
              <Button size="sm" className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                <Timer className="w-3.5 h-3.5" /> Log Time
              </Button>
            </div>
            <div className="space-y-2">
              {demoTimeLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{log.task_title}</p>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{log.log_date}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 ml-3">{log.hours}h</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ─── Main Projects Page ────────────────────────────────────────────────────

export default function Projects() {
  const { formatMoney } = useCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = demoProjects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: demoProjects.length,
    active: demoProjects.filter(p => p.status === 'active').length,
    totalBudget: demoProjects.reduce((s, p) => s + p.budget, 0),
    totalHours: demoProjects.reduce((s, p) => s + p.hours_logged, 0),
  };

  return (
    <AppLayout title="Projects" subtitle="Track work, time & budgets">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Projects</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          </CardContent></Card>
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.active}</p>
          </CardContent></Card>
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatMoney(stats.totalBudget)}</p>
          </CardContent></Card>
          <Card className="rounded-xl border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hours Logged</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalHours}h</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const revenueLogged = project.hours_logged * project.hourly_rate;
            const budgetPct = Math.min(Math.round((revenueLogged / project.budget) * 100), 100);
            const tasks = demoTasks.filter(t => t.project_id === project.id);
            const doneTasks = tasks.filter(t => t.status === 'done').length;
            const taskProgress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
            return (
              <motion.div key={project.id} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                <Card className="rounded-xl border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.customer}</p>
                        </div>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Task progress</span>
                          <span>{doneTasks}/{tasks.length} tasks</span>
                        </div>
                        <Progress value={taskProgress} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Budget used</span>
                          <span>{formatMoney(revenueLogged)} / {formatMoney(project.budget)}</span>
                        </div>
                        <Progress value={budgetPct} className={cn('h-1.5', budgetPct > 80 && '[&>div]:bg-orange-500')} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.hours_logged}h</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{project.end_date}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-indigo-600" onClick={() => setSelectedProject(project)}>
                        View <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No projects found</p>
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> Create Project
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={v => !v && setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-[520px] flex flex-col p-0" side="right">
          {selectedProject && <ProjectDetail project={selectedProject} onClose={() => setSelectedProject(null)} />}
        </SheetContent>
      </Sheet>

      {/* Create Project Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>New Project</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Project Name</Label>
              <Input placeholder="e.g. Website Redesign" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Project description..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Input placeholder="Client name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>Budget</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Hourly Rate</Label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="planning">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setCreateOpen(false)}>Create Project</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
