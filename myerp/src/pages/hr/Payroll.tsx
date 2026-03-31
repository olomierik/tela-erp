import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock';
import { toast } from 'sonner';
import { Eye, DollarSign, TrendingDown, Banknote, Users } from 'lucide-react';

type PayrollStatus = 'draft' | 'processed' | 'paid';

interface PayrollRow {
  id: string;
  employee: string;
  period: string;
  basic: number;
  allowances: number;
  gross: number;
  deductions: number;
  net: number;
  status: PayrollStatus;
}

function makeRow(id: string, employee: string, annual: number, allowances: number, deductions: number, status: PayrollStatus): PayrollRow {
  const basic = annual / 12;
  const gross = basic + allowances;
  const net = gross - deductions;
  return { id, employee, period: 'March 2026', basic, allowances, gross, deductions, net, status };
}

const INITIAL_PAYROLL: PayrollRow[] = [
  makeRow('1',  'Alice Johnson',  95000, 500, 1200, 'paid'),
  makeRow('2',  'Bob Martinez',   78000, 400, 980,  'paid'),
  makeRow('3',  'Carol Smith',    62000, 300, 780,  'processed'),
  makeRow('4',  'David Lee',      72000, 350, 900,  'processed'),
  makeRow('5',  'Eva Chen',       85000, 450, 1060, 'paid'),
  makeRow('6',  'Frank Wilson',   68000, 320, 850,  'paid'),
  makeRow('7',  'Grace Turner',   74000, 380, 930,  'processed'),
  makeRow('8',  'Henry Park',     88000, 460, 1100, 'paid'),
  makeRow('9',  'Isabella Davis', 58000, 280, 720,  'draft'),
  makeRow('10', 'James Brown',    80000, 420, 1000, 'paid'),
  makeRow('11', 'Karen White',    55000, 250, 690,  'draft'),
  makeRow('12', 'Leo Garcia',     52000, 200, 650,  'draft'),
];

const statusVariant: Record<PayrollStatus, 'secondary' | 'info' | 'success'> = {
  draft: 'secondary', processed: 'info', paid: 'success',
};

export default function Payroll() {
  const [payroll] = useState<PayrollRow[]>(INITIAL_PAYROLL);

  const totalGross      = payroll.reduce((s, r) => s + r.gross, 0);
  const totalDeductions = payroll.reduce((s, r) => s + r.deductions, 0);
  const netPayroll      = payroll.reduce((s, r) => s + r.net, 0);
  const employeesPaid   = payroll.filter(r => r.status === 'paid').length;

  function runPayroll() {
    toast.success('Payroll run for March 2026 — 12 employees processed');
  }

  return (
    <AppLayout title="Payroll">
      <PageHeader
        title="Payroll"
        subtitle="Manage and process employee payroll"
        action={{ label: 'Run Payroll', onClick: runPayroll, icon: Banknote }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Gross',      value: formatCurrency(totalGross),      icon: DollarSign,   color: 'text-primary'     },
          { label: 'Total Deductions', value: formatCurrency(totalDeductions),  icon: TrendingDown, color: 'text-destructive' },
          { label: 'Net Payroll',      value: formatCurrency(netPayroll),       icon: Banknote,     color: 'text-success'     },
          { label: 'Employees Paid',   value: employeesPaid,                    icon: Users,        color: 'text-info'        },
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
                <TableHead>Period</TableHead>
                <TableHead>Basic</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payroll.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.employee}</TableCell>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{formatCurrency(row.basic)}</TableCell>
                  <TableCell>{formatCurrency(row.allowances)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(row.gross)}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(row.deductions)}</TableCell>
                  <TableCell className="font-semibold text-success">{formatCurrency(row.net)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status]} className="capitalize">{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => toast.info(`Viewing payslip for ${row.employee}`)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
