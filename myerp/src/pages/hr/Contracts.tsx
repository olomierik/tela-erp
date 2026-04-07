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
import { formatCurrency, formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { FileText, CheckCircle, AlertTriangle, XCircle, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Contract extends Record<string, unknown> {
  id: string;
  contract_number: string;
  employee_name: string;
  job_title: string;
  department: string;
  contract_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  start_date: string;
  end_date: string | null;
  salary: number;
  currency: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  notes: string;
}

type ContractStatus = Contract['status'];
type ContractType = Contract['contract_type'];

const statusVariant: Record<ContractStatus, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  active: 'success',
  expired: 'warning',
  terminated: 'destructive',
};

const typeLabel: Record<ContractType, string> = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  internship: 'Internship',
};

interface ContractForm {
  employee_name: string;
  job_title: string;
  department: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string;
  salary: string;
  currency: string;
  status: ContractStatus;
  notes: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const BLANK_FORM: ContractForm = {
  employee_name: '',
  job_title: '',
  department: '',
  contract_type: 'full_time',
  start_date: todayStr(),
  end_date: '',
  salary: '',
  currency: 'USD',
  status: 'draft',
  notes: '',
};

function generateContractNumber(existing: Contract[]): string {
  const year = new Date().getFullYear();
  const prefix = `CONT-${year}-`;
  const nums = existing
    .map(c => c.contract_number)
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function isExpiringThisMonth(endDate: string | null): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return end >= now && end <= in30;
}

export default function Contracts() {
  const { rows: contracts, loading, insert, update, remove } =
    useTable<Contract>('myerp_contracts', 'created_at', false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState<ContractForm>(BLANK_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // KPIs
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const expiringThisMonth = contracts.filter(c => c.status === 'active' && isExpiringThisMonth(c.end_date)).length;
  const terminatedContracts = contracts.filter(c => c.status === 'terminated').length;

  // Filtered rows
  const filtered = contracts.filter(c => {
    const matchSearch = search
      ? c.employee_name.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    const matchType = typeFilter ? c.contract_type === typeFilter : true;
    return matchSearch && matchStatus && matchType;
  });

  function openCreate() {
    setEditing(null);
    setForm(BLANK_FORM);
    setSheetOpen(true);
  }

  function openEdit(contract: Contract) {
    setEditing(contract);
    setForm({
      employee_name: contract.employee_name,
      job_title: contract.job_title,
      department: contract.department,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date ?? '',
      salary: String(contract.salary),
      currency: contract.currency,
      status: contract.status,
      notes: contract.notes ?? '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.employee_name.trim()) { toast.error('Employee name is required'); return; }
    if (!form.job_title.trim()) { toast.error('Job title is required'); return; }
    if (!form.start_date) { toast.error('Start date is required'); return; }

    const payload = {
      contract_number: editing ? editing.contract_number : generateContractNumber(contracts),
      employee_name: form.employee_name.trim(),
      job_title: form.job_title.trim(),
      department: form.department.trim(),
      contract_type: form.contract_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      salary: parseFloat(form.salary) || 0,
      currency: form.currency,
      status: form.status,
      notes: form.notes,
    };

    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Contract updated');
      } else {
        await insert(payload);
        toast.success('Contract created');
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save contract');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Contract deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contract');
    }
  }

  const set = (key: keyof ContractForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <AppLayout title="Contracts">
      <PageHeader
        title="Employment Contracts"
        subtitle="Manage employee contracts, terms, and compensation"
        action={{ label: 'New Contract', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Contracts',       value: totalContracts,      icon: FileText,     color: 'text-primary'     },
          { label: 'Active',                 value: activeContracts,     icon: CheckCircle,  color: 'text-success'     },
          { label: 'Expiring This Month',    value: expiringThisMonth,   icon: AlertTriangle,color: 'text-warning'     },
          { label: 'Terminated',             value: terminatedContracts, icon: XCircle,      color: 'text-destructive' },
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
        <Input
          placeholder="Search employee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </Select>
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-40">
          <option value="">All Types</option>
          <option value="full_time">Full-Time</option>
          <option value="part_time">Part-Time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </Select>
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
                    <TableHead>Contract #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                        No contracts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm font-medium">{c.contract_number}</TableCell>
                        <TableCell className="font-medium">{c.employee_name}</TableCell>
                        <TableCell>{c.job_title}</TableCell>
                        <TableCell>{c.department}</TableCell>
                        <TableCell>{typeLabel[c.contract_type]}</TableCell>
                        <TableCell>{formatDate(c.start_date)}</TableCell>
                        <TableCell>{c.end_date ? formatDate(c.end_date) : '—'}</TableCell>
                        <TableCell>
                          {formatCurrency(Number(c.salary))}
                          <span className="text-xs text-muted-foreground ml-1">{c.currency}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[c.status]} className="capitalize">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)}>
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
            <SheetTitle>{editing ? 'Edit Contract' : 'New Contract'}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ct-employee">Employee Name</Label>
              <Input
                id="ct-employee"
                value={form.employee_name}
                onChange={set('employee_name')}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-title">Job Title</Label>
              <Input
                id="ct-title"
                value={form.job_title}
                onChange={set('job_title')}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-dept">Department</Label>
              <Input
                id="ct-dept"
                value={form.department}
                onChange={set('department')}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-type">Contract Type</Label>
              <Select id="ct-type" value={form.contract_type} onChange={set('contract_type')}>
                <option value="full_time">Full-Time</option>
                <option value="part_time">Part-Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ct-start">Start Date</Label>
                <Input
                  id="ct-start"
                  type="date"
                  value={form.start_date}
                  onChange={set('start_date')}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-end">
                  End Date <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="ct-end"
                  type="date"
                  value={form.end_date}
                  onChange={set('end_date')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ct-salary">Salary</Label>
                <Input
                  id="ct-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={set('salary')}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-currency">Currency</Label>
                <Select id="ct-currency" value={form.currency} onChange={set('currency')}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KES">KES</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-status">Status</Label>
              <Select id="ct-status" value={form.status} onChange={set('status')}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-notes">Notes</Label>
              <Textarea
                id="ct-notes"
                value={form.notes}
                onChange={set('notes')}
                placeholder="Additional contract notes…"
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Contract'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
