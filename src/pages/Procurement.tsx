import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Truck, Clock, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const purchaseOrders = [
  ['#PO-501', 'SteelMax Inc', '$24,500', <StatusBadge status="Received" variant="success" />, 'Mar 10', 'Mar 18'],
  ['#PO-500', 'ElectroParts Co', '$8,900', <StatusBadge status="Approved" variant="info" />, 'Mar 8', 'Mar 22'],
  ['#PO-499', 'PlastiForm Ltd', '$12,300', <StatusBadge status="Submitted" variant="warning" />, '—', 'Mar 28'],
  ['#PO-498', 'ChemSupply AG', '$3,200', <StatusBadge status="Draft" variant="default" />, '—', '—'],
  ['#PO-497', 'LogiPack Inc', '$6,750', <StatusBadge status="Received" variant="success" />, 'Mar 2', 'Mar 12'],
];

export default function Procurement() {
  return (
    <AppLayout title="Procurement" subtitle="Purchase orders and supplier management">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Open POs" value="18" change={10} icon={FileText} />
        <StatCard title="Pending Delivery" value="7" change={-15} icon={Clock} />
        <StatCard title="Received (MTD)" value="12" change={20} icon={CheckCircle} />
        <StatCard title="Total Spend (MTD)" value="$55,650" change={5} icon={Truck} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Purchase Orders</h3>
        <Button size="sm">+ New PO</Button>
      </div>
      <DataTable headers={['PO #', 'Supplier', 'Amount', 'Status', 'Ordered', 'Expected']} rows={purchaseOrders} />
    </AppLayout>
  );
}
