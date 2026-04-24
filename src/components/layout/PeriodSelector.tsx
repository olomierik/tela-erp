import { useState } from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { usePeriod, PeriodMode } from '@/contexts/PeriodContext';
import { cn } from '@/lib/utils';

/**
 * Compact global period selector for the TopBar.
 * Switches between a single-month picker and a custom date range.
 */
export default function PeriodSelector() {
  const { mode, setMode, month, setMonth, from, to, setRange, label } = usePeriod();
  const [open, setOpen] = useState(false);

  const handleMode = (m: PeriodMode) => setMode(m);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex h-8 px-2 text-[12px] gap-1.5 text-muted-foreground hover:text-foreground border border-border bg-transparent hover:bg-muted/50 rounded-md max-w-[200px]"
          aria-label="Change period"
        >
          <CalendarRange className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-3 rounded-xl shadow-xl border-border">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-foreground">Period</p>
            <div className="inline-flex bg-muted rounded-md p-0.5 text-[11px]">
              <button
                onClick={() => handleMode('month')}
                className={cn('px-2 py-1 rounded-[4px] transition-colors',
                  mode === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                Month
              </button>
              <button
                onClick={() => handleMode('range')}
                className={cn('px-2 py-1 rounded-[4px] transition-colors',
                  mode === 'range' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                Range
              </button>
            </div>
          </div>

          {mode === 'month' ? (
            <div className="space-y-1.5">
              <Label htmlFor="period-month" className="text-[11px] text-muted-foreground">Select month</Label>
              <Input
                id="period-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value || month)}
                className="h-9 text-[13px]"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { key: 'this',  label: 'This month',  m: new Date().toISOString().slice(0, 7) },
                  { key: 'prev',  label: 'Last month',  m: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7) },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setMonth(p.m)}
                    className={cn(
                      'text-[11px] px-2 py-1 rounded-md border transition-colors',
                      month === p.m
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="period-from" className="text-[11px] text-muted-foreground">From</Label>
                <Input id="period-from" type="date" value={from}
                  onChange={(e) => setRange(e.target.value || from, to)}
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="period-to" className="text-[11px] text-muted-foreground">To</Label>
                <Input id="period-to" type="date" value={to} min={from}
                  onChange={(e) => setRange(from, e.target.value || to)}
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
          )}

          <p className="text-[10.5px] text-muted-foreground/80 pt-1 border-t border-border/60 leading-relaxed">
            Applies across modules where time-based data is shown (reports, payroll, dashboards…).
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
