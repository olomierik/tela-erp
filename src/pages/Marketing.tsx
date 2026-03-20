import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Megaphone, MousePointerClick, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

const campaigns = [
  ['Spring Launch', <StatusBadge status="Active" variant="success" />, 'Email', '$5,000', '$3,240', '842', '16.8%'],
  ['Product Webinar', <StatusBadge status="Active" variant="success" />, 'Content', '$2,000', '$1,100', '215', '10.8%'],
  ['Social Ads Q1', <StatusBadge status="Paused" variant="warning" />, 'Social', '$8,000', '$6,500', '1,420', '17.8%'],
  ['PPC - Brand Terms', <StatusBadge status="Active" variant="success" />, 'PPC', '$3,500', '$2,800', '620', '17.7%'],
  ['Newsletter Series', <StatusBadge status="Completed" variant="info" />, 'Email', '$1,200', '$1,200', '380', '31.7%'],
];

export default function Marketing() {
  return (
    <AppLayout title="Marketing" subtitle="Campaigns, leads, and analytics">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Campaigns" value="12" change={15} icon={Megaphone} />
        <StatCard title="Leads Generated" value="3,477" change={22} icon={Users} />
        <StatCard title="Conversion Rate" value="4.2%" change={0.8} icon={MousePointerClick} />
        <StatCard title="Budget Spent" value="$14,840" change={-5} icon={DollarSign} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Campaigns</h3>
        <Button size="sm">+ New Campaign</Button>
      </div>
      <DataTable headers={['Name', 'Status', 'Channel', 'Budget', 'Spent', 'Leads', 'ROI']} rows={campaigns} />
    </AppLayout>
  );
}
