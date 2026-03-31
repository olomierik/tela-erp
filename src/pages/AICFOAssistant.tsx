import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  Brain, RefreshCw, Send, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Lightbulb, DollarSign, Activity, BarChart3, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AICFOAssistant() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: transData } = useTenantQuery('transactions');
  const { data: invoicesData } = useTenantQuery('invoices');
  const { data: salesData } = useTenantQuery('sales_orders');
  const { data: purchaseData } = useTenantQuery('purchase_orders');

  const transactions = transData ?? [];
  const invoices = invoicesData ?? [];
  const sales = salesData ?? [];

  const revenue = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const overdueInvoices = invoices.filter((i: any) => i.status === 'overdue');
  const outstandingAR = overdueInvoices.reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);

  const financialData = {
    totalRevenue: isDemo ? 127400 : revenue,
    totalExpenses: isDemo ? 74200 : expenses,
    netCashFlow: isDemo ? 53200 : (revenue - expenses),
    profitMargin: isDemo ? 41.7 : revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100 * 10) / 10 : 0,
    overdueInvoicesCount: isDemo ? 4 : overdueInvoices.length,
    outstandingAR: isDemo ? 12800 : outstandingAR,
    totalSalesOrders: isDemo ? 142 : sales.length,
    recentExpenseCategories: isDemo
      ? [{ category: 'Salaries', amount: 45000 }, { category: 'Rent', amount: 8500 }, { category: 'Marketing', amount: 6200 }]
      : transactions.filter((t: any) => t.type === 'expense')
          .reduce((acc: any[], t: any) => {
            const e = acc.find(x => x.category === t.category);
            if (e) e.amount += Number(t.amount); else acc.push({ category: t.category, amount: Number(t.amount) });
            return acc;
          }, []).sort((a: any, b: any) => b.amount - a.amount).slice(0, 5),
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    setApiError(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-cfo', {
        body: { financialData, mode: 'insights' },
      });
      if (error || data?.error) {
        setApiError(data?.error ?? 'Failed to load insights');
      } else {
        setInsights(data?.insights ?? null);
      }
    } catch {
      setApiError('Connection error. Check your AI settings.');
    } finally { setInsightsLoading(false); }
  };

  const sendQuestion = async () => {
    if (!input.trim() || chatLoading) return;
    const q = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setChatLoading(true);
    try {
      const { data } = await supabase.functions.invoke('ai-cfo', {
        body: { financialData, question: q, mode: 'question' },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.insights ?? 'Unable to answer.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error.' }]);
    } finally { setChatLoading(false); }
  };

  const kpis = [
    { label: 'Total Revenue', value: formatMoney(financialData.totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total Expenses', value: formatMoney(financialData.totalExpenses), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Net Cash Flow', value: formatMoney(financialData.netCashFlow), icon: Activity, color: financialData.netCashFlow >= 0 ? 'text-indigo-600' : 'text-red-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Profit Margin', value: `${financialData.profitMargin}%`, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Overdue Invoices', value: String(financialData.overdueInvoicesCount), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Outstanding AR', value: formatMoney(financialData.outstandingAR), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  const suggestions = [
    "What's my biggest financial risk right now?",
    "How can I improve cash flow in the next 30 days?",
    "Which expense categories should I cut?",
    "When will I run out of cash at current burn rate?",
  ];

  return (
    <AppLayout title="AI CFO Assistant" subtitle="Powered by Claude AI — Your intelligent financial advisor">
      <div className="max-w-7xl">
        <PageHeader
          title="AI CFO Assistant"
          subtitle="AI-powered financial insights, anomaly detection, and cash flow predictions"
          icon={Brain}
          iconColor="text-violet-600"
          breadcrumb={[{ label: 'AI Intelligence' }, { label: 'CFO Assistant' }]}
          actions={[
            { label: 'Refresh Insights', icon: RefreshCw, onClick: loadInsights, variant: 'outline' },
            { label: 'Run Analysis', icon: Zap, onClick: loadInsights },
          ]}
        />

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border rounded-xl">
                <CardContent className="p-4">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', kpi.bg)}>
                    <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                  </div>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* AI Insights Panel */}
          <div className="xl:col-span-3 space-y-4">
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-500" /> AI Financial Analysis
                  <Badge variant="secondary" className="text-[10px]">Lovable AI</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadInsights} disabled={insightsLoading}>
                  <RefreshCw className={cn('w-3 h-3 mr-1', insightsLoading && 'animate-spin')} />
                  {insightsLoading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : apiError ? (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold text-sm">AI Not Available</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">{apiError}</p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-1">
                      Add your Anthropic API key in Settings → AI Settings to enable AI insights.
                    </p>
                  </div>
                ) : insights ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {insights}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8 text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Run Your First AI Analysis</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                      Click &ldquo;Run Analysis&rdquo; to get AI-powered insights, anomaly detection, and cash flow predictions.
                    </p>
                    <Button onClick={loadInsights} className="gap-1.5">
                      <Zap className="w-4 h-4" /> Run Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {financialData.recentExpenseCategories.slice(0, 5).map((cat: any, i: number) => {
                  const pct = financialData.totalExpenses > 0 ? Math.round((cat.amount / financialData.totalExpenses) * 100) : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{cat.category ?? 'Uncategorized'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{pct}%</span>
                          <span className="font-semibold text-foreground">{formatMoney(cat.amount)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                          className="h-full rounded-full bg-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
                {financialData.recentExpenseCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No expense data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CFO Chat */}
          <div className="xl:col-span-2">
            <Card className="border-border rounded-xl h-full flex flex-col" style={{ minHeight: 520 }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                  Ask Your AI CFO
                </CardTitle>
                <p className="text-xs text-muted-foreground">Ask any financial question in plain English</p>
              </CardHeader>

              {messages.length === 0 && (
                <div className="px-4 grid grid-cols-1 gap-2 shrink-0">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => { setInput(s); }}
                      className="text-left text-xs p-2 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
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
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                          <Brain className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-muted border border-border/50 text-foreground rounded-bl-sm'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2">
                        <Brain className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-muted border border-border/50 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                        <span className="inline-flex gap-1">
                          {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="px-4 pb-4 pt-2 border-t border-border flex gap-2 shrink-0">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendQuestion()}
                  placeholder="Ask a financial question..."
                  className="flex-1 text-sm"
                  disabled={chatLoading}
                />
                <Button size="icon" onClick={sendQuestion} disabled={chatLoading || !input.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
