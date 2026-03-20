import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { DollarSign, ShoppingCart, Package, Megaphone, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 42000, orders: 320 },
  { month: 'Feb', revenue: 48000, orders: 380 },
  { month: 'Mar', revenue: 55000, orders: 410 },
  { month: 'Apr', revenue: 51000, orders: 390 },
  { month: 'May', revenue: 63000, orders: 470 },
  { month: 'Jun', revenue: 71000, orders: 520 },
  { month: 'Jul', revenue: 68000, orders: 490 },
];

const moduleData = [
  { name: 'Sales', value: 35 },
  { name: 'Production', value: 25 },
  { name: 'Inventory', value: 20 },
  { name: 'Procurement', value: 12 },
  { name: 'Marketing', value: 8 },
];

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'];

const recentOrders = [
  ['#ORD-2847', 'Acme Corp', '$12,450', <StatusBadge status="Delivered" variant="success" />, 'Mar 18, 2026'],
  ['#ORD-2846', 'TechStart Inc', '$8,200', <StatusBadge status="Shipped" variant="info" />, 'Mar 17, 2026'],
  ['#ORD-2845', 'Global Ltd', '$23,100', <StatusBadge status="Confirmed" variant="warning" />, 'Mar 16, 2026'],
  ['#ORD-2844', 'BuildRight Co', '$5,780', <StatusBadge status="Pending" variant="default" />, 'Mar 15, 2026'],
  ['#ORD-2843', 'CloudNine SaaS', '$15,900', <StatusBadge status="Delivered" variant="success" />, 'Mar 14, 2026'],
];

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard" subtitle="Overview of your business performance">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value="$358,200" change={12.5} icon={DollarSign} iconColor="gradient-primary" />
        <StatCard title="Total Orders" value="2,847" change={8.2} icon={ShoppingCart} />
        <StatCard title="Inventory Value" value="$124,500" change={-3.1} icon={Package} />
        <StatCard title="Active Campaigns" value="12" change={15.0} icon={Megaphone} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-card-foreground">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue overview</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-success font-medium">
              <TrendingUp className="w-4 h-4" /> +12.5%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-card-foreground mb-1">Module Activity</h3>
          <p className="text-sm text-muted-foreground mb-4">Distribution by module</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={moduleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {moduleData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {moduleData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-card-foreground">{item.name}</span>
                </div>
                <span className="text-muted-foreground font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-2">
        <h3 className="font-semibold text-foreground mb-3">Recent Orders</h3>
      </div>
      <DataTable
        headers={['Order', 'Customer', 'Amount', 'Status', 'Date']}
        rows={recentOrders}
      />
    </AppLayout>
  );
}
