import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { ShoppingCart, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const salesData = [
  { day: 'Mon', sales: 8200 }, { day: 'Tue', sales: 12400 }, { day: 'Wed', sales: 9800 },
  { day: 'Thu', sales: 15600 }, { day: 'Fri', sales: 11200 }, { day: 'Sat', sales: 7800 }, { day: 'Sun', sales: 4500 },
];

const orders = [
  ['#SO-2847', 'Acme Corp', 'john@acme.com', '$12,450', <StatusBadge status="Delivered" variant="success" />, 'Mar 18'],
  ['#SO-2846', 'TechStart Inc', 'buy@techstart.io', '$8,200', <StatusBadge status="Shipped" variant="info" />, 'Mar 17'],
  ['#SO-2845', 'Global Ltd', 'orders@global.com', '$23,100', <StatusBadge status="Confirmed" variant="warning" />, 'Mar 16'],
  ['#SO-2844', 'BuildRight Co', 'procurement@br.co', '$5,780', <StatusBadge status="Pending" variant="default" />, 'Mar 15'],
];

export default function Sales() {
  return (
    <AppLayout title="Sales" subtitle="Orders, customers, and revenue">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (MTD)" value="$89,400" change={12.5} icon={DollarSign} />
        <StatCard title="Orders" value="142" change={8.2} icon={ShoppingCart} />
        <StatCard title="Customers" value="89" change={15} icon={Users} />
        <StatCard title="Avg Order" value="$630" change={4.1} icon={TrendingUp} />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-card-foreground mb-4">Weekly Sales</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={salesData}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="day" stroke="hsl(215, 16%, 47%)" />
            <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Sales']} />
            <Area type="monotone" dataKey="sales" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#salesGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Sales Orders</h3>
        <Button size="sm">+ New Order</Button>
      </div>
      <DataTable headers={['Order #', 'Customer', 'Email', 'Amount', 'Status', 'Date']} rows={orders} />
    </AppLayout>
  );
}
