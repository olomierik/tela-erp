import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import {
  DollarSign, ShoppingCart, Package, TrendingUp, TrendingDown,
  AlertTriangle, Bot, Plus, Truck, ArrowRight, Calendar, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useRealtimeSyncAll } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  pending: { label: 'Pending', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'warning' },
  shipped: { label: 'Shipped', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

function KpiCard({ title, value, change, icon: Icon, alert }: {
  title: string; value: string; change?: number; icon: any; alert?: boolean;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn("hover:shadow-md transition-shadow", alert && "border-warning/40")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center",
              alert ? "bg-warning/10" : "bg-primary/10"
            )}>
              <Icon className={cn("w-4 h-4", alert ? "text-warning" : "text-primary")} />
            </div>
            {change !== undefined && (
              <div className={cn("flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
                isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
              )}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{change}%
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-card-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney, displayCurrency } = useCurrency();
  const navigate = useNavigate();
  useRealtimeSyncAll();

  const { data: salesData, isLoading: salesLoading } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const { data: productionData } = useTenantQuery('production_orders');
  const { data: transactionData } = useTenantQuery('transactions');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const transactions = transactionData ?? [];

  const today = new Date().toISOString().slice(0, 10);

  const todaySales = isDemo ? 48500 : sales
    .filter((s: any) => s.created_at?.slice(0, 10) === today)
    .reduce((s: number, o: any) => s + Number(o.total_amount), 0);

  const todayOrders = isDemo ? 34 : sales.filter((s: any) => s.created_at?.slice(0, 10) === today).length;

  const totalRevenue = isDemo ? 358200 : transactions
    .filter((t: any) => t.type === 'income')
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const totalExpenses = isDemo ? 142800 : transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const cashFlow = totalRevenue - totalExpenses;

  const inventoryValue = isDemo ? 124500 : inventory
    .reduce((s: number, i: any) => s + i.quantity * Number(i.unit_cost), 0);

  const lowStockItems = isDemo ? [] : inventory.filter((i: any) => i.quantity <= i.reorder_level);
  const lowStockCount = isDemo ? 3 : lowStockItems.length;

  const overdueInvoices = isDemo ? 5 : sales.filter((s: any) =>
    s.status === 'pending' && new Date(s.created_at) < new Date(Date.now() - 30 * 86400000)
  ).length;

  // Sales trend (last 7 days)
  const salesTrend = isDemo
    ? [
        { day: 'Mon', amount: 6200 }, { day: 'Tue', amount: 7800 },
        { day: 'Wed', amount: 5400 }, { day: 'Thu', amount: 9100 },
        { day: 'Fri', amount: 11200 }, { day: 'Sat', amount: 8600 },
        { day: 'Sun', amount: 4500 },
      ]
    : (() => {
        const days: Record<string, number> = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          days[dayNames[d.getDay()]] = 0;
        }
        sales.forEach((s: any) => {
          const d = new Date(s.created_at);
          const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
          if (diff < 7) {
            const name = dayNames[d.getDay()];
            if (name in days) days[name] += Number(s.total_amount);
          }
        });
        return Object.entries(days).map(([day, amount]) => ({ day, amount }));
      })();

  // Top selling products
  const topProducts = isDemo
    ? [
        { name: 'Premium Widget A', sold: 142, revenue: 28400 },
        { name: 'Steel Components', sold: 98, revenue: 19600 },
        { name: 'Circuit Board Pro', sold: 76, revenue: 15200 },
        { name: 'Packaging Kit', sold: 54, revenue: 5400 },
      ]
    : (() => {
        const map: Record<string, { name: string; sold: number; revenue: number }> = {};
        sales.forEach((s: any) => {
          const key = s.item_id || s.order_number;
          if (!map[key]) map[key] = { name: s.customer_name, sold: 0, revenue: 0 };
          map[key].sold += s.quantity || 1;
          map[key].revenue += Number(s.total_amount);
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      })();

  const recentOrders = (isDemo
    ? [
        { order_number: '#ORD-2847', customer_name: 'Acme Corp', total_amount: 12450, status: 'delivered', created_at: '2026-03-18' },
        { order_number: '#ORD-2846', customer_name: 'TechStart Inc', total_amount: 8200, status: 'shipped', created_at: '2026-03-17' },
        { order_number: '#ORD-2845', customer_name: 'Global Ltd', total_amount: 23100, status: 'confirmed', created_at: '2026-03-16' },
        { order_number: '#ORD-2844', customer_name: 'Safari Goods', total_amount: 4800, status: 'pending', created_at: '2026-03-15' },
      ]
    : sales.slice(0, 5)
  ) as any[];

  const CHART_COLORS = ['hsl(152, 69%, 38%)', 'hsl(152, 69%, 48%)', 'hsl(152, 69%, 58%)', 'hsl(152, 69%, 68%)', 'hsl(199, 89%, 48%)'];
  const isLoading = salesLoading && !isDemo;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <AppLayout title="Dashboard" subtitle={displayCurrency}>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          Welcome back to {tenant?.name || 'TELA-ERP'} 👋
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{dateStr}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KpiCard title="Today's Sales" value={formatMoney(todaySales)} change={12.5} icon={DollarSign} />
        <KpiCard title="Stock Value" value={formatMoney(inventoryValue)} change={-3.1} icon={Package} />
        <KpiCard title="Low Stock Items" value={String(lowStockCount)} icon={AlertTriangle} alert={lowStockCount > 0} />
        <KpiCard title="Overdue Invoices" value={String(overdueInvoices)} icon={DollarSign} alert={overdueInvoices > 0} />
        <KpiCard title="Today's Orders" value={String(todayOrders)} change={8.2} icon={ShoppingCart} />
        <KpiCard title="Cash Flow" value={formatMoney(cashFlow)} change={cashFlow > 0 ? 10 : -5} icon={TrendingUp} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* Sales Trend */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Sales Trend</CardTitle>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <Badge variant="secondary" className="text-xs">{formatMoney(todaySales)} today</Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 69%, 38%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(152, 69%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 16%, 90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" tickFormatter={(v) => formatMoney(v)} />
                  <Tooltip formatter={(v: number) => [formatMoney(v), 'Sales']} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(152, 69%, 38%)" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Selling Products</CardTitle>
            <p className="text-xs text-muted-foreground">By revenue</p>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(160, 10%, 45%)" tickFormatter={(v) => formatMoney(v)} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} stroke="hsl(160, 10%, 45%)" />
                  <Tooltip formatter={(v: number) => [formatMoney(v), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/sales')}>
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o: any, i: number) => {
                    const s = statusMap[o.status] || statusMap.pending;
                    return (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{o.order_number}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{o.customer_name}</td>
                        <td className="px-4 py-2.5 font-medium">{formatMoney(Number(o.total_amount))}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={s.label} variant={s.variant} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Stock Alerts */}
          <Card className={cn(lowStockCount > 0 && "border-warning/30")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("w-4 h-4", lowStockCount > 0 ? "text-warning" : "text-muted-foreground")} />
                <CardTitle className="text-sm font-semibold">Stock Alerts</CardTitle>
                {lowStockCount > 0 && <Badge variant="destructive" className="text-[10px] h-5">{lowStockCount}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {lowStockCount === 0 ? (
                <p className="text-xs text-muted-foreground">All items are above reorder levels ✓</p>
              ) : isDemo ? (
                <ul className="space-y-2">
                  {['Steel Bolts (5 left)', 'Circuit Boards (2 left)', 'Packaging Film (8 left)'].map((item, i) => (
                    <li key={i} className="text-xs flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {lowStockItems.slice(0, 5).map((item: any) => (
                    <li key={item.id} className="text-xs flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                      {item.name} ({item.quantity} left)
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" className="w-full justify-start h-8 text-xs" onClick={() => navigate('/sales')}>
                <Plus className="w-3.5 h-3.5 mr-2" /> New Sale
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start h-8 text-xs" onClick={() => navigate('/procurement')}>
                <Truck className="w-3.5 h-3.5 mr-2" /> New Purchase
              </Button>
              <Button size="sm" variant="secondary" className="w-full justify-start h-8 text-xs">
                <Bot className="w-3.5 h-3.5 mr-2" /> Ask Tela AI
              </Button>
            </CardContent>
          </Card>

          {/* Tela AI Teaser */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Tela AI</p>
                  <p className="text-[10px] text-muted-foreground">Powered by AI</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Chat with Tela for business insights, stock predictions, and automated reports.
              </p>
              <Button size="sm" className="w-full h-7 text-xs">
                <Activity className="w-3 h-3 mr-1" /> Open Chat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
