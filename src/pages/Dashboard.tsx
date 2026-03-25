import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import {
  DollarSign, ShoppingCart, Package, TrendingUp, TrendingDown,
  AlertTriangle, Plus, ArrowRight, Activity, Zap, Bot,
  FileText, UserCircle, Briefcase, Send, X,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useRealtimeSyncAll } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, change, icon: Icon, alert, loading }: {
  title: string; value: string; change?: number; icon: any; alert?: boolean; loading?: boolean;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)' }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn('border-border rounded-xl overflow-hidden', alert && 'border-amber-400/50')}>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                  alert ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'
                )}>
                  <Icon className={cn('w-5 h-5', alert ? 'text-amber-600' : 'text-indigo-600')} />
                </div>
                {change !== undefined && (
                  <div className={cn('flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5',
                    isPositive ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
                  )}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{change}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{title}</p>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Tela AI Chat ───────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function TelaAIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm Tela AI, your business assistant. Ask me anything about your business data, insights, or how to use TELA-ERP." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tela-ai', {
        body: { message: userMsg, context: { app: 'TELA-ERP' } },
      });
      const reply = data?.reply || "I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to Tela AI. Please check your settings.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0" side="right">
        <SheetHeader className="px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
          <SheetTitle className="flex items-center gap-2 text-white">
            <Bot className="w-5 h-5" />
            Tela AI
          </SheetTitle>
          <p className="text-xs text-indigo-100">Your intelligent business assistant</p>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-accent text-foreground rounded-bl-md'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-accent rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything about your business..."
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button onClick={sendMessage} size="icon" disabled={loading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

const salesTrendData = [
  { day: 'Mon', sales: 12400 },
  { day: 'Tue', sales: 18200 },
  { day: 'Wed', sales: 15800 },
  { day: 'Thu', sales: 22100 },
  { day: 'Fri', sales: 28400 },
  { day: 'Sat', sales: 31500 },
  { day: 'Sun', sales: 19800 },
];

const revenueExpenseData = [
  { month: 'Oct', revenue: 84000, expenses: 62000 },
  { month: 'Nov', revenue: 92000, expenses: 58000 },
  { month: 'Dec', revenue: 118000, expenses: 71000 },
  { month: 'Jan', revenue: 88000, expenses: 64000 },
  { month: 'Feb', revenue: 103000, expenses: 69000 },
  { month: 'Mar', revenue: 127000, expenses: 74000 },
];

const topCustomers = [
  { name: 'Acme Corporation', orders: 24, revenue: 48200 },
  { name: 'TechVision Ltd', orders: 18, revenue: 39600 },
  { name: 'Global Supplies Co', orders: 15, revenue: 31800 },
  { name: 'Sunrise Partners', orders: 12, revenue: 24400 },
  { name: 'Metro Industries', orders: 9, revenue: 18900 },
];

const recentActivity = [
  { action: 'New sales order', detail: 'Order #1042 — Acme Corp', time: '5m ago', color: 'bg-blue-500' },
  { action: 'Invoice paid', detail: 'INV-0038 — $4,200', time: '23m ago', color: 'bg-green-500' },
  { action: 'Low stock alert', detail: 'Office Chair: 2 units left', time: '1h ago', color: 'bg-amber-500' },
  { action: 'New employee added', detail: 'Sarah Chen — Engineering', time: '2h ago', color: 'bg-indigo-500' },
  { action: 'Purchase order sent', detail: 'PO-0091 — TechSuppliers', time: '3h ago', color: 'bg-purple-500' },
];

const quickActions = [
  { label: 'New Invoice', icon: FileText, path: '/invoices', color: 'from-indigo-500 to-indigo-600' },
  { label: 'New Sale', icon: ShoppingCart, path: '/sales', color: 'from-blue-500 to-blue-600' },
  { label: 'Add Customer', icon: UserCircle, path: '/crm', color: 'from-green-500 to-green-600' },
  { label: 'New Project', icon: Briefcase, path: '/projects', color: 'from-purple-500 to-purple-600' },
];

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  useRealtimeSyncAll();

  const { data: salesData, isLoading: salesLoading } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const { data: transactionData } = useTenantQuery('transactions');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const transactions = transactionData ?? [];

  const today = new Date().toISOString().slice(0, 10);

  const todaySalesVal = isDemo ? 48500 : sales
    .filter((s: any) => s.created_at?.slice(0, 10) === today)
    .reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

  const totalRevenue = isDemo ? 127400 : transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  const totalExpenses = isDemo ? 74200 : transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  const cashFlow = totalRevenue - totalExpenses;
  const totalOrders = isDemo ? 142 : sales.length;
  const lowStockItems = isDemo ? 7 : inventory.filter((i: any) => (i.quantity ?? 0) <= (i.reorder_level ?? 0)).length;

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome back${isDemo ? ' (Demo Mode)' : ''}`}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard title="Today's Sales" value={formatMoney(todaySalesVal)} change={12} icon={DollarSign} loading={salesLoading} />
          <KpiCard title="Monthly Revenue" value={formatMoney(totalRevenue)} change={8} icon={TrendingUp} />
          <KpiCard title="Total Expenses" value={formatMoney(totalExpenses)} change={-3} icon={TrendingDown} />
          <KpiCard title="Cash Flow" value={formatMoney(cashFlow)} change={cashFlow >= 0 ? 15 : -5} icon={Activity} />
          <KpiCard title="Total Orders" value={String(totalOrders)} change={6} icon={ShoppingCart} />
          <KpiCard title="Low Stock Items" value={String(lowStockItems)} icon={AlertTriangle} alert={lowStockItems > 0} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Sales Trend Chart */}
          <Card className="xl:col-span-2 rounded-xl border-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Sales Trend — Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Sales']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <motion.button
                  key={action.path}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(action.path)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r text-white text-sm font-medium transition-all',
                    action.color
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue vs Expenses */}
          <Card className="xl:col-span-2 rounded-xl border-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Revenue vs Expenses — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueExpenseData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-2 rounded-sm bg-indigo-500" /> Revenue
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-2 rounded-sm bg-orange-500" /> Expenses
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', item.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Top 5 Customers */}
        <Card className="rounded-xl border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="text-xs text-primary gap-1">
                View CRM <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Customer</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Orders</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-accent/50 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant="secondary" className="text-xs">{c.orders}</Badge>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-foreground">
                        {formatMoney(c.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tela AI Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setAiOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center"
      >
        <Bot className="w-6 h-6" />
      </motion.button>

      <TelaAIChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </AppLayout>
  );
}
