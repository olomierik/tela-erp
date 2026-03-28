import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import {
  DollarSign, ShoppingCart, Package, TrendingUp, TrendingDown,
  AlertTriangle, Plus, ArrowRight, Activity, Zap, Bot,
  FileText, UserCircle, Briefcase, Send, X, Brain,
  Clock, CheckCircle2, Circle, BarChart3, Users, Receipt,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useRealtimeSyncAll } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useStore } from '@/contexts/StoreContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, change, icon: Icon, alert, loading, subtitle }: {
  title: string; value: string; change?: number; icon: any; alert?: boolean; loading?: boolean; subtitle?: string;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Card className={cn(
        'border-border rounded-xl overflow-hidden relative',
        alert && 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-900/10'
      )}>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  alert ? 'bg-warning/10' : 'bg-primary/10'
                )}>
                  <Icon className={cn('w-4.5 h-4.5', alert ? 'text-warning' : 'text-primary')} style={{ width: 18, height: 18 }} />
                </div>
                {change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5',
                    isPositive
                      ? 'text-success bg-success/10'
                      : 'text-destructive bg-destructive/10'
                  )}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{change}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{title}</p>
              {subtitle && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Tela AI Chat ───────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

function TelaAIChat({ open, onClose, context }: { open: boolean; onClose: () => void; context: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm Tela AI, your business assistant. Ask me about your sales trends, cash flow, inventory, or any operational question." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useState<HTMLDivElement | null>(null);

  const suggestions = [
    "What's my cash flow this month?",
    "Which products are running low?",
    "Who are my top customers?",
    "How can I improve my margins?",
  ];

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('tela-ai', {
        body: { message: msg, context },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply ?? "I couldn't process that request." }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your AI settings.' }]);
    } finally { setLoading(false); }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0" side="right">
        <SheetHeader className="px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
          <SheetTitle className="flex items-center gap-2 text-white text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            Tela AI
          </SheetTitle>
          <p className="text-xs text-indigo-100">Powered by Claude — Your intelligent CFO & operations assistant</p>
        </SheetHeader>

        {messages.length === 1 && (
          <div className="px-4 pt-3 pb-0 grid grid-cols-2 gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-left text-xs p-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-accent text-foreground rounded-bl-sm border border-border/50'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mr-2 shrink-0">
                  <Brain className="w-3 h-3 text-white" />
                </div>
                <div className="bg-accent border border-border/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <span className="inline-flex gap-1 items-center">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t border-border flex gap-2 shrink-0">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your business..."
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            size="icon" disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Demo / Static Data ──────────────────────────────────────────────────────

const salesTrendData = [
  { day: 'Mon', sales: 12400, target: 15000 },
  { day: 'Tue', sales: 18200, target: 15000 },
  { day: 'Wed', sales: 15800, target: 15000 },
  { day: 'Thu', sales: 22100, target: 15000 },
  { day: 'Fri', sales: 28400, target: 15000 },
  { day: 'Sat', sales: 31500, target: 20000 },
  { day: 'Sun', sales: 19800, target: 12000 },
];

const revenueExpenseData = [
  { month: 'Oct', revenue: 84000, expenses: 62000 },
  { month: 'Nov', revenue: 92000, expenses: 58000 },
  { month: 'Dec', revenue: 118000, expenses: 71000 },
  { month: 'Jan', revenue: 88000, expenses: 64000 },
  { month: 'Feb', revenue: 103000, expenses: 69000 },
  { month: 'Mar', revenue: 127000, expenses: 74000 },
];

const quickActions = [
  { label: 'New Invoice', icon: FileText, path: '/invoices', color: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/25' },
  { label: 'New Sale', icon: ShoppingCart, path: '/sales', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/25' },
  { label: 'Add Customer', icon: UserCircle, path: '/crm', color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/25' },
  { label: 'Record Expense', icon: Receipt, path: '/expenses', color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/25' },
  { label: 'New Project', icon: Briefcase, path: '/projects', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/25' },
  { label: 'AI Insights', icon: Brain, path: '/ai-cfo', color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/25' },
];

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { selectedStoreId, selectedStore } = useStore();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  useRealtimeSyncAll();

  const { data: salesData, isLoading: salesLoading } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const { data: transactionData } = useTenantQuery('transactions');
  const { data: invoicesData } = useTenantQuery('invoices');
  const { data: customersData } = useTenantQuery('customers');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const transactions = transactionData ?? [];
  const invoices = invoicesData ?? [];
  const customers = customersData ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const todaySalesVal = isDemo ? 48500 : sales
    .filter((s: any) => s.created_at?.slice(0, 10) === today)
    .reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);

  const monthlyRevenue = isDemo ? 127400 : transactions
    .filter((t: any) => t.type === 'income' && t.date >= thisMonthStart)
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const monthlyExpenses = isDemo ? 74200 : transactions
    .filter((t: any) => t.type === 'expense' && t.date >= thisMonthStart)
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const cashFlow = monthlyRevenue - monthlyExpenses;
  const totalOrders = isDemo ? 142 : sales.length;
  const lowStockItems = isDemo ? 7 : inventory.filter((i: any) => Number(i.quantity ?? 0) <= Number(i.reorder_level ?? 0)).length;
  const overdueInvoices = isDemo ? 4 : invoices.filter((i: any) => i.status === 'overdue').length;
  const pendingOrders = isDemo ? 18 : sales.filter((s: any) => s.status === 'pending' || s.status === 'confirmed').length;

  // Top customers by aggregating sales
  const topCustomers = isDemo
    ? [
        { name: 'Acme Corporation', orders: 24, revenue: 48200 },
        { name: 'TechVision Ltd', orders: 18, revenue: 39600 },
        { name: 'Global Supplies Co', orders: 15, revenue: 31800 },
        { name: 'Sunrise Partners', orders: 12, revenue: 24400 },
        { name: 'Metro Industries', orders: 9, revenue: 18900 },
      ]
    : Object.values(sales.reduce((acc: any, s: any) => {
        const k = s.customer_name;
        if (!k) return acc;
        if (!acc[k]) acc[k] = { name: k, orders: 0, revenue: 0 };
        acc[k].orders++;
        acc[k].revenue += Number(s.total_amount || 0);
        return acc;
      }, {}))
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5) as any[];

  // Recent activity from actual data
  const recentSales = sales.slice(0, 3).map((s: any) => ({
    action: 'New sales order',
    detail: `${s.order_number} — ${s.customer_name}`,
    time: new Date(s.created_at).toLocaleDateString(),
    color: 'bg-blue-500',
  }));

  const context = {
    todaySales: todaySalesVal,
    monthlyRevenue,
    monthlyExpenses,
    cashFlow,
    totalOrders,
    lowStockItems,
    overdueInvoices,
    store: selectedStore?.name ?? 'All Stores',
  };

  const profitMargin = monthlyRevenue > 0 ? Math.round(((monthlyRevenue - monthlyExpenses) / monthlyRevenue) * 100) : 0;

  return (
    <AppLayout
      title={selectedStore ? `Dashboard — ${selectedStore.name}` : 'Dashboard'}
      subtitle={isDemo ? 'Demo Mode — Sample data shown' : `Overview for ${new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}`}
    >
      <div className="space-y-5">

        {/* ── KPI Strip ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard title="Today's Sales" value={formatMoney(todaySalesVal)} change={12} icon={DollarSign} loading={salesLoading} />
          <KpiCard title="Monthly Revenue" value={formatMoney(monthlyRevenue)} change={8} icon={TrendingUp} />
          <KpiCard title="Monthly Expenses" value={formatMoney(monthlyExpenses)} change={-3} icon={TrendingDown} />
          <KpiCard title="Net Cash Flow" value={formatMoney(cashFlow)} change={cashFlow >= 0 ? 15 : -5} icon={Activity}
            subtitle={`${profitMargin}% margin`} />
          <KpiCard title="Active Orders" value={String(pendingOrders)} change={6} icon={ShoppingCart} />
          <KpiCard title="Alerts" value={String(lowStockItems + overdueInvoices)} icon={AlertTriangle}
            alert={(lowStockItems + overdueInvoices) > 0}
            subtitle={`${lowStockItems} stock · ${overdueInvoices} invoices`} />
        </div>

        {/* ── Main content grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Sales Trend */}
          <Card className="xl:col-span-2 rounded-xl border-border">
            <CardHeader className="pb-1 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Sales Trend — This Week</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 gap-1" onClick={() => navigate('/sales')}>
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-3">
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={salesTrendData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === 'sales' ? 'Sales' : 'Target']}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  />
                  <Area type="monotone" dataKey="target" stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 2" fill="none" />
                  <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2.5} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map(action => (
                <motion.button
                  key={action.path}
                  whileHover={{ x: 3 }}
                  onClick={() => navigate(action.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r text-white text-sm font-medium shadow-sm transition-all hover:opacity-95',
                    action.color, action.shadow
                  )}
                >
                  <action.icon className="w-4 h-4 shrink-0" />
                  {action.label}
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                </motion.button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Second row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Revenue vs Expenses */}
          <Card className="xl:col-span-2 rounded-xl border-border">
            <CardHeader className="pb-1 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue vs Expenses — Last 6 Months</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 gap-1" onClick={() => navigate('/reports')}>
                Reports <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueExpenseData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366F1" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F97316" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-end">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-2 rounded-sm bg-indigo-500" /> Revenue</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-2 rounded-sm bg-orange-500" /> Expenses</div>
              </div>
            </CardContent>
          </Card>

          {/* Attention Required */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: 'Overdue Invoices', value: overdueInvoices, max: 20, color: 'bg-red-500',
                  link: '/invoices', urgent: overdueInvoices > 0,
                },
                {
                  label: 'Low Stock Items', value: lowStockItems, max: 20, color: 'bg-amber-500',
                  link: '/inventory', urgent: lowStockItems > 5,
                },
                {
                  label: 'Pending Orders', value: pendingOrders, max: 50, color: 'bg-blue-500',
                  link: '/sales', urgent: false,
                },
                {
                  label: 'Open Deals', value: isDemo ? 23 : 0, max: 50, color: 'bg-indigo-500',
                  link: '/crm', urgent: false,
                },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <button onClick={() => navigate(item.link)} className={cn('font-medium hover:text-primary transition-colors', item.urgent && 'text-red-600 dark:text-red-400')}>
                      {item.label}
                    </button>
                    <span className={cn('font-bold', item.urgent ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                      {item.value}
                    </span>
                  </div>
                  <Progress value={Math.min((item.value / item.max) * 100, 100)} className="h-1.5"
                    style={{ '--tw-progress-bar': item.urgent ? item.color : item.color } as any} />
                </div>
              ))}

              <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => navigate('/ai-cfo')}>
                  <Brain className="w-3.5 h-3.5 text-indigo-500" />
                  AI Business Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Top Customers */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Top Customers
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="text-xs text-primary h-7 gap-1">
                View CRM <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No sales data yet.</div>
              ) : (
                <div className="space-y-2">
                  {topCustomers.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.orders} orders</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">{formatMoney(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Health */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Business Health Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {[
                { label: 'Revenue Growth', score: Math.min(100, Math.round((monthlyRevenue / 10000) * 10)), color: 'bg-indigo-500' },
                { label: 'Profit Margin', score: Math.max(0, Math.min(100, profitMargin + 50)), color: 'bg-emerald-500' },
                { label: 'Inventory Health', score: Math.max(0, 100 - (lowStockItems * 10)), color: 'bg-blue-500' },
                { label: 'Collections', score: Math.max(0, 100 - (overdueInvoices * 15)), color: 'bg-amber-500' },
                { label: 'Order Fulfillment', score: Math.min(100, Math.round(((totalOrders - pendingOrders) / Math.max(1, totalOrders)) * 100)), color: 'bg-purple-500' },
              ].map(item => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.score}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', item.color)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tela AI Floating Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setAiOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/40 flex items-center justify-center"
      >
        <Brain className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
      </motion.button>

      <TelaAIChat open={aiOpen} onClose={() => setAiOpen(false)} context={context} />
    </AppLayout>
  );
}
