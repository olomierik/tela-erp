import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { DollarSign, ShoppingCart, Package, Megaphone, TrendingUp, Activity, Factory, AlertTriangle, Sparkles, BarChart3, Percent } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useRealtimeSyncAll } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'];

const statusMap: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  pending: { label: 'Pending', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'warning' },
  shipped: { label: 'Shipped', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

export default function Dashboard() {
  const { isDemo } = useAuth();
  const { formatMoney, displayCurrency } = useCurrency();
  useRealtimeSyncAll();

  const { data: salesData, isLoading: salesLoading } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const { data: productionData } = useTenantQuery('production_orders');
  const { data: campaignData } = useTenantQuery('campaigns');
  const { data: transactionData } = useTenantQuery('transactions');
  const { data: procurementData } = useTenantQuery('purchase_orders');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const production = productionData ?? [];
  const campaigns = campaignData ?? [];
  const transactions = transactionData ?? [];
  const procurement = procurementData ?? [];

  const totalRevenue = isDemo ? 358200 : transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpenses = isDemo ? 0 : transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalCogs = isDemo ? 0 : transactions.filter((t: any) => t.category === 'Cost of Goods Sold').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOrders = isDemo ? 2847 : sales.length;
  const inventoryValue = isDemo ? 124500 : inventory.reduce((s: number, i: any) => s + i.quantity * Number(i.unit_cost), 0);
  const activeCampaigns = isDemo ? 12 : campaigns.filter((c: any) => c.status === 'active').length;
  const lowStockCount = isDemo ? 0 : inventory.filter((i: any) => i.quantity <= i.reorder_level).length;
  const productionDelays = isDemo ? 0 : production.filter((o: any) => o.end_date && new Date(o.end_date) < new Date() && o.status === 'in_progress').length;
  const completedProduction = production.filter((o: any) => o.status === 'completed').length;
  const totalProduction = production.filter((o: any) => o.status !== 'cancelled').length;
  const productionEfficiency = totalProduction > 0 ? Math.round((completedProduction / totalProduction) * 100) : 0;
  const cogsMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalCogs) / totalRevenue) * 100) : 0;

  const demoRevenueData = [
    { month: 'Jan', revenue: 42000 }, { month: 'Feb', revenue: 48000 }, { month: 'Mar', revenue: 55000 },
    { month: 'Apr', revenue: 51000 }, { month: 'May', revenue: 63000 }, { month: 'Jun', revenue: 71000 },
  ];

  const revenueChart = isDemo ? demoRevenueData : (() => {
    const months: Record<string, { revenue: number }> = {};
    transactions.filter((t: any) => t.type === 'income').forEach((t: any) => {
      const m = new Date(t.date).toLocaleDateString('en-US', { month: 'short' });
      if (!months[m]) months[m] = { revenue: 0 };
      months[m].revenue += Number(t.amount);
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  })();

  const moduleData = isDemo
    ? [{ name: 'Sales', value: 35 }, { name: 'Production', value: 25 }, { name: 'Inventory', value: 20 }, { name: 'Procurement', value: 12 }, { name: 'Marketing', value: 8 }]
    : [
        { name: 'Sales', value: sales.length }, { name: 'Production', value: production.length },
        { name: 'Inventory', value: inventory.length }, { name: 'Procurement', value: procurement.length },
        { name: 'Marketing', value: campaigns.length },
      ].filter((m) => m.value > 0);

  const recentOrders = isDemo
    ? [
        ['#ORD-2847', 'Acme Corp', formatMoney(12450), <StatusBadge status="Delivered" variant="success" />, 'Mar 18, 2026'],
        ['#ORD-2846', 'TechStart Inc', formatMoney(8200), <StatusBadge status="Shipped" variant="info" />, 'Mar 17, 2026'],
        ['#ORD-2845', 'Global Ltd', formatMoney(23100), <StatusBadge status="Confirmed" variant="warning" />, 'Mar 16, 2026'],
      ]
    : sales.slice(0, 5).map((o: any) => {
        const s = statusMap[o.status] || statusMap.pending;
        return [
          o.order_number, o.customer_name, formatMoney(Number(o.total_amount)),
          <StatusBadge status={s.label} variant={s.variant} />,
          new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        ];
      });

  const insights = isDemo
    ? [
        'Revenue is up 12.5% month-over-month — driven by 3 large enterprise deals.',
        '8 inventory items are below reorder level. Consider restocking SKU-002 and SKU-007.',
        'Marketing email campaigns show 16.8% ROI — highest performing channel.',
      ]
    : [
        totalRevenue > 0 ? `Total revenue: ${formatMoney(totalRevenue)} with ${cogsMargin}% gross margin.` : 'No revenue yet — create your first sales order.',
        lowStockCount > 0 ? `⚠️ ${lowStockCount} item(s) below reorder level — check Inventory.` : 'All inventory above reorder levels.',
        productionDelays > 0 ? `⚠️ ${productionDelays} production order(s) past due.` : `Production efficiency: ${productionEfficiency}% completion rate.`,
      ];

  const isLoading = salesLoading && !isDemo;

  return (
    <AppLayout title="Dashboard" subtitle={`Live overview · ${displayCurrency}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={formatMoney(totalRevenue)} change={12.5} icon={DollarSign} iconColor="gradient-primary" />
        <StatCard title="Total Orders" value={totalOrders.toLocaleString()} change={8.2} icon={ShoppingCart} />
        <StatCard title="Inventory Value" value={formatMoney(inventoryValue)} change={-3.1} icon={Package} />
        <StatCard title="Active Campaigns" value={String(activeCampaigns)} change={15.0} icon={Megaphone} />
      </div>

      {!isDemo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Net Cash Flow" value={formatMoney(totalRevenue - totalExpenses)} change={totalRevenue > totalExpenses ? 10 : -10} icon={TrendingUp} />
          <StatCard title="Gross Margin" value={`${cogsMargin}%`} change={cogsMargin > 50 ? 5 : -5} icon={Percent} />
          <StatCard title="Low Stock Alerts" value={String(lowStockCount)} change={lowStockCount > 0 ? -25 : 0} icon={AlertTriangle} />
          <StatCard title="Production Efficiency" value={`${productionEfficiency}%`} change={productionEfficiency > 70 ? 8 : -10} icon={Factory} />
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-card-foreground">AI Insights</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Beta</span>
        </div>
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <Activity className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              {insight}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-card-foreground mb-1">Revenue Trend</h3>
          <p className="text-sm text-muted-foreground mb-4">Monthly revenue overview</p>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => formatMoney(v)} />
                <Tooltip formatter={(v: number) => [formatMoney(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-card-foreground mb-1">Module Activity</h3>
          <p className="text-sm text-muted-foreground mb-4">Records by module</p>
          {moduleData.length > 0 ? (
            <>
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
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-card-foreground">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">No data yet</div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-foreground mb-3">Recent Orders</h3>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable headers={['Order', 'Customer', 'Amount', 'Status', 'Date']} rows={recentOrders} />
      )}
    </AppLayout>
  );
}
