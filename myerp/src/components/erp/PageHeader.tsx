import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  /** Subtitle / description shown below the title */
  description?: string;
  /** Alias for description — accepted for backwards compatibility with module pages */
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  /** Primary CTA button (shown on right) */
  primaryAction?: ActionButton;
  /** Secondary buttons (outline, shown left of primary) */
  secondaryActions?: ActionButton[];
  /**
   * Legacy single-action shorthand used by module pages:
   *   action={{ label, onClick, icon? }}
   * Maps directly to primaryAction.
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
}

export default function PageHeader({
  title,
  description,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  action,
}: PageHeaderProps) {
  // Merge legacy props
  const resolvedDescription = description ?? subtitle;
  const resolvedPrimary: ActionButton | undefined = primaryAction ?? action;
  const hasActions = resolvedPrimary || (secondaryActions && secondaryActions.length > 0);

  return (
    <div className="flex items-start justify-between gap-4 mb-6 sm:flex-row flex-col">
      {/* Left side */}
      <div className="min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-0.5 mb-1">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-xs text-foreground font-medium' : 'text-xs text-muted-foreground'}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {resolvedDescription && (
          <p className="text-sm text-muted-foreground mt-0.5">{resolvedDescription}</p>
        )}
      </div>

      {/* Right side: action buttons */}
      {hasActions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {secondaryActions?.map((act, i) => {
            const Icon = act.icon;
            return (
              <Button key={i} variant={act.variant ?? 'outline'} size="sm" onClick={act.onClick} disabled={act.disabled} className="gap-1.5">
                {Icon && <Icon className="w-4 h-4" />}
                {act.label}
              </Button>
            );
          })}

          {resolvedPrimary && (() => {
            const Icon = resolvedPrimary.icon ?? Plus;
            return (
              <Button size="sm" variant={resolvedPrimary.variant ?? 'default'} onClick={resolvedPrimary.onClick} disabled={resolvedPrimary.disabled} className="gap-1.5">
                <Icon className="w-4 h-4" />
                {resolvedPrimary.label}
              </Button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
