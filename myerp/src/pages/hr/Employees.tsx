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
import { formatCurrency, formatDate, genId, today } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, Users, UserCheck, UserMinus, DollarSign } from 'lucide-react';

type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

interface Employee {
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

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', full_name: 'Alice Johnson',   employee_id: 'EMP001', department: 'Engineering', position: 'Senior Engineer',       email: 'alice@myerp.io',    phone: '555-0101', hire_date: '2021-03-15', salary: 95000,  status: 'active'     },
  { id: '2', full_name: 'Bob Martinez',    employee_id: 'EMP002', department: 'Sales',       position: 'Sales Manager',         email: 'bob@myerp.io',      phone: '555-0102', hire_date: '2020-07-01', salary: 78000,  status: 'active'     },
  { id: '3', full_name: 'Carol Smith',     employee_id: 'EMP003', department: 'HR',          position: 'HR Specialist',         email: 'carol@myerp.io',    phone: '555-0103', hire_date: '2022-01-10', salary: 62000,  status: 'active'     },
  { id: '4', full_name: 'David Lee',       employee_id: 'EMP004', department: 'Finance',     position: 'Financial Analyst',     email: 'david@myerp.io',    phone: '555-0104', hire_date: '2019-11-20', salary: 72000,  status: 'on_leave'   },
  { id: '5', full_name: 'Eva Chen',        employee_id: 'EMP005', department: 'Engineering', position: 'Frontend Developer',    email: 'eva@myerp.io',      phone: '555-0105', hire_date: '2023-02-14', salary: 85000,  status: 'active'     },
  { id: '6', full_name: 'Frank Wilson',    employee_id: 'EMP006', department: 'Operations',  position: 'Operations Lead',       email: 'frank@myerp.io',    phone: '555-0106', hire_date: '2018-06-30', salary: 68000,  status: 'active'     },
  { id: '7', full_name: 'Grace Turner',    employee_id: 'EMP007', department: 'Marketing',   position: 'Marketing Manager',     email: 'grace@myerp.io',    phone: '555-0107', hire_date: '2021-09-05', salary: 74000,  status: 'active'     },
  { id: '8', full_name: 'Henry Park',      employee_id: 'EMP008', department: 'Engineering', position: 'Backend Developer',     email: 'henry@myerp.io',    phone: '555-0108', hire_date: '2022-04-18', salary: 88000,  status: 'active'     },
  { id: '9', full_name: 'Isabella Davis',  employee_id: 'EMP009', department: 'Sales',       position: 'Account Executive',     email: 'isabella@myerp.io', phone: '555-0109', hire_date: '2023-07-22', salary: 58000,  status: 'on_leave'   },
  { id: '10', full_name: 'James Brown',    employee_id: 'EMP010', department: 'Finance',     position: 'Senior Accountant',     email: 'james@myerp.io',    phone: '555-0110', hire_date: '2017-12-01', salary: 80000,  status: 'active'     },
  { id: '11', full_name: 'Karen White',    employee_id: 'EMP011', department: 'HR',          position: 'Recruiter',             email: 'karen@myerp.io',    phone: '555-0111', hire_date: '2024-01-08', salary: 55000,  status: 'active'     },
  { id: '12', full_name: 'Leo Garcia',     employee_id: 'EMP012', department: 'Operations',  position: 'Logistics Coordinator', email: 'leo@myerp.io',      phone: '555-0112', hire_date: '2020-03-25', salary: 52000,  status: 'terminated' },
];

const BLANK: Omit<Employee, 'id'> = {
  full_name: '', employee_id: '', department: 'Engineering', position: '',
  email: '', phone: '', hire_date: today(), salary: 0, status: 'active',
};

const statusVariant: Record<EmployeeStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success', on_leave: 'warning', terminated: 'destructive',
};

const statusLabel: Record<EmployeeStatus, string> = {
  active: 'Active', on_leave: 'On Leave', terminated: 'Terminated',
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(BLANK);

  const total = employees.length;
  const active = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'on_leave').length;
  const avgSalary = employees.length ? employees.reduce((s, e) => s + e.salary, 0) / employees.length : 0;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({ full_name: emp.full_name, employee_id: emp.employee_id, department: emp.department, position: emp.position, email: emp.email, phone: emp.phone, hire_date: emp.hire_date, salary: emp.salary, status: emp.status });
    setOpen(true);
  }

  function handleSave() {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (editing) {
      setEmployees(prev => prev.map(e => e.id === editing.id ? { ...editing, ...form } : e));
      toast.success('Employee updated');
    } else {
      setEmployees(prev => [...prev, { id: genId(), ...form }]);
      toast.success('Employee added');
    }
    setOpen(false);
  }

  function handleDelete(id: string) {
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast.success('Employee removed');
  }

  function field(key: keyof Omit<Employee, 'id'>, value: string | number) {
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
              {employees.map(emp => (
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
