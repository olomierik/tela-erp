import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: 'default' | 'outline' };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data yet',
  description = 'Get started by creating your first record.',
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = {
    sm: { wrapper: 'py-8', icon: 'w-8 h-8', iconBox: 'w-12 h-12', title: 'text-sm', desc: 'text-xs' },
    md: { wrapper: 'py-14', icon: 'w-10 h-10', iconBox: 'w-16 h-16', title: 'text-base', desc: 'text-sm' },
    lg: { wrapper: 'py-20', icon: 'w-12 h-12', iconBox: 'w-20 h-20', title: 'text-lg', desc: 'text-base' },
  }[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', sizes.wrapper, className)}>
      <div className={cn(
        'rounded-2xl bg-muted/60 border border-border/50 flex items-center justify-center mb-4',
        sizes.iconBox
      )}>
        <Icon className={cn('text-muted-foreground/60', sizes.icon)} />
      </div>
      <h3 className={cn('font-semibold text-foreground mb-1', sizes.title)}>{title}</h3>
      <p className={cn('text-muted-foreground max-w-xs', sizes.desc)}>{description}</p>
      {action && (
        <Button
          size="sm"
          variant={action.variant ?? 'default'}
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
