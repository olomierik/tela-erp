import { LucideIcon, ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  // On mobile, show primary action inline and rest in overflow menu
  const primaryAction = actions.length > 0 ? actions[actions.length - 1] : null;
  const secondaryActions = actions.length > 1 ? actions.slice(0, -1) : [];

  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1 touch-manipulation py-1">
            <Home className="w-3 h-3" />
          </Link>
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 opacity-40" />
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-foreground transition-colors touch-manipulation py-1">{crumb.label}</Link>
              ) : (
                <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
            {/* Desktop: show all actions */}
            <div className="hidden sm:flex items-center gap-2">
              {actions.map((action, i) => (
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
              ))}
            </div>

            {/* Mobile: primary action + overflow menu */}
            <div className="flex sm:hidden items-center gap-2">
              {secondaryActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 touch-manipulation">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {secondaryActions.map((action, i) => (
                      <DropdownMenuItem
                        key={i}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="gap-2 py-2.5 touch-manipulation"
                      >
                        {action.icon && <action.icon className="w-4 h-4" />}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant ?? 'default'}
                  className="h-10 text-sm gap-1.5 touch-manipulation"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  asChild={!!primaryAction.href}
                >
                  {primaryAction.href ? (
                    <Link to={primaryAction.href}>
                      {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
                      {primaryAction.label}
                    </Link>
                  ) : (
                    <>
                      {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
                      {primaryAction.label}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats row — horizontal scroll on mobile */}
      {stats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border overflow-x-auto -mx-1 px-1">
          <div className="flex items-center gap-4 min-w-max">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{stat.label}:</span>
                <span className={cn(
                  'text-sm font-semibold whitespace-nowrap',
                  stat.color ?? 'text-foreground',
                  stat.trend === 'up' && 'text-emerald-600',
                  stat.trend === 'down' && 'text-red-600',
                )}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
