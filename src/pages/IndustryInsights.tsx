import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useModules, INDUSTRY_PRESETS, MODULE_LABELS, type ModuleKey } from '@/contexts/ModulesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  TrendingUp, TrendingDown, Target, BarChart3, AlertTriangle,
  CheckCircle2, Info, ArrowRight, Lightbulb, Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Industry-specific KPI definitions
const INDUSTRY_KPIS: Record<string, Array<{
  label: string;
  description: string;
  target: string;
  module: ModuleKey;
  icon: typeof TrendingUp;
  color: string;
}>> = {
  retail: [
    { label: 'Gross Margin', description: 'Revenue minus COGS / Revenue', target: '> 40%', module: 'sales', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Inventory Turnover', description: 'How fast stock moves', target: '> 6x / year', module: 'inventory', icon: BarChart3, color: 'text-blue-500' },
    { label: 'Average Order Value', description: 'Revenue per transaction', target: 'Track trend', module: 'sales', icon: Target, color: 'text-purple-500' },
    { label: 'Stock-Out Rate', description: 'Items out of stock / total SKUs', target: '< 2%', module: 'inventory', icon: AlertTriangle, color: 'text-amber-500' },
  ],
  manufacturing: [
    { label: 'OEE (Equipment Effectiveness)', description: 'Availability × Performance × Quality', target: '> 85%', module: 'maintenance', icon: BarChart3, color: 'text-blue-500' },
    { label: 'Production Yield', description: 'Good units / total started', target: '> 95%', module: 'production', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Raw Material Waste', description: 'Scrap as % of materials used', target: '< 5%', module: 'inventory', icon: TrendingDown, color: 'text-red-500' },
    { label: 'On-Time Delivery', description: 'Orders delivered on schedule', target: '> 95%', module: 'production', icon: CheckCircle2, color: 'text-green-500' },
  ],
  services: [
    { label: 'Billable Utilization', description: 'Billable hours / total hours', target: '> 75%', module: 'projects', icon: Target, color: 'text-purple-500' },
    { label: 'Project Margin', description: 'Revenue minus project costs', target: '> 30%', module: 'projects', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Client Retention Rate', description: 'Returning clients per period', target: '> 80%', module: 'crm', icon: Star, color: 'text-amber-500' },
    { label: 'Revenue per Employee', description: 'Total revenue / headcount', target: 'Track trend', module: 'hr', icon: BarChart3, color: 'text-blue-500' },
  ],
  hospitality: [
    { label: 'Food Cost %', description: 'Food cost / food revenue', target: '25–35%', module: 'inventory', icon: BarChart3, color: 'text-blue-500' },
    { label: 'Average Transaction Value', description: 'POS revenue per order', target: 'Track trend', module: 'pos', icon: Target, color: 'text-purple-500' },
    { label: 'Labour Cost %', description: 'Payroll / total revenue', target: '< 35%', module: 'hr', icon: TrendingDown, color: 'text-amber-500' },
    { label: 'Waste Percentage', description: 'Food waste / purchases', target: '< 8%', module: 'inventory', icon: AlertTriangle, color: 'text-red-500' },
  ],
  logistics: [
    { label: 'Fleet Utilization', description: 'Active vehicles / total fleet', target: '> 80%', module: 'fleet', icon: BarChart3, color: 'text-blue-500' },
    { label: 'Cost per Km', description: 'Total fleet cost / km driven', target: 'Minimize', module: 'fleet', icon: TrendingDown, color: 'text-emerald-500' },
    { label: 'On-Time Delivery Rate', description: 'On-time deliveries / total', target: '> 95%', module: 'inventory', icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Vehicle Downtime', description: 'Maintenance hours / available hours', target: '< 5%', module: 'maintenance', icon: AlertTriangle, color: 'text-amber-500' },
  ],
  technology: [
    { label: 'Monthly Recurring Revenue', description: 'Predictable monthly revenue', target: 'Grow 10%+/mo', module: 'subscriptions', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Churn Rate', description: 'Subscribers lost per month', target: '< 2%/mo', module: 'subscriptions', icon: TrendingDown, color: 'text-red-500' },
    { label: 'Project Delivery Rate', description: 'On-time project delivery', target: '> 90%', module: 'projects', icon: CheckCircle2, color: 'text-blue-500' },
    { label: 'Revenue per Employee', description: 'ARR / total headcount', target: '>$150k', module: 'hr', icon: Target, color: 'text-purple-500' },
  ],
  construction: [
    { label: 'Project Gross Margin', description: 'Project revenue minus direct costs', target: '> 20%', module: 'projects', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Equipment Utilization', description: 'Active equipment hours / available', target: '> 75%', module: 'assets', icon: BarChart3, color: 'text-blue-500' },
    { label: 'Cost Overrun Rate', description: 'Projects over budget / total', target: '< 10%', module: 'projects', icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Safety Incidents', description: 'Incidents per 100 workers', target: 'Target: 0', module: 'hr', icon: CheckCircle2, color: 'text-red-500' },
  ],
  ecommerce: [
    { label: 'Return Rate', description: 'Returned orders / total orders', target: '< 5%', module: 'sales', icon: TrendingDown, color: 'text-amber-500' },
    { label: 'Cart Abandonment Rate', description: 'Abandoned carts / initiated', target: '< 70%', module: 'marketing', icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Customer LTV', description: 'Average revenue per customer lifetime', target: '> 3x CAC', module: 'crm', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Subscription MRR', description: 'Monthly recurring revenue', target: 'Grow 10%+/mo', module: 'subscriptions', icon: Target, color: 'text-purple-500' },
  ],
  general: [
    { label: 'Revenue Growth', description: 'Month over month revenue growth', target: '> 5%/mo', module: 'sales', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Gross Margin', description: 'Revenue minus COGS / Revenue', target: '> 40%', module: 'accounting', icon: Target, color: 'text-blue-500' },
    { label: 'Operating Expenses', description: 'OpEx as % of revenue', target: '< 60%', module: 'expenses', icon: BarChart3, color: 'text-purple-500' },
    { label: 'Cash Runway', description: 'Months of cash remaining at burn rate', target: '> 6 months', module: 'accounting', icon: AlertTriangle, color: 'text-amber-500' },
  ],
};

// Industry-specific action recommendations
const INDUSTRY_ACTIONS: Record<string, Array<{ title: string; description: string; path: string; module: ModuleKey }>> = {
  retail: [
    { title: 'Run a Stock Count', description: 'Reconcile physical stock with system records', path: '/inventory', module: 'inventory' },
    { title: 'Create a POS Session', description: 'Open the register and start selling', path: '/pos', module: 'pos' },
    { title: 'Launch Promotion Campaign', description: 'Drive traffic with a marketing campaign', path: '/marketing', module: 'marketing' },
  ],
  manufacturing: [
    { title: 'Schedule Production Run', description: 'Create a new production order', path: '/production', module: 'production' },
    { title: 'Log Equipment Maintenance', description: 'Record preventive maintenance', path: '/maintenance', module: 'maintenance' },
    { title: 'Check Low Stock Materials', description: 'Review inventory alert items', path: '/inventory', module: 'inventory' },
  ],
  logistics: [
    { title: 'Log Fuel Record', description: 'Record fuel consumption for your fleet', path: '/fleet', module: 'fleet' },
    { title: 'Schedule Vehicle Service', description: 'Book a vehicle for maintenance', path: '/maintenance', module: 'maintenance' },
    { title: 'Process Purchase Order', description: 'Receive goods from supplier', path: '/procurement', module: 'procurement' },
  ],
  technology: [
    { title: 'Review MRR', description: 'Check subscription revenue metrics', path: '/subscriptions', module: 'subscriptions' },
    { title: 'Update Project Status', description: 'Log progress on active projects', path: '/projects', module: 'projects' },
    { title: 'Launch Email Campaign', description: 'Send update to your mailing list', path: '/marketing', module: 'marketing' },
  ],
};

export default function IndustryInsights() {
  const { industry, isModuleActive } = useModules();
  const { isDemo } = useAuth();
  const { formatMoney } = useCurrency();

  const preset = INDUSTRY_PRESETS[industry] ?? INDUSTRY_PRESETS.general;
  const kpis = INDUSTRY_KPIS[industry] ?? INDUSTRY_KPIS.general;
  const actions = INDUSTRY_ACTIONS[industry] ?? INDUSTRY_ACTIONS.retail ?? [];

  return (
    <AppLayout title="Industry Insights" subtitle={`Tailored for ${preset.label}`}>
      <div className="space-y-6">

        {/* Industry header */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 flex items-start gap-4">
            <span className="text-4xl">{preset.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{preset.label}</h2>
                <Badge variant="secondary">{preset.modules.length} modules active</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{preset.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {preset.highlights.map(h => (
                  <Badge key={h} variant="outline" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />{h}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key KPIs for this industry */}
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Key Performance Indicators for {preset.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(kpi => {
              const active = isModuleActive(kpi.module);
              return (
                <Card key={kpi.label} className={cn(!active && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                      {!active && (
                        <Badge variant="outline" className="text-[10px]">
                          Module off
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{kpi.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>
                    <div className="mt-3 pt-2 border-t border-border">
                      <p className="text-[11px] text-muted-foreground">Target</p>
                      <p className="text-sm font-bold text-primary">{kpi.target}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      via <span className="font-medium">{MODULE_LABELS[kpi.module]}</span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recommended actions */}
        {actions.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Recommended Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {actions.map(action => {
                const active = isModuleActive(action.module);
                return (
                  <Card key={action.title} className={cn('transition-colors', active ? 'hover:border-primary/40 cursor-pointer' : 'opacity-60')}>
                    <CardContent className="p-4">
                      <p className="font-semibold text-sm mb-1">{action.title}</p>
                      <p className="text-xs text-muted-foreground mb-3">{action.description}</p>
                      {active ? (
                        <Button size="sm" variant="outline" asChild className="w-full">
                          <Link to={action.path}>
                            Go to {MODULE_LABELS[action.module]} <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Enable {MODULE_LABELS[action.module]} in Settings
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Active modules for this industry */}
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Your Active Modules ({preset.modules.filter(m => isModuleActive(m)).length} / {preset.modules.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {preset.modules.map(m => (
              <Badge
                key={m}
                variant={isModuleActive(m) ? 'default' : 'outline'}
                className={cn(isModuleActive(m) ? '' : 'text-muted-foreground')}
              >
                {isModuleActive(m) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {MODULE_LABELS[m]}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Manage your active modules in{' '}
            <Link to="/settings" className="text-primary underline underline-offset-2">Settings → Modules</Link>
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
