import { DollarSign, FileText, Wallet, Users } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import KpiCard from '@/components/dashboard/KpiCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import TopCustomers from '@/components/dashboard/TopCustomers';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PendingApprovals from '@/components/dashboard/PendingApprovals';

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
    value: '$182,000',
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

        {/* Row 3 — Recent activity + Pending approvals */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <RecentActivity />
          <PendingApprovals />
        </div>

      </div>
    </AppLayout>
  );
}
