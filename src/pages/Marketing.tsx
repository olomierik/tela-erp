import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Megaphone, MousePointerClick, Users, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  draft: { label: 'Draft', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completed: { label: 'Completed', variant: 'info' },
};

const demoRows = [
  ['Spring Launch', <StatusBadge status="Active" variant="success" />, 'Email', '$5,000', '$3,240', '842', '16.8%', null],
  ['Product Webinar', <StatusBadge status="Active" variant="success" />, 'Content', '$2,000', '$1,100', '215', '10.8%', null],
];

const fields = [
  { name: 'name', label: 'Campaign Name', required: true },
  { name: 'channel', label: 'Channel', type: 'select' as const, defaultValue: 'email', options: [
    { label: 'Email', value: 'email' }, { label: 'Social', value: 'social' },
    { label: 'PPC', value: 'ppc' }, { label: 'Content', value: 'content' },
  ]},
  { name: 'budget', label: 'Budget', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'draft', options: [
    { label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
  ]},
];

export default function Marketing() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useTenantQuery('campaigns');
  const insert = useTenantInsert('campaigns');
  const remove = useTenantDelete('campaigns');

  const campaigns = data ?? [];
  const active = campaigns.filter((c: any) => c.status === 'active').length;
  const totalLeads = campaigns.reduce((s: number, c: any) => s + c.leads_generated, 0);
  const totalSpent = campaigns.reduce((s: number, c: any) => s + Number(c.spent), 0);

  const rows = isDemo ? demoRows : campaigns.map((c: any) => {
    const s = statusMap[c.status] || statusMap.draft;
    const roi = Number(c.budget) > 0 ? ((Number(c.spent) / Number(c.budget)) * 100).toFixed(1) + '%' : '0%';
    return [
      c.name, <StatusBadge status={s.label} variant={s.variant} />,
      c.channel.charAt(0).toUpperCase() + c.channel.slice(1),
      `$${Number(c.budget).toLocaleString()}`, `$${Number(c.spent).toLocaleString()}`,
      c.leads_generated.toLocaleString(), roi,
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  return (
    <AppLayout title="Marketing" subtitle="Campaigns, leads, and analytics">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Campaigns" value={isDemo ? '12' : String(active)} change={15} icon={Megaphone} />
        <StatCard title="Leads Generated" value={isDemo ? '3,477' : totalLeads.toLocaleString()} change={22} icon={Users} />
        <StatCard title="Conversion Rate" value="4.2%" change={0.8} icon={MousePointerClick} />
        <StatCard title="Budget Spent" value={isDemo ? '$14,840' : `$${totalSpent.toLocaleString()}`} change={-5} icon={DollarSign} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Campaigns</h3>
        {!isDemo && <CreateDialog title="New Campaign" buttonLabel="+ New Campaign" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['Name', 'Status', 'Channel', 'Budget', 'Spent', 'Leads', 'ROI', ...(isDemo ? [] : [''])]} rows={rows} />
      )}
    </AppLayout>
  );
}
