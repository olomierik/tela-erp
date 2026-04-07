import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Users, CheckCircle, Clock, UserX, Pencil, Trash2, Loader2 } from 'lucide-react';

interface AttendanceRecord extends Record<string, unknown> {
  id: string;
  employee_name: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  work_hours: number | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes: string;
}

type AttendanceStatus = AttendanceRecord['status'];

const statusVariant: Record<AttendanceStatus, 'success' | 'destructive' | 'warning' | 'info'> = {
  present: 'success',
  absent: 'destructive',
  late: 'warning',
  half_day: 'info',
};

const statusLabel: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
};

function fmtTime(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

interface AttendanceForm {
  employee_name: string;
  employee_id: string;
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
  notes: string;
}

const BLANK_FORM: AttendanceForm = {
  employee_name: '',
  employee_id: '',
  status: 'present',
  check_in: nowLocal(),
  check_out: '',
  notes: '',
};

export default function Attendance() {
  const { rows: records, loading, insert, update, remove, setRows } =
    useTable<AttendanceRecord>('myerp_attendance', 'check_in', false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState<AttendanceForm>(BLANK_FORM);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [search, setSearch] = useState('');

  const today = todayStr();

  // KPI counts (always based on today regardless of dateFilter)
  const todayRecords = records.filter(r => r.check_in.startsWith(today));
  const presentToday = todayRecords.filter(r => r.status === 'present').length;
  const lateToday = todayRecords.filter(r => r.status === 'late').length;
  const absentToday = todayRecords.filter(r => r.status === 'absent').length;

  // Filtered rows for table
  const filtered = records.filter(r => {
    const matchDate = dateFilter ? r.check_in.startsWith(dateFilter) : true;
    const matchSearch = search
      ? r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        r.employee_id.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchDate && matchSearch;
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_FORM, check_in: nowLocal() });
    setSheetOpen(true);
  }

  function openEdit(record: AttendanceRecord) {
    setEditing(record);
    setForm({
      employee_name: record.employee_name,
      employee_id: record.employee_id,
      status: record.status,
      check_in: record.check_in ? record.check_in.slice(0, 16) : '',
      check_out: record.check_out ? record.check_out.slice(0, 16) : '',
      notes: record.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.employee_name.trim()) { toast.error('Employee name is required'); return; }
    if (!form.employee_id.trim()) { toast.error('Employee ID is required'); return; }
    if (!form.check_in) { toast.error('Check-in time is required'); return; }

    let work_hours: number | null = null;
    if (form.check_out) {
      const diff = (new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 3600000;
      work_hours = parseFloat(diff.toFixed(2));
    }

    const payload = {
      employee_name: form.employee_name.trim(),
      employee_id: form.employee_id.trim(),
      status: form.status,
      check_in: form.check_in,
      check_out: form.check_out || null,
      work_hours,
      notes: form.notes,
    };

    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Attendance record updated');
      } else {
        await insert(payload);
        toast.success('Attendance recorded');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Record deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete record');
    }
  }

  async function handleClockOut(record: AttendanceRecord) {
    const now = new Date().toISOString();
    const diff = (new Date(now).getTime() - new Date(record.check_in).getTime()) / 3600000;
    const work_hours = parseFloat(diff.toFixed(2));
    try {
      const { data, error } = await supabase
        .from('myerp_attendance')
        .update({ check_out: now, work_hours })
        .eq('id', record.id)
        .select()
        .single();
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === record.id ? (data as AttendanceRecord) : r));
      toast.success(`Clocked out — ${work_hours.toFixed(2)} hrs worked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clock out');
    }
  }

  const set = (key: keyof AttendanceForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <AppLayout title="Attendance">
      <PageHeader
        title="Attendance"
        subtitle="Track and manage employee check-ins and check-outs"
        action={{ label: 'Record Attendance', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Records (Today)', value: todayRecords.length, icon: Users,        color: 'text-primary'     },
          { label: 'Present Today',          value: presentToday,         icon: CheckCircle,  color: 'text-success'     },
          { label: 'Late Today',             value: lateToday,            icon: Clock,        color: 'text-warning'     },
          { label: 'Absent Today',           value: absentToday,          icon: UserX,        color: 'text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Date</Label>
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-40"
          />
        </div>
        <Input
          placeholder="Search employee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employee_name}</TableCell>
                        <TableCell className="font-mono text-sm">{r.employee_id}</TableCell>
                        <TableCell>{formatDate(r.check_in)}</TableCell>
                        <TableCell>{fmtTime(r.check_in)}</TableCell>
                        <TableCell>{fmtTime(r.check_out)}</TableCell>
                        <TableCell>
                          {r.work_hours != null ? `${r.work_hours.toFixed(2)} hrs` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {r.check_out === null && r.status !== 'absent' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-info border-info/40 hover:bg-info/10 text-xs"
                                onClick={() => handleClockOut(r)}
                              >
                                Clock Out
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Attendance' : 'Record Attendance'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="at-name">Employee Name</Label>
              <Input
                id="at-name"
                value={form.employee_name}
                onChange={set('employee_name')}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="at-eid">Employee ID</Label>
              <Input
                id="at-eid"
                value={form.employee_id}
                onChange={set('employee_id')}
                placeholder="EMP-001"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="at-status">Status</Label>
              <Select id="at-status" value={form.status} onChange={set('status')}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="at-checkin">Check In</Label>
              <Input
                id="at-checkin"
                type="datetime-local"
                value={form.check_in}
                onChange={set('check_in')}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="at-checkout">
                Check Out <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="at-checkout"
                type="datetime-local"
                value={form.check_out}
                onChange={set('check_out')}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="at-notes">Notes</Label>
              <Textarea
                id="at-notes"
                value={form.notes}
                onChange={set('notes')}
                placeholder="Any remarks…"
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Record'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
