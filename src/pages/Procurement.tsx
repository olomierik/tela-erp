import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Truck, Clock, CheckCircle, FileText, Trash2, Search, Bot } from 'lucide-react';
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
import { onProcurementReceived } from '@/hooks/use-cross-module';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  draft: { label: 'Draft', variant: 'default' },
  submitted: { label: 'Submitted', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  received: { label: 'Received', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const fields = [
  { name: 'po_number', label: 'PO #', required: true },
  { name: 'supplier_name', label: 'Supplier', required: true },
  { name: 'total_amount', label: 'Amount', type: 'number' as const, required: true },
  { name: 'status', label: 'Status', type: 'select' as const, defaultValue: 'draft', options: [
    { label: 'Draft', value: 'draft' }, { label: 'Submitted', value: 'submitted' },
    { label: 'Approved', value: 'approved' }, { label: 'Received', value: 'received' },
  ]},
  { name: 'order_date', label: 'Order Date', type: 'date' as const },
  { name: 'expected_delivery', label: 'Expected Delivery', type: 'date' as const },
];

export default function Procurement() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('purchase_orders');
  const insertBase = useTenantInsert('purchase_orders');
  const remove = useTenantDelete('purchase_orders');
  useRealtimeSync('purchase_orders');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const pos = data ?? [];
  const open = pos.filter((p: any) => !['received', 'cancelled'].includes(p.status)).length;
  const pending = pos.filter((p: any) => ['submitted', 'approved'].includes(p.status)).length;
  const received = pos.filter((p: any) => p.status === 'received').length;
  const totalSpend = pos.reduce((s: number, p: any) => s + Number(p.total_amount), 0);

  const filtered = pos.filter((p: any) => {
    if (search && !p.po_number.toLowerCase().includes(search.toLowerCase()) && !p.supplier_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleCreate = (row: Record<string, any>) => {
    insertBase.mutate(row, {
      onSuccess: (data: any) => {
        if (data.status === 'received' && tenant?.id) {
          onProcurementReceived(tenant.id, { po_number: data.po_number, supplier_name: data.supplier_name, total_amount: Number(data.total_amount) });
        }
      },
    });
  };

  return (
    <AppLayout title="Purchases" subtitle="Purchase orders & suppliers">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Open POs</p><p className="text-lg font-bold text-foreground">{isDemo ? '18' : open}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Pending Delivery</p><p className="text-lg font-bold text-foreground">{isDemo ? '7' : pending}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Received (MTD)</p><p className="text-lg font-bold text-foreground">{isDemo ? '12' : received}</p></div>
        <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Total Spend</p><p className="text-lg font-bold text-foreground">{isDemo ? formatMoney(55650) : formatMoney(totalSpend)}</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search POs or suppliers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {!isDemo && (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Bot className="w-3.5 h-3.5" /> Smart Order</Button>
                  <CreateDialog title="New Purchase Order" buttonLabel="+ New PO" fields={fields} onSubmit={handleCreate} isPending={insertBase.isPending} />
                </>
              )}
            </div>
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
                {['PO #', 'Supplier', 'Amount', 'Status', 'Ordered', 'Expected', ...(!isDemo ? [''] : [])].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((p: any) => {
                  const s = statusMap[p.status] || statusMap.draft;
                  const autoTag = (p.custom_fields as any)?.reason ? ' 🤖' : '';
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">{p.po_number}{autoTag}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.supplier_name}</td>
                      <td className="px-4 py-2.5 font-medium">{formatMoney(Number(p.total_amount))}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={s.label} variant={s.variant} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{p.order_date || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{p.expected_delivery || '—'}</td>
                      {!isDemo && <td className="px-4 py-2.5"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></td>}
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No purchase orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
