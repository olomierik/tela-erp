import { useState } from 'react';
import { DollarSign, FileText, Wallet, Users, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import KpiCard from '@/components/dashboard/KpiCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import TopCustomers from '@/components/dashboard/TopCustomers';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PendingApprovals from '@/components/dashboard/PendingApprovals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/mock';

// ─── Finance widget data — pulled live from Supabase via the Accounts page. ───
// Dashboard uses static KPI placeholders; real values come from module pages.
const cashBalance = 183000;
const arBalance   = 34200;
const apBalance   = 48200;
const netProfit   = 62800;

// ─── KPI cards (top row) ──────────────────────────────────────────────────────

const KPI_DATA = [
  {
    title: 'Total Revenue',
    value: '$248,500',
    change: 12.4,
    icon: DollarSign,
    subtitle: 'March 2026',
  },
  {
    title: 'Outstanding Invoices',
    value: '$34,200',
    change: -3.1,
    icon: FileText,
    alert: true,
    subtitle: '8 invoices unpaid',
  },
  {
    title: 'Cash Balance',
    value: formatCurrency(cashBalance),
    change: 8.7,
    icon: Wallet,
    subtitle: 'All accounts',
  },
  {
    title: 'Active Employees',
    value: '142',
    change: 2.1,
    icon: Users,
    subtitle: '+3 this month',
  },
];

// ─── Finance widgets ──────────────────────────────────────────────────────────

interface FinanceWidgetProps {
  label: string;
  value: number;
  subtitle: string;
  href: string;
  positive?: boolean;
  highlight?: 'green' | 'red' | 'blue' | 'amber';
}

function FinanceWidget({ label, value, subtitle, href, positive, highlight = 'blue' }: FinanceWidgetProps) {
  const colorMap = {
    green: 'text-success',
    red:   'text-destructive',
    blue:  'text-primary',
    amber: 'text-warning',
  };
  const bgMap = {
    green: 'bg-success/10',
    red:   'bg-destructive/10',
    blue:  'bg-primary/10',
    amber: 'bg-warning/10',
  };

  return (
    <div className="flex items-start justify-between p-4">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-xl font-bold ${colorMap[highlight]}`}>{formatCurrency(Math.abs(value))}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgMap[highlight]}`}>
        {positive === true
          ? <TrendingUp className={`w-4 h-4 ${colorMap[highlight]}`} />
          : positive === false
          ? <TrendingDown className={`w-4 h-4 ${colorMap[highlight]}`} />
          : <DollarSign className={`w-4 h-4 ${colorMap[highlight]}`} />
        }
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-5 max-w-[1400px] mx-auto">

        {/* Row 1 — KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_DATA.map(kpi => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>

        {/* Row 2 — Revenue chart + Top customers */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <TopCustomers />
          </div>
        </div>

        {/* Row 3 — Finance widgets + recent activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Finance Overview card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Finance Overview</CardTitle>
              <Link to="/finance/accounts" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Chart of Accounts <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              <FinanceWidget
                label="Cash & Bank Balance"
                value={cashBalance}
                subtitle="Across all bank accounts"
                href="/finance/accounts"
                highlight="blue"
              />
              <FinanceWidget
                label="Accounts Receivable"
                value={arBalance}
                subtitle="Owed by customers"
                href="/finance/invoices"
                positive={true}
                highlight="green"
              />
              <FinanceWidget
                label="Accounts Payable"
                value={apBalance}
                subtitle="Owed to vendors"
                href="/finance/bills"
                positive={false}
                highlight="amber"
              />
              <FinanceWidget
                label="Net Profit (Month)"
                value={netProfit}
                subtitle={netProfit >= 0 ? 'Profitable this month' : 'Net loss this month'}
                href="/finance/reports"
                positive={netProfit >= 0}
                highlight={netProfit >= 0 ? 'green' : 'red'}
              />
            </CardContent>
          </Card>

          {/* Recent activity + pending approvals */}
          <div className="xl:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <RecentActivity />
            <PendingApprovals />
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
