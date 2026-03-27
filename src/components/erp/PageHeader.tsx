import { LucideIcon, ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  href?: string;
  disabled?: boolean;
}

interface PageStat {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: PageAction[];
  breadcrumb?: Array<{ label: string; href?: string }>;
  stats?: PageStat[];
  badge?: { label: string; variant?: 'default' | 'secondary' | 'outline' | 'destructive' };
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-600',
  actions = [],
  breadcrumb = [],
  stats = [],
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="w-3 h-3" />
          </Link>
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 opacity-40" />
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</Link>
              ) : (
                <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {badge && <Badge variant={badge.variant ?? 'secondary'} className="text-xs">{badge.label}</Badge>}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {actions.map((action, i) => {
              const Comp = action.href ? Link : 'button';
              return (
                <Button
                  key={i}
                  variant={action.variant ?? (i === actions.length - 1 ? 'default' : 'outline')}
                  size="sm"
                  className="h-8 text-sm gap-1.5"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  asChild={!!action.href}
                >
                  {action.href ? (
                    <Link to={action.href}>
                      {action.icon && <action.icon className="w-4 h-4" />}
                      {action.label}
                    </Link>
                  ) : (
                    <>
                      {action.icon && <action.icon className="w-4 h-4" />}
                      {action.label}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{stat.label}:</span>
              <span className={cn(
                'text-sm font-semibold',
                stat.color ?? 'text-foreground',
                stat.trend === 'up' && 'text-emerald-600',
                stat.trend === 'down' && 'text-red-600',
              )}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
