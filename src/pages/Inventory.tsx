import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Package, AlertTriangle, TrendingDown, Warehouse, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
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

  return (
    <AppLayout title="Inventory" subtitle="Stock management and tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Items" value={isDemo ? '1,247' : String(items.length)} change={3.2} icon={Package} />
        <StatCard title="Low Stock Alerts" value={isDemo ? '8' : String(lowStock)} change={-20} icon={AlertTriangle} />
        <StatCard title="Stock Value" value={isDemo ? '$124,500' : `$${totalValue.toLocaleString()}`} change={5.1} icon={TrendingDown} />
        <StatCard title="Warehouses" value="3" change={0} icon={Warehouse} />
      </div>

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
