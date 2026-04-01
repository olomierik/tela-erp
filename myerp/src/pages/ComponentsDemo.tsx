import { useState } from 'react';
import {
  Users, DollarSign, FileText, TrendingUp, ShoppingCart, Package,
  Building2, Activity,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { DataTable, StatusBadge, type Column } from '@/components/erp/DataTable';
import { Modal, ConfirmModal } from '@/components/erp/Modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/mock';

// ─── Sample data ──────────────────────────────────────────────────────────────

interface Employee extends Record<string, unknown> {
  id: string;
  name: string;
  department: string;
  position: string;
  salary: number;
  status: string;
  hire_date: string;
}

const EMPLOYEES: Employee[] = [
  { id: '1', name: 'Sarah Chen', department: 'Engineering', position: 'Senior Engineer', salary: 95000, status: 'active', hire_date: '2021-03-15' },
  { id: '2', name: 'Marcus Johnson', department: 'Sales', position: 'Sales Manager', salary: 78000, status: 'active', hire_date: '2020-07-01' },
  { id: '3', name: 'Elena Petrova', department: 'HR', position: 'HR Director', salary: 85000, status: 'on_leave', hire_date: '2019-11-20' },
  { id: '4', name: 'David Kim', department: 'Finance', position: 'Financial Analyst', salary: 72000, status: 'active', hire_date: '2022-01-10' },
  { id: '5', name: 'Aisha Mwangi', department: 'Marketing', position: 'Marketing Lead', salary: 68000, status: 'active', hire_date: '2021-09-05' },
  { id: '6', name: 'James Okafor', department: 'Engineering', position: 'DevOps Engineer', salary: 88000, status: 'active', hire_date: '2020-04-18' },
  { id: '7', name: 'Fatima Al-Hassan', department: 'Operations', position: 'Operations Manager', salary: 82000, status: 'terminated', hire_date: '2018-06-30' },
  { id: '8', name: 'Luca Ferrari', department: 'Finance', position: 'CFO', salary: 145000, status: 'active', hire_date: '2017-02-14' },
  { id: '9', name: 'Priya Sharma', department: 'Engineering', position: 'Frontend Dev', salary: 79000, status: 'active', hire_date: '2023-03-01' },
  { id: '10', name: 'Tom Becker', department: 'Sales', position: 'Account Executive', salary: 65000, status: 'active', hire_date: '2022-08-22' },
  { id: '11', name: 'Zara Williams', department: 'HR', position: 'Recruiter', salary: 58000, status: 'active', hire_date: '2023-05-15' },
  { id: '12', name: 'Omar Diallo', department: 'Marketing', position: 'Content Strategist', salary: 61000, status: 'on_leave', hire_date: '2021-12-01' },
];

const COLUMNS: Column<Employee>[] = [
  {
    key: 'name',
    header: 'Employee',
    render: row => (
      <div>
        <p className="font-medium text-foreground">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.position}</p>
      </div>
    ),
  },
  { key: 'department', header: 'Department' },
  {
    key: 'salary',
    header: 'Salary',
    align: 'right',
    render: row => <span className="font-medium">{formatCurrency(row.salary)}</span>,
  },
  {
    key: 'hire_date',
    header: 'Hire Date',
    render: row => formatDate(row.hire_date),
  },
  {
    key: 'status',
    header: 'Status',
    render: row => <StatusBadge status={row.status} />,
  },
];

// ─── Demo page ────────────────────────────────────────────────────────────────

