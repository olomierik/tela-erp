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
import { formatDate, genId, today } from '@/lib/mock';
import { toast } from 'sonner';
import { Clock, CheckCircle, CalendarDays, UserCheck } from 'lucide-react';

type LeaveType = 'annual' | 'sick' | 'maternity' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface LeaveRequest {
  id: string;
  employee: string;
  type: LeaveType;
  from_date: string;
  to_date: string;
  days: number;
  status: LeaveStatus;
  note: string;
}

const INITIAL_LEAVES: LeaveRequest[] = [
  { id: '1',  employee: 'Alice Johnson',  type: 'annual',    from_date: '2026-03-28', to_date: '2026-04-01', days: 5,  status: 'approved', note: 'Family vacation'       },
  { id: '2',  employee: 'David Lee',      type: 'sick',      from_date: '2026-03-25', to_date: '2026-03-27', days: 3,  status: 'approved', note: 'Medical appointment'   },
  { id: '3',  employee: 'Eva Chen',       type: 'annual',    from_date: '2026-04-07', to_date: '2026-04-09', days: 3,  status: 'pending',  note: 'Personal travel'       },
  { id: '4',  employee: 'Isabella Davis', type: 'maternity', from_date: '2026-03-01', to_date: '2026-05-31', days: 91, status: 'approved', note: 'Maternity leave'       },
  { id: '5',  employee: 'Frank Wilson',   type: 'sick',      from_date: '2026-04-02', to_date: '2026-04-02', days: 1,  status: 'pending',  note: 'Doctor visit'          },
  { id: '6',  employee: 'Grace Turner',   type: 'annual',    from_date: '2026-04-14', to_date: '2026-04-18', days: 5,  status: 'pending',  note: 'Spring break'          },
  { id: '7',  employee: 'James Brown',    type: 'unpaid',    from_date: '2026-03-20', to_date: '2026-03-21', days: 2,  status: 'approved', note: 'Personal matter'       },
  { id: '8',  employee: 'Henry Park',     type: 'annual',    from_date: '2026-04-21', to_date: '2026-04-25', days: 5,  status: 'pending',  note: 'Holiday'               },
  { id: '9',  employee: 'Karen White',    type: 'sick',      from_date: '2026-04-03', to_date: '2026-04-03', days: 1,  status: 'rejected', note: 'Requested too late'    },
  { id: '10', employee: 'Bob Martinez',   type: 'annual',    from_date: '2026-05-01', to_date: '2026-05-05', days: 5,  status: 'pending',  note: 'Pre-approved verbally' },
];

const BLANK: Omit<LeaveRequest, 'id' | 'status'> = {
  employee: '', type: 'annual', from_date: today(), to_date: today(), days: 1, note: '',
};

const statusVariant: Record<LeaveStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning', approved: 'success', rejected: 'destructive',
};

const typeLabel: Record<LeaveType, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity', unpaid: 'Unpaid',
};

export default function Leave() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<LeaveRequest, 'id' | 'status'>>(BLANK);

  const pending        = leaves.filter(l => l.status === 'pending').length;
  const approvedMonth  = leaves.filter(l => l.status === 'approved' && l.from_date.startsWith('2026-03')).length;
  const totalDaysOut   = leaves.filter(l => l.status === 'approved').reduce((s, l) => s + l.days, 0);
  const onLeaveToday   = leaves.filter(l => l.status === 'approved' && l.from_date <= today() && l.to_date >= today()).length;

  function handleApprove(id: string) {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'approved' } : l));
    toast.success('Leave approved');
  }

  function handleReject(id: string) {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'rejected' } : l));
    toast.error('Leave rejected');
  }

  function handleSave() {
    if (!form.employee.trim()) { toast.error('Employee name is required'); return; }
    setLeaves(prev => [...prev, { id: genId(), status: 'pending', ...form }]);
    toast.success('Leave request created');
    setOpen(false);
  }

  function field(key: keyof typeof form, value: string | number) {
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
              {leaves.map(l => (
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
