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
import { Clock, CheckCircle, CalendarDays, UserCheck, Loader2 } from 'lucide-react';

type LeaveType = 'annual' | 'sick' | 'maternity' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface LeaveRequest extends Record<string, unknown> {
  id: string;
  employee: string;
  type: LeaveType;
  from_date: string;
  to_date: string;
  days: number;
  status: LeaveStatus;
  note: string;
}

const today = () => new Date().toISOString().slice(0, 10);

interface LeaveForm {
  employee: string;
  type: LeaveType;
  from_date: string;
  to_date: string;
  days: number;
  note: string;
}

const BLANK: LeaveForm = {
  employee: '', type: 'annual', from_date: today(), to_date: today(), days: 1, note: '',
};

const statusVariant: Record<LeaveStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning', approved: 'success', rejected: 'destructive',
};

const typeLabel: Record<LeaveType, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity', unpaid: 'Unpaid',
};

export default function Leave() {
  const { rows: items, loading, insert, update } = useTable<LeaveRequest>('myerp_leave_requests');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeaveForm>(BLANK);

  const todayStr = today();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const pending        = items.filter(l => l.status === 'pending').length;
  const approvedMonth  = items.filter(l => l.status === 'approved' && l.from_date.startsWith(currentMonth)).length;
  const totalDaysOut   = items.filter(l => l.status === 'approved').reduce((s, l) => s + l.days, 0);
  const onLeaveToday   = items.filter(l => l.status === 'approved' && l.from_date <= todayStr && l.to_date >= todayStr).length;

  async function handleApprove(id: string) {
    try {
      await update(id, { status: 'approved' });
      toast.success('Leave approved');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to approve leave');
    }
  }

  async function handleReject(id: string) {
    try {
      await update(id, { status: 'rejected' });
      toast.error('Leave rejected');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to reject leave');
    }
  }

  async function handleSave() {
    if (!form.employee.trim()) { toast.error('Employee name is required'); return; }
    try {
      await insert({ employee: form.employee, type: form.type, from_date: form.from_date, to_date: form.to_date, days: form.days, note: form.note, status: 'pending' });
      toast.success('Leave request created');
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create leave request');
    }
  }

  function field(key: keyof LeaveForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <AppLayout title="Leave Management">
      <PageHeader
        title="Leave Management"
        subtitle="Track and manage employee leave requests"
        action={{ label: 'New Request', onClick: () => { setForm(BLANK); setOpen(true); } }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Requests',    value: pending,       icon: Clock,        color: 'text-warning' },
          { label: 'Approved This Month', value: approvedMonth, icon: CheckCircle,  color: 'text-success' },
          { label: 'Total Days Out',      value: totalDaysOut,  icon: CalendarDays, color: 'text-info'    },
          { label: 'On Leave Today',      value: onLeaveToday,  icon: UserCheck,    color: 'text-primary' },
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
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.employee}</TableCell>
                    <TableCell>{typeLabel[l.type]}</TableCell>
                    <TableCell>{formatDate(l.from_date)}</TableCell>
                    <TableCell>{formatDate(l.to_date)}</TableCell>
                    <TableCell>{l.days}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[l.status]} className="capitalize">{l.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm">{l.note}</TableCell>
                    <TableCell className="text-right">
                      {l.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10" onClick={() => handleApprove(l.id)}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => handleReject(l.id)}>Reject</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Leave Request</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Input value={form.employee} onChange={e => field('employee', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onChange={e => field('type', e.target.value as LeaveType)}>
                <option value="annual">Annual</option>
                <option value="sick">Sick</option>
                <option value="maternity">Maternity</option>
                <option value="unpaid">Unpaid</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={form.from_date} onChange={e => field('from_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={form.to_date} onChange={e => field('to_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Days</Label>
              <Input type="number" value={form.days} onChange={e => field('days', Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea value={form.note} onChange={e => field('note', e.target.value)} placeholder="Reason for leave..." rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Submit Request</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
