import { type LucideIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const ActionIcon = action?.icon ?? Plus;
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick} className="gap-1.5 shrink-0">
          <ActionIcon className="w-4 h-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
