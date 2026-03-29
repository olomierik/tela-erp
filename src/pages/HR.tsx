import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Users, Plus, Search, UserX, Calendar,
  DollarSign, Building2, Edit, CheckCircle, XCircle, Clock, Loader2, Printer,
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

const demoDepartments = ['Engineering', 'Sales', 'HR', 'Finance', 'Marketing', 'Operations'];

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
    if (isDemo) { return; }
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, salary: parseFloat(form.salary) || 0, allowances: parseFloat(form.allowances) || 0 };
      if (employee?.id) {
        await update.mutateAsync({ id: employee.id, ...data });
      } else {
        await insert.mutateAsync(data);
      }
      onClose();
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
            <Select value={form.department} onValueChange={v => set('department', v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {demoDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
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

// ─── Main HR Page ──────────────────────────────────────────────────────────

export default function HR() {
  const { formatMoney } = useCurrency();
  const { isDemo } = useAuth();
  const [search, setSearch] = useState('');
  const [employeeSheet, setEmployeeSheet] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('employees');

  const { data: employees = [], isLoading } = useTenantQuery('employees');
  const { data: leaveRequests = [], isLoading: leaveLoading } = useTenantQuery('leave_requests');
  const deleteEmployee = useTenantDelete('employees');
  const updateLeave = useTenantUpdate('leave_requests');

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
  // Salary stored as monthly basic. If it was stored annually, divide by 12.
  const payrollData = activeEmployees.map(e => {
    const basic = Number(e.salary) || 0;
    // Support both annual (>100k) and monthly storage — treat as monthly if ≤ 5M
    const gross = basic;
    const baseAllowances = Number(e.allowances) || 0;
    const allowances = runAllowances[e.id] ?? baseAllowances;
    const taxable = gross + allowances;           // PAYE base = gross + allowances
    const paye = calculatePAYE(taxable);
    const nssfEmployee = gross * 0.10;            // 10% deducted from employee
    const nssfEmployer = gross * 0.10;            // 10% paid by employer
    const sdl = taxable * 0.035;                  // 3.5% of taxable, employer cost
    const net = taxable - paye - nssfEmployee;    // take-home
    const totalEmployerCost = gross + nssfEmployer + sdl;
    return { ...e, gross, allowances, taxable, paye, band: payeBand(taxable), nssfEmployee, nssfEmployer, sdl, net, totalEmployerCost };
  });

  const totalGross      = payrollData.reduce((s, e) => s + e.gross, 0);
  const totalAllowances = payrollData.reduce((s, e) => s + e.allowances, 0);
  const totalTaxable    = payrollData.reduce((s, e) => s + e.taxable, 0);
  const totalPAYE       = payrollData.reduce((s, e) => s + e.paye, 0);
  const totalNssfEmp    = payrollData.reduce((s, e) => s + e.nssfEmployee, 0);
  const totalNssfEmpr   = payrollData.reduce((s, e) => s + e.nssfEmployer, 0);
  const totalSDL        = payrollData.reduce((s, e) => s + e.sdl, 0);
  const totalNet        = payrollData.reduce((s, e) => s + e.net, 0);
  const totalEmployerCost = payrollData.reduce((s, e) => s + e.totalEmployerCost, 0);

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    if (isDemo) return;
    await updateLeave.mutateAsync({ id, status });
  };

  const deptCounts = demoDepartments.map(dept => ({
    dept,
    count: (employees as any[]).filter(e => e.department === dept).length,
  }));

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
                <p className="text-xl font-bold text-indigo-600">{formatMoney(totalTaxable)}</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((emp: any) => (
                  <motion.div key={emp.id} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                    <Card className="rounded-xl border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
                              {(emp.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">{emp.position}</p>
                            </div>
                          </div>
                          <StatusBadge status={emp.status || 'active'} />
                        </div>
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />{emp.department || '—'}</div>
                          <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Since {emp.start_date || '—'}</div>
                          <div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" />{formatMoney(emp.salary || 0)}/year</div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => openEdit(emp)}>
                            <Edit className="w-3 h-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => !isDemo && deleteEmployee.mutate(emp.id)}
                          >
                            <UserX className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Leave Requests ── */}
        <TabsContent value="leave">
          <Card className="rounded-xl border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Leave Requests</CardTitle>
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

            {/* ── KPI Summary ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Gross + Allowances</p>
                <p className="text-lg font-bold text-foreground">{formatMoney(totalTaxable)}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total PAYE (→ TRA)</p>
                <p className="text-lg font-bold text-red-500">{formatMoney(totalPAYE)}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Net Pay (Take-home)</p>
                <p className="text-lg font-bold text-indigo-600">{formatMoney(totalNet)}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Employer Cost</p>
                <p className="text-lg font-bold text-amber-600">{formatMoney(totalEmployerCost)}</p>
              </CardContent></Card>
            </div>

            {/* ── Payroll Run Table ── */}
            <Card className="rounded-xl border-border">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold">Payroll Run — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => window.print()}>
                      <Printer className="w-3.5 h-3.5" /> Print Report
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Finalize
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6"><Skeleton className="h-32 w-full" /></div>
                ) : payrollData.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Add active employees to run payroll</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                          <th className="text-left px-4 py-2.5 font-medium">Employee</th>
                          <th className="text-right px-3 py-2.5 font-medium">Basic (TZS)</th>
                          <th className="text-right px-3 py-2.5 font-medium">Allowances</th>
                          <th className="text-right px-3 py-2.5 font-medium">Taxable</th>
                          <th className="text-right px-3 py-2.5 font-medium">PAYE Band</th>
                          <th className="text-right px-3 py-2.5 font-medium">PAYE</th>
                          <th className="text-right px-3 py-2.5 font-medium">NSSF (Emp 10%)</th>
                          <th className="text-right px-3 py-2.5 font-medium text-indigo-600">Net Pay</th>
                          <th className="text-right px-3 py-2.5 font-medium text-amber-600">NSSF (Empr 10%)</th>
                          <th className="text-right px-3 py-2.5 font-medium text-amber-600">SDL (3.5%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payrollData.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {(emp.full_name || '?').charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground leading-tight">{emp.full_name}</p>
                                  <p className="text-muted-foreground">{emp.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-foreground">{emp.gross.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right">
                              <Input
                                type="number"
                                value={runAllowances[emp.id] ?? emp.allowances}
                                onChange={e => setRunAllowances(prev => ({ ...prev, [emp.id]: Number(e.target.value) }))}
                                className="w-24 h-7 text-xs text-right ml-auto"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-foreground">{emp.taxable.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right">
                              <span className="inline-block rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium">
                                {emp.band}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right text-red-500 font-medium">{emp.paye.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right text-orange-500">{emp.nssfEmployee.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right font-bold text-indigo-600">{emp.net.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right text-amber-600">{emp.nssfEmployer.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right text-amber-600">{emp.sdl.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30 font-semibold text-xs">
                          <td className="px-4 py-3 text-foreground">TOTALS</td>
                          <td className="px-3 py-3 text-right text-foreground">{totalGross.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-foreground">{totalAllowances.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-foreground">{totalTaxable.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right">—</td>
                          <td className="px-3 py-3 text-right text-red-500">{totalPAYE.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-orange-500">{totalNssfEmp.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-indigo-600">{totalNet.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-600">{totalNssfEmpr.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-600">{totalSDL.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Statutory Payables Summary ── */}
            {payrollData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee deductions */}
                <Card className="rounded-xl border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Employee Deductions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross + Allowances</span>
                      <span className="font-medium">{formatMoney(totalTaxable)}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>PAYE (→ TRA)</span>
                      <span className="font-medium">− {formatMoney(totalPAYE)}</span>
                    </div>
                    <div className="flex justify-between text-orange-500">
                      <span>NSSF Employee (10%)</span>
                      <span className="font-medium">− {formatMoney(totalNssfEmp)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <span className="text-indigo-600">Net Pay to Employees</span>
                      <span className="text-indigo-600">{formatMoney(totalNet)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Employer statutory costs */}
                <Card className="rounded-xl border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Employer Statutory Obligations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Pay to Employees</span>
                      <span className="font-medium">{formatMoney(totalNet)}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>PAYE (remit to TRA)</span>
                      <span className="font-medium">{formatMoney(totalPAYE)}</span>
                    </div>
                    <div className="flex justify-between text-orange-500">
                      <span>NSSF Employee (remit)</span>
                      <span className="font-medium">{formatMoney(totalNssfEmp)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>NSSF Employer (10%)</span>
                      <span className="font-medium">{formatMoney(totalNssfEmpr)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>SDL (3.5%)</span>
                      <span className="font-medium">{formatMoney(totalSDL)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-bold">
                      <span className="text-amber-600">Total Employer Cost</span>
                      <span className="text-amber-600">{formatMoney(totalEmployerCost)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* PAYE band reference */}
                <Card className="rounded-xl border-border sm:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tanzania 2026 TRA PAYE Bands (Monthly)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left pb-2 font-medium">Taxable Income (TZS)</th>
                            <th className="text-left pb-2 font-medium">Rate</th>
                            <th className="text-left pb-2 font-medium">Tax Formula</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            { range: '0 – 270,000', rate: '0%', formula: 'Nil' },
                            { range: '270,001 – 520,000', rate: '8%', formula: '8% × (income − 270,000)' },
                            { range: '520,001 – 760,000', rate: '20%', formula: '20,000 + 20% × (income − 520,000)' },
                            { range: '760,001 – 1,000,000', rate: '25%', formula: '68,000 + 25% × (income − 760,000)' },
                            { range: 'Above 1,000,000', rate: '30%', formula: '128,000 + 30% × (income − 1,000,000)' },
                          ].map(r => (
                            <tr key={r.range} className="hover:bg-accent/30">
                              <td className="py-2 text-foreground font-medium">{r.range}</td>
                              <td className="py-2">
                                <span className="inline-block rounded-full px-2 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold">{r.rate}</span>
                              </td>
                              <td className="py-2 text-muted-foreground">{r.formula}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      NSSF: 10% employee + 10% employer of basic gross. SDL: 3.5% of (gross + allowances) — employer only. Source: TRA 2026.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Departments ── */}
        <TabsContent value="departments">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{demoDepartments.length} departments</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {deptCounts.map(({ dept, count }) => (
                <Card key={dept} className="rounded-xl border-border hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{dept}</p>
                        <p className="text-xs text-muted-foreground">{count} employee{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Sheet */}
      <Sheet open={employeeSheet} onOpenChange={setEmployeeSheet}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          <EmployeeForm employee={selectedEmployee} onClose={() => setEmployeeSheet(false)} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
