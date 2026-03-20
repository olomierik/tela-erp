import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Factory, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const prodData = [
  { week: 'W1', planned: 120, actual: 115 },
  { week: 'W2', planned: 135, actual: 128 },
  { week: 'W3', planned: 110, actual: 112 },
  { week: 'W4', planned: 145, actual: 130 },
];

const orders = [
  ['#PRD-401', 'Steel Components A', '500', <StatusBadge status="In Progress" variant="info" />, 'Mar 12', 'Mar 25'],
  ['#PRD-400', 'Aluminum Frame B', '300', <StatusBadge status="Completed" variant="success" />, 'Mar 5', 'Mar 18'],
  ['#PRD-399', 'Circuit Board X', '1,200', <StatusBadge status="Draft" variant="default" />, '—', '—'],
  ['#PRD-398', 'Plastic Housing C', '800', <StatusBadge status="In Progress" variant="info" />, 'Mar 10', 'Mar 30'],
];

export default function Production() {
  return (
    <AppLayout title="Production" subtitle="Manufacturing orders and tracking">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Orders" value="14" change={5} icon={Factory} />
        <StatCard title="In Progress" value="8" change={12} icon={Clock} />
        <StatCard title="Completed (MTD)" value="23" change={8} icon={CheckCircle} />
        <StatCard title="Delayed" value="2" change={-50} icon={AlertTriangle} />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-card-foreground mb-4">Production Output vs Plan</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={prodData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="week" stroke="hsl(215, 16%, 47%)" />
            <YAxis stroke="hsl(215, 16%, 47%)" />
            <Tooltip />
            <Bar dataKey="planned" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Production Orders</h3>
        <Button size="sm">+ New Order</Button>
      </div>
      <DataTable headers={['Order #', 'Product', 'Qty', 'Status', 'Start', 'End']} rows={orders} />
    </AppLayout>
  );
}
