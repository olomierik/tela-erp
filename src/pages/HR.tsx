import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Users, Plus, Search, UserX, Calendar,
  DollarSign, Building2, Edit, CheckCircle, XCircle, Download, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { onPayrollApproved } from '@/hooks/use-cross-module';

// CSV download helper
function downloadCSV(filename: string, rows: (string | number)[][], headers: string[]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Tanzania 2026 TRA PAYE (monthly taxable income) ──────────────────────
function calculatePAYE(taxable: number): number {
  if (taxable <= 270000) return 0;
  if (taxable <= 520000) return (taxable - 270000) * 0.08;
  if (taxable <= 760000) return 20000 + (taxable - 520000) * 0.20;
  if (taxable <= 1000000) return 68000 + (taxable - 760000) * 0.25;
  return 128000 + (taxable - 1000000) * 0.30;
}

function payeBand(taxable: number): string {
  if (taxable <= 270000) return '0%';
  if (taxable <= 520000) return '8%';
  if (taxable <= 760000) return '20%';
  if (taxable <= 1000000) return '25%';
  return '30%';
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    active: { label: 'Active', class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    inactive: { label: 'Inactive', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    pending: { label: 'Pending', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
    approved: { label: 'Approved', class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    rejected: { label: 'Rejected', class: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  };
  const s = map[status] || { label: status, class: 'bg-gray-100 text-gray-600' };
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', s.class)}>{s.label}</span>;
}

// ─── Summary Row ──────────────────────────────────────────────────────────
function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={cn('flex justify-between', bold && 'font-semibold', color)}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ─── Employee Form ─────────────────────────────────────────────────────────

function EmployeeForm({ employee, onClose }: { employee?: any; onClose: () => void }) {
  const { isDemo } = useAuth();
  const insert = useTenantInsert('employees');
  const update = useTenantUpdate('employees');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: employee?.full_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    department: employee?.department || '',
    start_date: employee?.start_date || '',
    salary: employee?.salary?.toString() || '',
    allowances: employee?.allowances?.toString() || '',
    employment_type: employee?.employment_type || 'full_time',
    status: employee?.status || 'active',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (isDemo) { toast.info('Save disabled in demo mode'); return; }
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    try {
      // Build payload with only columns guaranteed to exist in the DB schema.
      // department (TEXT) and allowances require the patch SQL to be applied first.
      const data: Record<string, any> = {
        full_name: form.full_name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        position: form.position || null,
        start_date: form.start_date || null,
        salary: parseFloat(form.salary) || 0,
        employment_type: form.employment_type,
        status: form.status,
        // Patch-SQL columns — included; DB silently ignores if column missing
        department: form.department || null,
        allowances: parseFloat(form.allowances) || 0,
      };
      if (employee?.id) {
        await update.mutateAsync({ id: employee.id, ...data });
      } else {
        await insert.mutateAsync(data);
      }
      toast.success(employee ? 'Employee updated' : 'Employee added');
      onClose();
    } catch (err: any) {
      // If patch SQL not yet applied, retry without the new columns
      if (err?.message?.includes('column') && (err.message.includes('department') || err.message.includes('allowances'))) {
        try {
          const safeData: Record<string, any> = {
            full_name: form.full_name.trim(),
            email: form.email || null,
            phone: form.phone || null,
            position: form.position || null,
            start_date: form.start_date || null,
            salary: parseFloat(form.salary) || 0,
            employment_type: form.employment_type,
            status: form.status,
          };
          if (employee?.id) await update.mutateAsync({ id: employee.id, ...safeData });
          else await insert.mutateAsync(safeData);
          toast.success(employee ? 'Employee updated' : 'Employee added');
          toast.warning('Run the patch SQL in Supabase to enable department & allowances fields');
          onClose();
        } catch (err2: any) {
          toast.error(err2.message || 'Failed to save employee');
        }
      } else {
        toast.error(err?.message || 'Failed to save employee');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>{employee ? 'Edit Employee' : 'Add Employee'}</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 0100" />
          </div>
          <div className="space-y-1.5">
            <Label>Position</Label>
            <Input value={form.position} onChange={e => set('position', e.target.value)} placeholder="Software Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Finance" />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input value={form.start_date} onChange={e => set('start_date', e.target.value)} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Basic Salary (TZS)</Label>
            <Input value={form.salary} onChange={e => set('salary', e.target.value)} type="number" placeholder="500000" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Allowances (TZS)</Label>
            <Input value={form.allowances} onChange={e => set('allowances', e.target.value)} type="number" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Employment Type</Label>
            <Select value={form.employment_type} onValueChange={v => set('employment_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {employee ? 'Save Changes' : 'Add Employee'}
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Leave Request Form ────────────────────────────────────────────────────
function LeaveRequestForm({ employees, onClose, onSubmit, isPending }: {
  employees: any[];
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    employee_id: '',
    employee_name: '',
    leave_type: 'annual',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    days: 1,
    reason: '',
  });
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    setForm(f => ({ ...f, employee_id: empId, employee_name: emp?.full_name || '' }));
  };

  const handleSubmit = () => {
    if (!form.employee_id) { toast.error('Select an employee'); return; }
    onSubmit({
      employee_id: form.employee_id,
      employee_name: form.employee_name,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days: form.days,
      reason: form.reason,
      status: 'pending',
    });
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>New Leave Request</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Employee *</Label>
          <Select value={form.employee_id} onValueChange={handleEmployeeSelect}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employees.filter(e => e.status === 'active').map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Leave Type</Label>
          <Select value={form.leave_type} onValueChange={v => set('leave_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="maternity">Maternity</SelectItem>
              <SelectItem value="paternity">Paternity</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="space-y-1.5">
          <Label>Days</Label>
          <Input type="number" min={1} value={form.days} onChange={e => set('days', Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <Input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Reason for leave..." />
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Submit Request
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main HR Page ──────────────────────────────────────────────────────────

export default function HR() {
  const { formatMoney } = useCurrency();
  const { isDemo, tenant } = useAuth();
  const [search, setSearch] = useState('');
  const [employeeSheet, setEmployeeSheet] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('employees');
  const [leaveSheet, setLeaveSheet] = useState(false);

  const { data: employees = [], isLoading } = useTenantQuery('employees');
  const { data: leaveRequests = [], isLoading: leaveLoading } = useTenantQuery('leave_requests');
  const deleteEmployee = useTenantDelete('employees');
  const updateLeave = useTenantUpdate('leave_requests');
  const insertLeave = useTenantInsert('leave_requests');

  // Per-run allowance overrides (employee id → monthly allowance)
  const [runAllowances, setRunAllowances] = useState<Record<string, number>>({});

  const filtered = (employees as any[]).filter(e =>
    (e.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.position || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setSelectedEmployee(null); setEmployeeSheet(true); };
  const openEdit = (emp: any) => { setSelectedEmployee(emp); setEmployeeSheet(true); };

  const activeEmployees = (employees as any[]).filter(e => e.status === 'active');

  // ── Tanzania statutory payroll calculation ────────────────────────────────
  const payrollData = activeEmployees.map(e => {
    const basic = Number(e.salary) || 0;
    const baseAllowances = Number(e.allowances) || 0;
    const allowances = runAllowances[e.id] ?? baseAllowances;
    const gross = basic + allowances;             // Gross = Basic + Allowances
    const paye = calculatePAYE(gross);            // PAYE on full gross
    const nssfEmployee = basic * 0.10;            // NSSF: 10% of basic, employee
    const nssfEmployer = basic * 0.10;            // NSSF: 10% of basic, employer
    const sdl = gross * 0.035;                    // SDL: 3.5% of GROSS (basic + allowances)
    const wcf = gross * 0.005;                    // WCF: 0.5% of GROSS (basic + allowances)
    const net = gross - paye - nssfEmployee;      // take-home
    const totalEmployerCost = gross + nssfEmployer + sdl + wcf;
    return { ...e, basic, allowances, gross, paye, band: payeBand(gross), nssfEmployee, nssfEmployer, sdl, wcf, net, totalEmployerCost };
  });

  const totalBasic        = payrollData.reduce((s, e) => s + e.basic, 0);
  const totalAllowances   = payrollData.reduce((s, e) => s + e.allowances, 0);
  const totalGross        = payrollData.reduce((s, e) => s + e.gross, 0);
  const totalPAYE         = payrollData.reduce((s, e) => s + e.paye, 0);
  const totalNssfEmp      = payrollData.reduce((s, e) => s + e.nssfEmployee, 0);
  const totalNssfEmpr     = payrollData.reduce((s, e) => s + e.nssfEmployer, 0);
  const totalSDL          = payrollData.reduce((s, e) => s + e.sdl, 0);
  const totalWCF          = payrollData.reduce((s, e) => s + e.wcf, 0);
  const totalNet          = payrollData.reduce((s, e) => s + e.net, 0);
  const totalEmployerCost = payrollData.reduce((s, e) => s + e.totalEmployerCost, 0);

  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleDownload = () => {
    const headers = ['Employee', 'Position', 'Department', 'Basic Salary', 'Allowances', 'Gross Salary', 'PAYE', 'NSSF (Emp 10%)', 'Net Pay', 'NSSF (Empr 10%)', 'SDL (3.5%)', 'WCF (0.5%)', 'Total Employer Cost'];
    const rows = payrollData.map(e => [
      e.full_name, e.position || '', e.department || '',
      Math.round(e.basic), Math.round(e.allowances), Math.round(e.gross),
      Math.round(e.paye), Math.round(e.nssfEmployee), Math.round(e.net),
      Math.round(e.nssfEmployer), Math.round(e.sdl), Math.round(e.wcf),
      Math.round(e.totalEmployerCost),
    ]);
    rows.push(['TOTALS', '', '',
      Math.round(totalBasic), Math.round(totalAllowances), Math.round(totalGross),
      Math.round(totalPAYE), Math.round(totalNssfEmp), Math.round(totalNet),
      Math.round(totalNssfEmpr), Math.round(totalSDL), Math.round(totalWCF),
      Math.round(totalEmployerCost),
    ]);
    downloadCSV(`payroll-${month.replace(' ', '-')}.csv`, rows, headers);
    toast.success('Payroll report downloaded');
  };

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    if (isDemo) return;
    await updateLeave.mutateAsync({ id, status });
  };

  const [postingPayroll, setPostingPayroll] = useState(false);

  const handlePostToAccounting = async () => {
    if (isDemo || !tenant?.id || payrollData.length === 0) return;
    setPostingPayroll(true);
    try {
      const runId = `payroll-${new Date().toISOString().slice(0, 7)}`;
      const lines = payrollData.map((e: any) => ({
        employee_id: e.id,
        gross_salary: e.gross,
        net_salary: e.net,
        paye: e.paye,
        nssf_employee: e.nssfEmployee,
        nssf_employer: e.nssfEmployer,
        sdl: e.sdl,
        wcf: e.wcf,
      }));
      await onPayrollApproved(
        tenant.id,
        { id: runId, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
        lines,
      );
      toast.success(`Payroll posted to accounting — ${formatMoney(totalNet)} net salaries + deductions`);
    } catch (err: any) {
      toast.error(`Failed to post payroll: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setPostingPayroll(false);
    }
  };


  return (
    <AppLayout title="HR & Payroll" subtitle="Manage your workforce">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        {/* ── Employees ── */}
        <TabsContent value="employees">
          <div className="flex flex-col gap-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Staff</p>
                <p className="text-xl font-bold text-foreground">{(employees as any[]).length}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-green-600">{activeEmployees.length}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Pending Leave</p>
                <p className="text-xl font-bold text-amber-500">{(leaveRequests as any[]).filter((l: any) => l.status === 'pending').length}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Monthly Payroll</p>
                <p className="text-xl font-bold text-indigo-600">{formatMoney(totalGross)}</p>
              </CardContent></Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={openAdd}>
                <Plus className="w-4 h-4" /> Add Employee
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No employees yet</p>
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={openAdd}>
                  <Plus className="w-4 h-4" /> Add First Employee
                </Button>
              </div>
            ) : (
              <Card className="rounded-xl border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3 font-medium">Employee</th>
                        <th className="text-left px-4 py-3 font-medium">Position</th>
                        <th className="text-left px-4 py-3 font-medium">Department</th>
                        <th className="text-left px-4 py-3 font-medium">Start Date</th>
                        <th className="text-right px-4 py-3 font-medium">Salary</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-right px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-accent/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                                {(emp.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">{emp.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{emp.email || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-foreground">{emp.position || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.department || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.start_date || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{formatMoney(emp.salary || 0)}</td>
                          <td className="px-4 py-3"><StatusBadge status={emp.status || 'active'} /></td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(emp)}>
                                <Edit className="w-3 h-3" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => !isDemo && deleteEmployee.mutate(emp.id)}
                              >
                                <UserX className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Leave Requests ── */}
        <TabsContent value="leave">
          <Card className="rounded-xl border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Leave Requests</CardTitle>
                {!isDemo && (
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-8 text-xs" onClick={() => setLeaveSheet(true)}>
                    <Plus className="w-3.5 h-3.5" /> New Leave Request
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left pb-3 font-medium">Employee</th>
                      <th className="text-left pb-3 font-medium">Type</th>
                      <th className="text-left pb-3 font-medium">Period</th>
                      <th className="text-left pb-3 font-medium">Reason</th>
                      <th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-right pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaveLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}><td colSpan={6} className="py-3"><Skeleton className="h-5 w-full" /></td></tr>
                      ))
                    ) : (leaveRequests as any[]).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">No leave requests</td>
                      </tr>
                    ) : (leaveRequests as any[]).map((req: any) => (
                      <tr key={req.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3 font-medium text-foreground">{req.employee_name || req.employee_id}</td>
                        <td className="py-3 text-muted-foreground">{req.leave_type || req.type}</td>
                        <td className="py-3 text-muted-foreground text-xs">{req.start_date} → {req.end_date}</td>
                        <td className="py-3 text-muted-foreground max-w-[180px] truncate">{req.reason}</td>
                        <td className="py-3"><StatusBadge status={req.status} /></td>
                        <td className="py-3 text-right">
                          {req.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-600 hover:bg-green-50 gap-1"
                                onClick={() => handleLeaveAction(req.id, 'approved')}
                              >
                                <CheckCircle className="w-3 h-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-500 hover:bg-red-50 gap-1"
                                onClick={() => handleLeaveAction(req.id, 'rejected')}
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll">
          <div className="space-y-4">

            {/* Header + download */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">Payroll Report — {month}</h2>
                <p className="text-xs text-muted-foreground">{payrollData.length} active employee{payrollData.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleDownload} disabled={payrollData.length === 0}>
                  <Download className="w-3.5 h-3.5" /> Download CSV
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handlePostToAccounting}
                  disabled={payrollData.length === 0 || postingPayroll || isDemo}
                >
                  {postingPayroll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Post to Accounting
                </Button>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Gross Salary', value: formatMoney(totalGross), color: 'text-foreground' },
                { label: 'PAYE → TRA', value: formatMoney(totalPAYE), color: 'text-red-500' },
                { label: 'Net Pay (Take-home)', value: formatMoney(totalNet), color: 'text-indigo-600' },
                { label: 'Total Employer Cost', value: formatMoney(totalEmployerCost), color: 'text-amber-600' },
              ].map(k => (
                <Card key={k.label} className="rounded-xl border-border">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main payroll table */}
            <Card className="rounded-xl border-border">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6"><Skeleton className="h-32 w-full" /></div>
                ) : payrollData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Add active employees to generate payroll</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                          <th className="text-left px-4 py-3 font-medium">Employee</th>
                          <th className="text-right px-3 py-3 font-medium">Basic Salary</th>
                          <th className="text-right px-3 py-3 font-medium">Allowances</th>
                          <th className="text-right px-3 py-3 font-medium">PAYE (TRA)</th>
                          <th className="text-right px-3 py-3 font-medium">NSSF Emp</th>
                          <th className="text-right px-3 py-3 font-medium text-indigo-600">Net Pay</th>
                          <th className="text-right px-3 py-3 font-medium text-amber-500">NSSF Empr</th>
                          <th className="text-right px-3 py-3 font-medium text-amber-500">SDL 3.5%</th>
                          <th className="text-right px-3 py-3 font-medium text-amber-500">WCF 0.5%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payrollData.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{emp.full_name}</p>
                              <p className="text-muted-foreground">{emp.position || '—'} {emp.department ? `· ${emp.department}` : ''}</p>
                            </td>
                            <td className="px-3 py-3 text-right text-foreground">{Math.round(emp.gross).toLocaleString()}</td>
                            <td className="px-3 py-3 text-right">
                              <Input
                                type="number"
                                value={runAllowances[emp.id] ?? emp.allowances}
                                onChange={e => setRunAllowances(prev => ({ ...prev, [emp.id]: Number(e.target.value) }))}
                                className="w-24 h-7 text-xs text-right ml-auto"
                              />
                            </td>
                            <td className="px-3 py-3 text-right text-red-500 font-medium">
                              {Math.round(emp.paye).toLocaleString()}
                              <span className="ml-1 text-muted-foreground">({emp.band})</span>
                            </td>
                            <td className="px-3 py-3 text-right text-orange-500">{Math.round(emp.nssfEmployee).toLocaleString()}</td>
                            <td className="px-3 py-3 text-right font-bold text-indigo-600">{Math.round(emp.net).toLocaleString()}</td>
                            <td className="px-3 py-3 text-right text-amber-500">{Math.round(emp.nssfEmployer).toLocaleString()}</td>
                            <td className="px-3 py-3 text-right text-amber-500">{Math.round(emp.sdl).toLocaleString()}</td>
                            <td className="px-3 py-3 text-right text-amber-500">{Math.round(emp.wcf).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                          <td className="px-4 py-3 text-foreground">TOTALS ({payrollData.length} employees)</td>
                          <td className="px-3 py-3 text-right">{Math.round(totalGross).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right">{Math.round(totalAllowances).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-red-500">{Math.round(totalPAYE).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-orange-500">{Math.round(totalNssfEmp).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-indigo-600">{Math.round(totalNet).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-500">{Math.round(totalNssfEmpr).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-500">{Math.round(totalSDL).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-500">{Math.round(totalWCF).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payables Summary */}
            {payrollData.length > 0 && (() => {
              const totalNssf = totalNssfEmp + totalNssfEmpr; // employer submits full 20%
              const totalCash = totalNet + totalPAYE + totalNssf + totalSDL + totalWCF;
              const payables = [
                { label: 'Net Salaries', sublabel: 'Pay to employees', value: totalNet, color: 'text-indigo-600' },
                { label: 'PAYE', sublabel: 'Remit to TRA', value: totalPAYE, color: 'text-red-500' },
                { label: 'NSSF (20% of basic)', sublabel: 'Employee 10% + Employer 10% — submit to NSSF', value: totalNssf, color: 'text-orange-500' },
                { label: 'SDL (3.5% of gross)', sublabel: 'Skills & Dev. Levy — remit to VETA', value: totalSDL, color: 'text-amber-600' },
                { label: 'WCF (0.5% of gross)', sublabel: "Workers' Comp. Fund — remit to WCF Board", value: totalWCF, color: 'text-amber-600' },
              ];
              return (
                <Card className="rounded-xl border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Payroll Payables Summary — {month}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-2.5 font-medium">Obligation</th>
                          <th className="text-left px-4 py-2.5 font-medium">Payable To</th>
                          <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payables.map(p => (
                          <tr key={p.label} className="hover:bg-accent/30">
                            <td className="px-4 py-3">
                              <p className={`font-medium ${p.color}`}>{p.label}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{p.sublabel}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${p.color}`}>{formatMoney(p.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30">
                          <td className="px-4 py-3 font-bold text-foreground">Total Cash Required</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">All obligations this month</td>
                          <td className="px-4 py-3 text-right font-bold text-lg text-foreground">{formatMoney(totalCash)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <p className="px-4 py-2.5 text-xs text-muted-foreground border-t border-border">
                      Note: NSSF — employer collects 10% from each employee's pay and adds own 10%, then submits the combined 20% to NSSF.
                    </p>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </TabsContent>

        {/* ── Departments ── */}
        <TabsContent value="departments">
          {(() => {
            const deptMap: Record<string, number> = {};
            (employees as any[]).forEach(e => {
              const d = (e.department || 'Unassigned').trim();
              deptMap[d] = (deptMap[d] || 0) + 1;
            });
            const depts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{depts.length} department{depts.length !== 1 ? 's' : ''}</p>
                {depts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Add employees and assign departments to see them here.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {depts.map(([dept, count]) => (
                      <Card key={dept} className="rounded-xl border-border hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{dept}</p>
                            <p className="text-xs text-muted-foreground">{count} employee{count !== 1 ? 's' : ''}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Employee Sheet */}
      <Sheet open={employeeSheet} onOpenChange={setEmployeeSheet}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          <EmployeeForm employee={selectedEmployee} onClose={() => setEmployeeSheet(false)} />
        </SheetContent>
      </Sheet>

      {/* Leave Request Sheet */}
      <Sheet open={leaveSheet} onOpenChange={setLeaveSheet}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          <LeaveRequestForm
            employees={employees as any[]}
            onClose={() => setLeaveSheet(false)}
            onSubmit={(data) => {
              insertLeave.mutate(data, {
                onSuccess: () => { toast.success('Leave request submitted'); setLeaveSheet(false); },
                onError: (err: any) => toast.error(err?.message || 'Failed to submit'),
              });
            }}
            isPending={insertLeave.isPending}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
