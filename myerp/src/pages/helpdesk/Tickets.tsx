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
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import {
  Pencil, Trash2, TicketIcon, AlertCircle, Activity, CheckCircle2, Loader2,
} from 'lucide-react';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketCategory = 'General' | 'Technical' | 'Billing' | 'Sales' | 'Other';

interface Ticket extends Record<string, unknown> {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  customer_name: string;
  customer_email: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  assigned_to: string;
  resolved_at: string | null;
}

const PRIORITY_BADGE: Record<TicketPriority, 'secondary' | 'info' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  urgent: 'destructive',
};

const STATUS_BADGE: Record<TicketStatus, 'info' | 'warning' | 'success' | 'secondary'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'secondary',
};

const CATEGORIES: TicketCategory[] = ['General', 'Technical', 'Billing', 'Sales', 'Other'];

function generateTicketNumber(existing: Ticket[]): string {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;
  const nums = existing
    .map(t => t.ticket_number)
    .filter(n => n?.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

type FormState = {
  subject: string;
  description: string;
  customer_name: string;
  customer_email: string;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to: string;
  status: TicketStatus;
};

const EMPTY_FORM: FormState = {
  subject: '',
  description: '',
  customer_name: '',
  customer_email: '',
  priority: 'medium',
  category: 'General',
  assigned_to: '',
  status: 'open',
};

export default function Tickets() {
  const { rows: items, loading, insert, update, remove } = useTable<Ticket>(
    'myerp_tickets',
    'created_at',
    false,
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // KPIs
  const totalCount = items.length;
  const openCount = items.filter(t => t.status === 'open').length;
  const inProgressCount = items.filter(t => t.status === 'in_progress').length;
  const resolvedToday = items.filter(t => t.resolved_at?.startsWith(todayISO())).length;

  // Filtered rows
  const filtered = useMemo(() => {
    return items.filter(t => {
      const matchSearch =
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        t.ticket_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [items, search, statusFilter, priorityFilter]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(t: Ticket) {
    setEditId(t.id);
    setForm({
      subject: t.subject,
      description: t.description,
      customer_name: t.customer_name,
      customer_email: t.customer_email,
      priority: t.priority,
      category: t.category as TicketCategory,
      assigned_to: t.assigned_to ?? '',
      status: t.status,
    });
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Ticket deleted');
    } catch {
      toast.error('Failed to delete ticket');
    }
  }

  async function handleSave() {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    if (!form.customer_name.trim()) { toast.error('Customer name is required'); return; }

    setSaving(true);
    try {
      if (editId) {
        const existing = items.find(t => t.id === editId);
        const becomingResolved = existing?.status !== 'resolved' && form.status === 'resolved';
        const resolved_at = form.status === 'resolved'
          ? (existing?.resolved_at ?? (becomingResolved ? new Date().toISOString() : null))
          : null;

        await update(editId, {
          subject: form.subject.trim(),
          description: form.description.trim(),
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim(),
          priority: form.priority,
          category: form.category,
          assigned_to: form.assigned_to.trim(),
          status: form.status,
          resolved_at: becomingResolved ? new Date().toISOString() : resolved_at,
        });
        toast.success('Ticket updated');
      } else {
        const ticket_number = generateTicketNumber(items);
        await insert({
          ticket_number,
          subject: form.subject.trim(),
          description: form.description.trim(),
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim(),
          priority: form.priority,
          category: form.category,
          assigned_to: form.assigned_to.trim(),
          status: form.status,
          resolved_at: form.status === 'resolved' ? new Date().toISOString() : null,
        });
        toast.success('Ticket created');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save ticket');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Help Desk">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Help Desk">
      <PageHeader
        title="Support Tickets"
        subtitle="Track and resolve customer support requests."
        action={{ label: 'New Ticket', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Tickets
            </CardTitle>
            <TicketIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Open
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{openCount}</div>
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
              Resolved Today
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{resolvedToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by subject, customer, or ticket #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
        <Select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
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
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      No tickets found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm font-medium">{t.ticket_number}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">{t.subject}</TableCell>
                    <TableCell>
                      <div className="text-sm">{t.customer_name}</div>
                      {t.customer_email && (
                        <div className="text-xs text-muted-foreground">{t.customer_email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_BADGE[t.priority]} className="capitalize">
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[t.status]} className="capitalize">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      {t.assigned_to || (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.created_at ? formatDate(t.created_at as string) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t.id)}
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
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Ticket' : 'New Support Ticket'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tkt-subject">Subject</Label>
              <Input
                id="tkt-subject"
                placeholder="Brief description of the issue"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tkt-description">Description</Label>
              <Textarea
                id="tkt-description"
                placeholder="Detailed description of the issue..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tkt-cname">Customer Name</Label>
                <Input
                  id="tkt-cname"
                  placeholder="Full name"
                  value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tkt-cemail">Customer Email</Label>
                <Input
                  id="tkt-cemail"
                  type="email"
                  placeholder="email@example.com"
                  value={form.customer_email}
                  onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tkt-priority">Priority</Label>
                <Select
                  id="tkt-priority"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tkt-category">Category</Label>
                <Select
                  id="tkt-category"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tkt-assigned">Assigned To</Label>
              <Input
                id="tkt-assigned"
                placeholder="Agent name or email"
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tkt-status">Status</Label>
              <Select
                id="tkt-status"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TicketStatus }))}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editId ? 'Save Changes' : 'Create Ticket'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
