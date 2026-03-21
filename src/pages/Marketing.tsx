import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Megaphone, MousePointerClick, Users, DollarSign, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  draft: { label: 'Draft', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completed: { label: 'Completed', variant: 'info' },
};

const fields = [
  { name: 'name', label: 'Campaign Name', required: true },
  { name: 'channel', label: 'Channel', type: 'select' as const, defaultValue: 'email', options: [
    { label: 'Email', value: 'email' }, { label: 'Social', value: 'social' },
    { label: 'PPC', value: 'ppc' }, { label: 'Content', value: 'content' },
  ]},
  { name: 'budget', label: 'Budget', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'draft', options: [
    { label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' }, { label: 'Paused', value: 'paused' },
  ]},
];

export default function Marketing() {
  const { isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('campaigns');
  const insert = useTenantInsert('campaigns');
  const remove = useTenantDelete('campaigns');
  useRealtimeSync('campaigns');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const campaigns = data ?? [];
  const active = campaigns.filter((c: any) => c.status === 'active').length;
  const totalLeads = campaigns.reduce((s: number, c: any) => s + c.leads_generated, 0);
  const totalSpent = campaigns.reduce((s: number, c: any) => s + Number(c.spent), 0);

  const filtered = campaigns.filter((c: any) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <AppLayout title="Marketing" subtitle="Campaigns, leads & analytics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Active Campaigns</p><p className="text-lg font-bold text-foreground">{isDemo ? '12' : active}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Leads Generated</p><p className="text-lg font-bold text-foreground">{isDemo ? '3,477' : totalLeads.toLocaleString()}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Conversion Rate</p><p className="text-lg font-bold text-foreground">4.2%</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Budget Spent</p><p className="text-lg font-bold text-foreground">{isDemo ? formatMoney(14840) : formatMoney(totalSpent)}</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search campaigns..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isDemo && <CreateDialog title="New Campaign" buttonLabel="+ New Campaign" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
          </div>
        </CardContent>
      </Card>

      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {['Name', 'Status', 'Channel', 'Budget', 'Spent', 'Leads', 'ROI', ...(!isDemo ? [''] : [])].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((c: any) => {
                  const s = statusMap[c.status] || statusMap.draft;
                  const roi = Number(c.budget) > 0 ? ((Number(c.spent) / Number(c.budget)) * 100).toFixed(1) + '%' : '0%';
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={s.label} variant={s.variant} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize">{c.channel}</td>
                      <td className="px-4 py-2.5">{formatMoney(Number(c.budget))}</td>
                      <td className="px-4 py-2.5">{formatMoney(Number(c.spent))}</td>
                      <td className="px-4 py-2.5">{c.leads_generated.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{roi}</td>
                      {!isDemo && <td className="px-4 py-2.5"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></td>}
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No campaigns found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
