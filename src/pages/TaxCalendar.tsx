import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CalendarClock, AlertTriangle, CheckCircle2, Clock, ChevronDown,
  FileText, TrendingUp, Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { cn } from '@/lib/utils';

type DeadlineType = 'paye' | 'sdl' | 'vat' | 'corporate';
type DeadlineStatus = 'filed' | 'upcoming' | 'overdue' | 'future';

interface DeadlineEvent {
  id: string;
  type: DeadlineType;
  dueDate: Date;
  period: string;
  status: DeadlineStatus;
  computedAmount: number;
  breakdown: Array<{ label: string; amount: number }>;
}

function formatTZS(amount: number): string {
  return 'TZS ' + new Intl.NumberFormat('en-TZ').format(Math.round(amount));
}

function generateDeadlines(today: Date, filedIds: Set<string>): DeadlineEvent[] {
  const events: DeadlineEvent[] = [];
  const start = new Date(today);
  const end = new Date(today);
  end.setMonth(end.getMonth() + 12);

  // PAYE & SDL: due 7th of following month for each month
  for (let m = -1; m < 13; m++) {
    const periodDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const dueDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 7);
    if (dueDate < new Date(today.getFullYear(), today.getMonth() - 1, 1)) continue;
    if (dueDate > end) break;

    const monthLabel = periodDate.toLocaleDateString('en-TZ', { month: 'long', year: 'numeric' });

    const payeId = `paye-${periodDate.getFullYear()}-${periodDate.getMonth()}`;
    const payeAmount = 450000 + Math.floor(Math.random() * 100000);
    events.push({
      id: payeId,
      type: 'paye',
      dueDate,
      period: monthLabel,
      status: computeStatus(dueDate, today, filedIds.has(payeId)),
      computedAmount: filedIds.has(payeId) ? 0 : payeAmount,
      breakdown: [
        { label: 'Gross salaries', amount: payeAmount * 8 },
        { label: 'PAYE withheld (avg 9.2%)', amount: payeAmount },
      ],
    });

    const sdlId = `sdl-${periodDate.getFullYear()}-${periodDate.getMonth()}`;
    const sdlAmount = 140000 + Math.floor(Math.random() * 30000);
    events.push({
      id: sdlId,
      type: 'sdl',
      dueDate,
      period: monthLabel,
      status: computeStatus(dueDate, today, filedIds.has(sdlId)),
      computedAmount: filedIds.has(sdlId) ? 0 : sdlAmount,
      breakdown: [
        { label: 'Total payroll', amount: sdlAmount / 0.035 },
        { label: 'SDL @ 3.5%', amount: sdlAmount },
      ],
    });
  }

  // VAT: Q1=Apr20, Q2=Jul20, Q3=Oct20, Q4=Jan20
  const vatQuarters = [
    { month: 3, day: 20, label: 'Q1' },
    { month: 6, day: 20, label: 'Q2' },
    { month: 9, day: 20, label: 'Q3' },
    { month: 0, day: 20, label: 'Q4', yearOffset: 1 },
  ];
  for (let yr = today.getFullYear() - 1; yr <= today.getFullYear() + 2; yr++) {
    for (const q of vatQuarters) {
      const dueDate = new Date(yr + (q.yearOffset ?? 0), q.month, q.day);
      if (dueDate < new Date(today.getFullYear() - 1, 0, 1)) continue;
      if (dueDate > end) continue;
      const periodYear = q.label === 'Q4' ? yr - 1 : yr;
      const periodLabel = `${q.label}-${periodYear}`;
      const vatId = `vat-${periodLabel}`;
      const vatAmount = 1200000 + Math.floor(Math.random() * 400000);
      events.push({
        id: vatId,
        type: 'vat',
        dueDate,
        period: periodLabel,
        status: computeStatus(dueDate, today, filedIds.has(vatId)),
        computedAmount: filedIds.has(vatId) ? 0 : vatAmount,
        breakdown: [
          { label: 'Output VAT (sales)', amount: vatAmount + 600000 },
          { label: 'Input VAT (purchases)', amount: 600000 },
          { label: 'Net VAT payable', amount: vatAmount },
        ],
      });
    }
  }

  // Corporate tax instalments: 31 Mar, 30 Jun, 30 Sep, 31 Dec
  const corpDates = [
    { month: 2, day: 31, label: '1st instalment (25%)' },
    { month: 5, day: 30, label: '2nd instalment (25%)' },
    { month: 8, day: 30, label: '3rd instalment (25%)' },
    { month: 11, day: 31, label: '4th instalment (25%)' },
  ];
  for (let yr = today.getFullYear(); yr <= today.getFullYear() + 1; yr++) {
    for (const cd of corpDates) {
      const dueDate = new Date(yr, cd.month, cd.day);
      if (dueDate > end) continue;
      const corpId = `corporate-${yr}-${cd.month}`;
      const corpAmount = 875000;
      events.push({
        id: corpId,
        type: 'corporate',
        dueDate,
        period: `${yr} — ${cd.label}`,
        status: computeStatus(dueDate, today, filedIds.has(corpId)),
        computedAmount: filedIds.has(corpId) ? 0 : corpAmount,
        breakdown: [
          { label: 'Estimated annual profit', amount: corpAmount * 4 / 0.3 },
          { label: 'Corporate tax @ 30%', amount: corpAmount * 4 },
          { label: 'This instalment (25%)', amount: corpAmount },
        ],
      });
    }
  }

  return events.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

function computeStatus(dueDate: Date, today: Date, filed: boolean): DeadlineStatus {
  if (filed) return 'filed';
  if (dueDate < today) return 'overdue';
  const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 14) return 'upcoming';
  return 'future';
}

