import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparklineData?: number[];
  loading?: boolean;
  onClick?: () => void;
}

export function StatsCard({
  icon: Icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  label,
  value,
  change,
  changeLabel = 'vs last month',
  sparklineData,
  loading = false,
  onClick,
}: StatsCardProps) {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;

  const sparklineColor = isPositive
    ? '#22c55e'
    : isNegative
    ? '#ef4444'
    : '#3b82f6';

  const sparklineChartData = sparklineData?.map((v, i) => ({ i, v }));

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-20 h-9 rounded" />
        </div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-4 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
      )}
      onClick={onClick}
    >
      {/* Top row: icon + sparkline */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            iconBg,
          )}
        >
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <ResponsiveContainer width={80} height={36}>
            <AreaChart data={sparklineChartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id={`sparkGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparklineColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparklineColor}
                strokeWidth={1.5}
                fill={`url(#sparkGrad-${label})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Label */}
      <p className="text-xs text-muted-foreground mb-1">{label}</p>

      {/* Value */}
      <p className="text-2xl font-bold text-foreground mb-2">{value}</p>

      {/* Change row */}
      {hasChange && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
              isPositive && 'bg-success/10 text-success',
              isNegative && 'bg-destructive/10 text-destructive',
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}
            {change!.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
