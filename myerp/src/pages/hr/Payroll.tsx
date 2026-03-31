import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Eye, DollarSign, TrendingDown, Banknote, Users, Loader2 } from 'lucide-react';

type PayrollStatus = 'draft' | 'processed' | 'paid';

interface PayrollRow extends Record<string, unknown> {
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

const statusVariant: Record<PayrollStatus, 'secondary' | 'info' | 'success'> = {
  draft: 'secondary', processed: 'info', paid: 'success',
};

export default function Payroll() {
  const { rows: items, loading } = useTable<PayrollRow>('myerp_payroll_runs');

  const totalGross      = items.reduce((s, r) => s + r.gross, 0);
  const totalDeductions = items.reduce((s, r) => s + r.deductions, 0);
  const netPayroll      = items.reduce((s, r) => s + r.net, 0);
  const employeesPaid   = items.filter(r => r.status === 'paid').length;

  function runPayroll() {
    toast.success(`Payroll run — ${items.length} employees processed`);
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
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
                {items.map(row => (
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
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