export default function ComponentsDemo() {
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lgModalOpen, setLgModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function deleteRow(row: Employee) {
    setEmployees(prev => prev.filter(e => e.id !== row.id));
  }

  function simulateLoading() {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2500);
  }

  const sparkData1 = [30, 45, 28, 60, 52, 70, 82];
  const sparkData2 = [80, 72, 65, 58, 62, 55, 48];
  const sparkData3 = [40, 42, 38, 45, 50, 48, 53];

  return (
    <AppLayout title="Component Library">
      <div className="max-w-[1400px] mx-auto space-y-10">

        {/* ── Header ── */}
        <div className="border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-foreground">Component Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All reusable ERP components — ready to drop into any module page.
          </p>
        </div>

        {/* ── 1. Stats Cards ── */}
        <section>
          <SectionTitle number="1" title="Stats Cards" />
          <StatsGrid sparkData1={sparkData1} sparkData2={sparkData2} sparkData3={sparkData3} />
        </section>

        <Separator />

        {/* ── 2. Data Table ── */}
        <section>
          <SectionTitle number="2" title="Data Table" description="Sortable, searchable, paginated table with bulk selection, CSV export, and row actions." />
          <div className="flex gap-3 mb-4">
            <Button size="sm" variant="outline" onClick={simulateLoading}>
              Preview loading state
            </Button>
          </div>
          <DataTable<Employee>
            title="Employees"
            columns={COLUMNS}
            data={employees}
            isLoading={isLoading}
            onEdit={row => alert(`Edit: ${row.name}`)}
            onDelete={deleteRow}
            onView={row => alert(`View: ${row.name}`)}
            addButton={{ label: 'Add Employee', onClick: () => alert('Add clicked') }}
            emptyText="No employees found"
            emptySubtext="Add your first employee to get started"
            emptyIcon={Users}
          />
        </section>

        <Separator />

        {/* ── 3. Modals ── */}
        <section>
          <SectionTitle number="3" title="Modals & Dialogs" />
          <div className="flex flex-wrap gap-3">
            <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
              Open Medium Modal
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLgModalOpen(true)}>
              Open Large Modal
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)}>
              Confirm Delete Dialog
            </Button>
          </div>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Edit Employee"
            description="Update employee details below"
            size="md"
            footer={{
              confirmLabel: 'Save Changes',
              onConfirm: () => setModalOpen(false),
              cancelLabel: 'Cancel',
            }}
          >
            <div className="space-y-4">
              <FieldGroup label="Full Name">
                <DemoInput placeholder="Sarah Chen" defaultValue="Sarah Chen" />
              </FieldGroup>
              <FieldGroup label="Department">
                <DemoSelect options={['Engineering', 'Sales', 'HR', 'Finance', 'Marketing']} defaultValue="Engineering" />
              </FieldGroup>
              <FieldGroup label="Salary">
                <DemoInput placeholder="95000" defaultValue="95000" type="number" />
              </FieldGroup>
              <FieldGroup label="Notes">
                <DemoTextarea placeholder="Additional notes..." />
              </FieldGroup>
            </div>
          </Modal>

          <Modal
            open={lgModalOpen}
            onClose={() => setLgModalOpen(false)}
            title="Employee Details"
            size="lg"
            footer={{ confirmLabel: 'Close', onConfirm: () => setLgModalOpen(false) }}
          >
            <div className="grid grid-cols-2 gap-6">
              {['Name', 'Department', 'Position', 'Email', 'Phone', 'Hire Date', 'Salary', 'Status'].map(field => (
                <FieldGroup key={field} label={field}>
                  <DemoInput placeholder={`Enter ${field.toLowerCase()}...`} />
                </FieldGroup>
              ))}
            </div>
          </Modal>

          <ConfirmModal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => { setConfirmOpen(false); }}
            title="Delete Employee"
            message="Are you sure you want to delete Sarah Chen? This action cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
          />
        </section>

        <Separator />

        {/* ── 4. Status Badges ── */}
        <section>
          <SectionTitle number="4" title="Status Badges" description="Color-coded status pills used throughout the application." />
          <div className="flex flex-wrap gap-2">
            {['active', 'inactive', 'pending', 'approved', 'rejected', 'paid', 'overdue', 'draft',
              'completed', 'in_progress', 'on_leave', 'terminated', 'cancelled', 'shipped', 'delivered'].map(s => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <Separator />

        {/* ── 5. Buttons ── */}
        <section>
          <SectionTitle number="5" title="Buttons" />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="lg">Large</Button>
              <Button size="default">Default</Button>
              <Button size="sm">Small</Button>
              <Button size="icon"><Package className="w-4 h-4" /></Button>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── 6. Form fields note ── */}
        <section>
          <SectionTitle number="6" title="Form Fields" description="Import from @/components/erp/FormFields — TextInput, SelectInput, DatePicker, NumberInput, TextArea, FileUpload, Toggle." />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Full Name *">
                  <DemoInput placeholder="Sarah Chen" />
                </FieldGroup>
                <FieldGroup label="Email *">
                  <DemoInput placeholder="sarah@company.com" type="email" />
                </FieldGroup>
                <FieldGroup label="Department">
                  <DemoSelect options={['Engineering', 'Sales', 'HR', 'Finance']} />
                </FieldGroup>
                <FieldGroup label="Salary">
                  <div className="flex">
                    <span className="flex items-center px-2.5 border border-r-0 border-input bg-muted text-muted-foreground text-sm rounded-l-md">$</span>
                    <DemoInput placeholder="95,000" type="number" className="rounded-l-none" />
                  </div>
                </FieldGroup>
                <FieldGroup label="Notes" className="sm:col-span-2">
                  <DemoTextarea placeholder="Additional notes..." />
                </FieldGroup>
              </div>
              <FieldGroup label="Error state example">
                <DemoInput placeholder="Email" className="border-destructive focus-visible:ring-destructive" />
                <p className="text-xs text-destructive mt-1">This field is required</p>
              </FieldGroup>
            </CardContent>
          </Card>
        </section>

      </div>
    </AppLayout>
  );
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function SectionTitle({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {description && <p className="text-xs text-muted-foreground mt-1.5 ml-10">{description}</p>}
    </div>
  );
}

function FieldGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function DemoInput({ placeholder, defaultValue, type = 'text', className = '' }: { placeholder?: string; defaultValue?: string; type?: string; className?: string }) {
  const [val, setVal] = useState(defaultValue ?? '');
  return (
    <input
      type={type}
      value={val}
      onChange={e => setVal(e.target.value)}
      placeholder={placeholder}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    />
  );
}

function DemoSelect({ options, defaultValue }: { options: string[]; defaultValue?: string }) {
  const [val, setVal] = useState(defaultValue ?? '');
  return (
    <select
      value={val}
      onChange={e => setVal(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="">Select…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function DemoTextarea({ placeholder }: { placeholder?: string }) {
  const [val, setVal] = useState('');
  return (
    <textarea
      value={val}
      onChange={e => setVal(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
    />
  );
}

function StatsGrid({ sparkData1, sparkData2, sparkData3 }: { sparkData1: number[]; sparkData2: number[]; sparkData3: number[] }) {
  const stats = [
    { icon: DollarSign, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: 'Total Revenue', value: '$248,500', change: 12.4, sparkline: sparkData1 },
    { icon: Users, iconBg: 'bg-success/10', iconColor: 'text-success', label: 'Active Employees', value: '142', change: 2.1, sparkline: sparkData3 },
    { icon: FileText, iconBg: 'bg-warning/10', iconColor: 'text-warning', label: 'Outstanding Invoices', value: '$34,200', change: -3.1, sparkline: sparkData2 },
    { icon: ShoppingCart, iconBg: 'bg-info/10', iconColor: 'text-info', label: 'New Orders', value: '58', change: 8.7, sparkline: sparkData1 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <Card key={s.label} className="shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <MiniSparkline data={s.sparkline} positive={s.change >= 0} />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mb-2">{s.value}</p>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${s.change >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                <TrendingUp className={`w-3 h-3 ${s.change < 0 ? 'rotate-180' : ''}`} />
                {s.change >= 0 ? '+' : ''}{s.change}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60, h = 32, pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const color = positive ? 'hsl(160 60% 40%)' : 'hsl(4 76% 56%)';
  const fillId = `spark-${positive ? 'pos' : 'neg'}`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${h} ${pts} ${w - pad},${h}`}
        fill={`url(#${fillId})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
