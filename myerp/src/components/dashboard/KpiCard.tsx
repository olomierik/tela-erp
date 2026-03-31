import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  alert?: boolean;
  loading?: boolean;
  subtitle?: string;
}

export default function KpiCard({ title, value, change, icon: Icon, alert, loading, subtitle }: KpiCardProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
    >
      <Card className={cn(
        'border-border rounded-xl overflow-hidden relative h-full',
        alert && 'border-warning/40 bg-warning/5',
      )}>
        {/* Colored top accent line on hover */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3.5">
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  alert ? 'bg-warning/10' : 'bg-primary/10',
                )}>
                  <Icon className={cn('w-[18px] h-[18px]', alert ? 'text-warning' : 'text-primary')} />
                </div>
                {change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5',
                    isPositive
                      ? 'text-success bg-success/10'
                      : 'text-destructive bg-destructive/10',
                  )}>
                    {isPositive
                      ? <TrendingUp className="w-3 h-3" />
                      : <TrendingDown className="w-3 h-3" />
                    }
                    {isPositive ? '+' : ''}{change}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{title}</p>
              {subtitle && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
