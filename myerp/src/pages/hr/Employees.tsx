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
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Users, UserCheck, UserMinus, DollarSign, Loader2 } from 'lucide-react';

type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

interface Employee extends Record<string, unknown> {
  id: string;
  full_name: string;
  employee_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  hire_date: string;
  salary: number;
  status: EmployeeStatus;
}

interface EmployeeForm {
  full_name: string;
  employee_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  hire_date: string;
  salary: number;
  status: EmployeeStatus;
}

const BLANK: EmployeeForm = {
  full_name: '', employee_id: '', department: 'Engineering', position: '',
  email: '', phone: '', hire_date: new Date().toISOString().slice(0, 10), salary: 0, status: 'active',
};

const statusVariant: Record<EmployeeStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success', on_leave: 'warning', terminated: 'destructive',
};

const statusLabel: Record<EmployeeStatus, string> = {
  active: 'Active', on_leave: 'On Leave', terminated: 'Terminated',
};

export default function Employees() {
  const { rows: items, loading, insert, update, remove } = useTable<Employee>('myerp_employees');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(BLANK);

  const total = items.length;
  const active = items.filter(e => e.status === 'active').length;
  const onLeave = items.filter(e => e.status === 'on_leave').length;
  const avgSalary = items.length ? items.reduce((s, e) => s + e.salary, 0) / items.length : 0;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      full_name: emp.full_name as string,
      employee_id: emp.employee_id as string,
      department: emp.department as string,
      position: emp.position as string,
      email: emp.email as string,
      phone: emp.phone as string,
      hire_date: emp.hire_date as string,
      salary: emp.salary as number,
      status: emp.status as EmployeeStatus,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    try {
      if (editing) {
        await update(editing.id, { full_name: form.full_name, employee_id: form.employee_id, department: form.department, position: form.position, email: form.email, phone: form.phone, hire_date: form.hire_date, salary: form.salary, status: form.status });
        toast.success('Employee updated');
      } else {
        await insert({ full_name: form.full_name, employee_id: form.employee_id, department: form.department, position: form.position, email: form.email, phone: form.phone, hire_date: form.hire_date, salary: form.salary, status: form.status });
        toast.success('Employee added');
      }
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save employee');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Employee removed');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to remove employee');
    }
  }

  function field(key: keyof EmployeeForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <AppLayout title="Employees">
      <PageHeader title="Employees" subtitle="Manage employee records and information" action={{ label: 'Add Employee', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: total,                     icon: Users,      color: 'text-primary' },
          { label: 'Active',          value: active,                    icon: UserCheck,  color: 'text-success' },
          { label: 'On Leave',        value: onLeave,                   icon: UserMinus,  color: 'text-warning' },
          { label: 'Avg Salary',      value: formatCurrency(avgSalary), icon: DollarSign, color: 'text-info'    },
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
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employee_id}</TableCell>
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>{formatDate(emp.hire_date)}</TableCell>
                    <TableCell>{formatCurrency(emp.salary)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[emp.status]}>{statusLabel[emp.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(emp)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(emp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
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
            <SheetTitle>{editing ? 'Edit Employee' : 'Add Employee'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => field('full_name', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input value={form.employee_id} onChange={e => field('employee_id', e.target.value)} placeholder="EMP013" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onChange={e => field('department', e.target.value)}>
                {['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing'].map(d => <option key={d}>{d}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input value={form.position} onChange={e => field('position', e.target.value)} placeholder="Job Title" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="jane@myerp.io" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => field('phone', e.target.value)} placeholder="555-0100" />
            </div>
            <div className="space-y-1.5">
              <Label>Hire Date</Label>
              <Input type="date" value={form.hire_date} onChange={e => field('hire_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Salary</Label>
              <Input type="number" value={form.salary} onChange={e => field('salary', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value as EmployeeStatus)}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Employee'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
