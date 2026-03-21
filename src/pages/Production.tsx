import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Factory, Clock, CheckCircle, AlertTriangle, Trash2, FileDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantQuery, useTenantInsert, useTenantDelete, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePDFReport } from '@/lib/pdf-reports';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'default' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'warning' },
};

const fields = [
  { name: 'order_number', label: 'Order #', required: true },
  { name: 'product_name', label: 'Product Name', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'draft', options: [
    { label: 'Draft', value: 'draft' }, { label: 'In Progress', value: 'in_progress' },
  ]},
  { name: 'start_date', label: 'Start Date', type: 'date' as const },
  { name: 'end_date', label: 'End Date', type: 'date' as const },
];

export default function Production() {
  const { isDemo, tenant } = useAuth();
  const { data, isLoading } = useTenantQuery('production_orders');
  const insertBase = useTenantInsert('production_orders');
  const updateMutation = useTenantUpdate('production_orders');
  const remove = useTenantDelete('production_orders');
  useRealtimeSync('production_orders');
  useRealtimeSync('inventory_items');

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const orders = data ?? [];
  const stats = isDemo
    ? { active: 14, inProgress: 8, completed: 23, delayed: 2 }
    : {
        active: orders.filter((o: any) => o.status !== 'cancelled').length,
        inProgress: orders.filter((o: any) => o.status === 'in_progress').length,
        completed: orders.filter((o: any) => o.status === 'completed').length,
        delayed: orders.filter((o: any) => o.end_date && new Date(o.end_date) < new Date() && o.status === 'in_progress').length,
      };

  const filtered = orders.filter((o: any) => {
    if (search && !o.order_number.toLowerCase().includes(search.toLowerCase()) && !o.product_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'in_progress') return o.status === 'in_progress';
    if (tab === 'completed') return o.status === 'completed';
    if (tab === 'delayed') return o.end_date && new Date(o.end_date) < new Date() && o.status === 'in_progress';
    return true;
  });

  return (
    <AppLayout title="Production" subtitle="Manufacturing orders & schedules">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Active Orders</p><p className="text-lg font-bold text-foreground">{stats.active}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-lg font-bold text-foreground">{stats.inProgress}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Completed</p><p className="text-lg font-bold text-foreground">{stats.completed}</p></div>
        <div className={cn("rounded-lg border bg-card px-4 py-3", stats.delayed > 0 ? "border-warning/40" : "border-border")}><p className="text-xs text-muted-foreground">Delayed</p><p className={cn("text-lg font-bold", stats.delayed > 0 ? "text-warning" : "text-foreground")}>{stats.delayed}</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search orders..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isDemo && (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => generatePDFReport({
                    title: 'Production Report', subtitle: `Generated for ${tenant?.name || 'TELA-ERP'}`, tenantName: tenant?.name,
                    headers: ['Order #', 'Product', 'Qty', 'Status', 'Start', 'End'],
                    rows: orders.map((o: any) => [o.order_number, o.product_name, o.quantity, o.status, o.start_date || '—', o.end_date || '—']),
                    stats: [{ label: 'Active', value: String(stats.active) }, { label: 'Completed', value: String(stats.completed) }],
                  })} disabled={orders.length === 0}><FileDown className="w-3.5 h-3.5" /> PDF</Button>
                  <CreateDialog title="New Production Order" buttonLabel="+ New Order" fields={fields} onSubmit={insertBase.mutate} isPending={insertBase.isPending} />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-7">All <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{orders.length}</Badge></TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs h-7">In Progress <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{stats.inProgress}</Badge></TabsTrigger>
          <TabsTrigger value="completed" className="text-xs h-7">Completed <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{stats.completed}</Badge></TabsTrigger>
          <TabsTrigger value="delayed" className="text-xs h-7">Delayed <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{stats.delayed}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {['Order #', 'Product', 'Qty', 'Status', 'Start', 'End', ...(!isDemo ? ['Actions'] : [])].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((o: any) => {
                  const s = statusMap[o.status] || statusMap.draft;
                  const canUpdate = o.status !== 'completed' && o.status !== 'cancelled';
                  return (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">{o.order_number}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.product_name}</td>
                      <td className="px-4 py-2.5 font-medium">{o.quantity.toLocaleString()}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={s.label} variant={s.variant} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{o.start_date || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{o.end_date || '—'}</td>
                      {!isDemo && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {canUpdate && (
                              <Select onValueChange={(v) => updateMutation.mutate({ id: o.id, status: v })}>
                                <SelectTrigger className="h-7 w-28 text-[11px]"><SelectValue placeholder="Action" /></SelectTrigger>
                                <SelectContent>
                                  {o.status === 'draft' && <SelectItem value="in_progress">Start</SelectItem>}
                                  <SelectItem value="completed">Complete ✓</SelectItem>
                                  <SelectItem value="cancelled">Cancel</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(o.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No production orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
