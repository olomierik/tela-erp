import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Users, Plus, Search, UserX, Calendar,
  DollarSign, Building2, Edit, CheckCircle, XCircle, Clock, Loader2,
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
    employment_type: employee?.employment_type || 'full_time',
    status: employee?.status || 'active',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (isDemo) { return; }
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, salary: parseFloat(form.salary) || 0 };
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
            <Label>Annual Salary</Label>
            <Input value={form.salary} onChange={e => set('salary', e.target.value)} type="number" placeholder="60000" />
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

  const filtered = (employees as any[]).filter(e =>
    (e.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.position || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setSelectedEmployee(null); setEmployeeSheet(true); };
  const openEdit = (emp: any) => { setSelectedEmployee(emp); setEmployeeSheet(true); };

  const activeEmployees = (employees as any[]).filter(e => e.status === 'active');

  const payrollData = activeEmployees.map(e => ({
    ...e,
    gross: (Number(e.salary) || 0) / 12,
    deductions: ((Number(e.salary) || 0) / 12) * 0.15,
    net: ((Number(e.salary) || 0) / 12) * 0.85,
  }));

  const totalGross = payrollData.reduce((s, e) => s + e.gross, 0);
  const totalNet = payrollData.reduce((s, e) => s + e.net, 0);

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="rounded-xl border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Gross (Monthly)</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(totalGross)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Deductions (15%)</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(totalGross - totalNet)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Net Payroll</p>
                  <p className="text-xl font-bold text-indigo-600">{formatMoney(totalNet)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-xl border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Current Payroll Run</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                      <Clock className="w-3.5 h-3.5" /> Save Draft
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Finalize Payroll
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : payrollData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Add employees to run payroll</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left pb-3 font-medium">Employee</th>
                          <th className="text-right pb-3 font-medium">Gross</th>
                          <th className="text-right pb-3 font-medium">Additions</th>
                          <th className="text-right pb-3 font-medium">Deductions</th>
                          <th className="text-right pb-3 font-medium">Net Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payrollData.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-accent/40 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                  {(emp.full_name || '?').charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{emp.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{emp.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-right text-foreground">{formatMoney(emp.gross)}</td>
                            <td className="py-3 text-right">
                              <Input type="number" defaultValue="0" className="w-20 h-7 text-xs text-right ml-auto" />
                            </td>
                            <td className="py-3 text-right">
                              <Input type="number" defaultValue={emp.deductions.toFixed(0)} className="w-24 h-7 text-xs text-right ml-auto" />
                            </td>
                            <td className="py-3 text-right font-semibold text-foreground">{formatMoney(emp.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td className="pt-3 font-semibold text-foreground">Totals</td>
                          <td className="pt-3 text-right font-semibold text-foreground">{formatMoney(totalGross)}</td>
                          <td className="pt-3 text-right font-semibold text-foreground">—</td>
                          <td className="pt-3 text-right font-semibold text-foreground">{formatMoney(totalGross - totalNet)}</td>
                          <td className="pt-3 text-right font-semibold text-indigo-600">{formatMoney(totalNet)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
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