const TYPE_CONFIG: Record<DeadlineType, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  paye: { label: 'PAYE', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: FileText },
  sdl: { label: 'SDL', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: FileText },
  vat: { label: 'VAT', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: TrendingUp },
  corporate: { label: 'Corporate Tax', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: TrendingUp },
};

const STATUS_CONFIG: Record<DeadlineStatus, { label: string; badgeClass: string; icon: typeof CheckCircle2 }> = {
  filed: { label: 'Filed', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  upcoming: { label: 'Due Soon', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  overdue: { label: 'Overdue', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  future: { label: 'Upcoming', badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: CalendarClock },
};

function DeadlineCard({ event, onFileNow }: { event: DeadlineEvent; onFileNow: () => void }) {
  const [open, setOpen] = useState(false);
  const type = TYPE_CONFIG[event.type];
  const status = STATUS_CONFIG[event.status];
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  return (
    <Card className={cn(
      'border-border rounded-xl transition-all',
      event.status === 'overdue' && 'border-red-200 dark:border-red-800/50',
      event.status === 'upcoming' && 'border-amber-200 dark:border-amber-800/50',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', type.bg)}>
            <TypeIcon className={cn('w-4 h-4', type.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground">{type.label}</span>
              <Badge className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border-0', status.badgeClass)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{event.type.toUpperCase()}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-0.5">{event.period}</p>
            <p className="text-xs text-muted-foreground">
              Due: <span className="font-medium text-foreground">
                {event.dueDate.toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </p>
          </div>
          <div className="text-right shrink-0">
            {event.status === 'filed' ? (
              <p className="text-xs text-emerald-600 font-semibold">Filed</p>
            ) : (
              <p className="text-sm font-bold text-foreground">{formatTZS(event.computedAmount)}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">est. amount</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {event.status !== 'filed' && event.status !== 'overdue' && (
            <Button size="sm" className="h-7 text-xs" onClick={onFileNow}>
              File Now
            </Button>
          )}
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                View Details
                <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Computation Breakdown</p>
                {event.breakdown.map((line, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className={cn('font-medium', i === event.breakdown.length - 1 && 'text-foreground font-bold')}>
                      {formatTZS(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}

type TabFilter = 'all' | DeadlineType;

export default function TaxCalendar() {
  const { isDemo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const today = useMemo(() => new Date(), []);

  const { data: filingData } = useTenantQuery('tra_filing_records' as any);

  const filedIds = useMemo((): Set<string> => {
    if (isDemo) {
      // Demo: 3 random entries shown as filed
      return new Set(['paye-' + today.getFullYear() + '-' + (today.getMonth() - 1), 'sdl-' + today.getFullYear() + '-' + (today.getMonth() - 1), 'vat-Q2-' + (today.getFullYear() - 1)]);
    }
    const records = (filingData as any[]) ?? [];
    return new Set(records.map((r: any) => r.event_id ?? r.id));
  }, [isDemo, filingData, today]);

  const events = useMemo(() => generateDeadlines(today, filedIds), [today, filedIds]);

  const filtered = useMemo(() =>
    activeTab === 'all' ? events : events.filter(e => e.type === activeTab),
    [events, activeTab]
  );

  const stats = useMemo(() => {
    const next30 = new Date(today);
    next30.setDate(next30.getDate() + 30);
    return {
      upcoming30: events.filter(e => e.status !== 'filed' && e.status !== 'overdue' && e.dueDate <= next30).length,
      overdue: events.filter(e => e.status === 'overdue').length,
      filedThisYear: events.filter(e => e.status === 'filed' && e.dueDate.getFullYear() === today.getFullYear()).length,
    };
  }, [events, today]);

  const urgent = useMemo(() =>
    filtered.filter(e => e.status === 'upcoming'),
    [filtered]
  );
  const rest = useMemo(() =>
    filtered.filter(e => e.status !== 'upcoming'),
    [filtered]
  );

  return (
    <AppLayout title="Tax Calendar" subtitle="TRA filing deadlines and compliance tracker">
      <div className="max-w-4xl">
        <PageHeader
          title="Tax Calendar"
          subtitle="TRA filing deadlines and compliance tracker"
          icon={CalendarClock}
          iconColor="text-blue-600"
          breadcrumb={[{ label: 'Tax Intelligence' }, { label: 'Tax Calendar' }]}
          stats={[
            { label: 'Due in 30 days', value: stats.upcoming30, color: stats.upcoming30 > 0 ? 'text-amber-600' : 'text-emerald-600' },
            { label: 'Overdue', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-600' : 'text-emerald-600' },
            { label: 'Filed this year', value: stats.filedThisYear, color: 'text-emerald-600' },
          ]}
        />

        {/* Urgent section */}
        {urgent.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Bell className="w-4 h-4" />
                Due in the Next 14 Days ({urgent.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgent.map(e => (
                <DeadlineCard key={e.id} event={e} onFileNow={() => navigate('/tra-filing')} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filter tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabFilter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="paye">PAYE</TabsTrigger>
            <TabsTrigger value="sdl">SDL</TabsTrigger>
            <TabsTrigger value="vat">VAT</TabsTrigger>
            <TabsTrigger value="corporate">Corporate</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main list */}
        <div className="space-y-3">
          {rest.length === 0 && urgent.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No deadlines found for the selected filter.
            </div>
          )}
          {rest.map(e => (
            <DeadlineCard key={e.id} event={e} onFileNow={() => navigate('/tra-filing')} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
