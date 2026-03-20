import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Package, AlertTriangle, TrendingDown, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';

const items = [
  ['SKU-001', 'Raw Steel Sheet', 'Raw Materials', '2,450', '$12.50', '$30,625', <StatusBadge status="In Stock" variant="success" />],
  ['SKU-002', 'Copper Wire 2mm', 'Raw Materials', '180', '$8.75', '$1,575', <StatusBadge status="Low Stock" variant="warning" />],
  ['SKU-003', 'PCB Board v3', 'Components', '3,200', '$4.20', '$13,440', <StatusBadge status="In Stock" variant="success" />],
  ['SKU-004', 'LED Display 5"', 'Components', '45', '$22.00', '$990', <StatusBadge status="Critical" variant="destructive" />],
  ['SKU-005', 'Finished Unit A', 'Finished Goods', '890', '$85.00', '$75,650', <StatusBadge status="In Stock" variant="success" />],
];

export default function Inventory() {
  return (
    <AppLayout title="Inventory" subtitle="Stock management and tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Items" value="1,247" change={3.2} icon={Package} />
        <StatCard title="Low Stock Alerts" value="8" change={-20} icon={AlertTriangle} />
        <StatCard title="Stock Value" value="$124,500" change={5.1} icon={TrendingDown} />
        <StatCard title="Warehouses" value="3" change={0} icon={Warehouse} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Inventory Items</h3>
        <Button size="sm">+ Add Item</Button>
      </div>
      <DataTable headers={['SKU', 'Name', 'Category', 'Qty', 'Unit Cost', 'Total', 'Status']} rows={items} />
    </AppLayout>
  );
}
