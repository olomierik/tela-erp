import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Package, AlertTriangle, TrendingDown, Warehouse, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const demoRows = [
  ['SKU-001', 'Raw Steel Sheet', 'Raw Materials', '2,450', '$12.50', '$30,625', <StatusBadge status="In Stock" variant="success" />, null],
  ['SKU-002', 'Copper Wire 2mm', 'Raw Materials', '180', '$8.75', '$1,575', <StatusBadge status="Low Stock" variant="warning" />, null],
];

const fields = [
  { name: 'sku', label: 'SKU', required: true },
  { name: 'name', label: 'Name', required: true },
  { name: 'category', label: 'Category', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
  { name: 'unit_cost', label: 'Unit Cost', type: 'number' as const, required: true },
  { name: 'reorder_level', label: 'Reorder Level', type: 'number' as const, defaultValue: '10' },
  { name: 'warehouse_location', label: 'Warehouse Location' },
];

function getStockStatus(qty: number, reorder: number) {
  if (qty <= reorder * 0.5) return { status: 'Critical', variant: 'destructive' as const };
  if (qty <= reorder) return { status: 'Low Stock', variant: 'warning' as const };
  return { status: 'In Stock', variant: 'success' as const };
}

export default function Inventory() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useTenantQuery('inventory_items');
  const insert = useTenantInsert('inventory_items');
  const remove = useTenantDelete('inventory_items');
  useRealtimeSync('inventory_items');

  const items = data ?? [];
  const rows = isDemo ? demoRows : items.map((i: any) => {
    const s = getStockStatus(i.quantity, i.reorder_level);
    const total = (i.quantity * i.unit_cost).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return [
      i.sku, i.name, i.category, i.quantity.toLocaleString(),
      `$${Number(i.unit_cost).toFixed(2)}`, total,
      <StatusBadge status={s.status} variant={s.variant} />,
      <Button variant="ghost" size="icon" onClick={() => remove.mutate(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>,
    ];
  });

  const totalValue = items.reduce((s: number, i: any) => s + i.quantity * Number(i.unit_cost), 0);
  const lowStock = items.filter((i: any) => i.quantity <= i.reorder_level).length;
  const critical = items.filter((i: any) => i.quantity <= i.reorder_level * 0.5).length;

  // Category breakdown chart
  const categoryMap: Record<string, number> = {};
  items.forEach((i: any) => {
    categoryMap[i.category || 'Uncategorized'] = (categoryMap[i.category || 'Uncategorized'] || 0) + i.quantity * Number(i.unit_cost);
  });
  const categoryChart = Object.entries(categoryMap).map(([name, value]) => ({ name, value: Math.round(value) }));
  const catColors = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(199, 89%, 48%)'];

  return (
    <AppLayout title="Inventory" subtitle="Stock levels, batches & warehouse tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Items" value={isDemo ? '1,247' : String(items.length)} change={3.2} icon={Package} />
        <StatCard title="Low Stock Alerts" value={isDemo ? '8' : String(lowStock)} change={lowStock > 0 ? -20 : 0} icon={AlertTriangle} />
        <StatCard title="Stock Value" value={isDemo ? '$124,500' : `$${totalValue.toLocaleString()}`} change={5.1} icon={TrendingDown} />
        <StatCard title="Critical Items" value={isDemo ? '2' : String(critical)} change={critical > 0 ? -50 : 0} icon={Warehouse} />
      </div>

      {categoryChart.length > 0 && !isDemo && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="font-semibold text-card-foreground mb-4">Stock Value by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis type="number" stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" stroke="hsl(215, 16%, 47%)" width={100} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryChart.map((_, i) => (
                  <Cell key={i} fill={catColors[i % catColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Inventory Items</h3>
        {!isDemo && <CreateDialog title="Add Inventory Item" buttonLabel="+ Add Item" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />}
      </div>
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['SKU', 'Name', 'Category', 'Qty', 'Unit Cost', 'Total', 'Status', ...(isDemo ? [] : [''])]} rows={rows} />
      )}
    </AppLayout>
  );
}
