import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <AppLayout title={title}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1">Coming Soon</Badge>
        <Button variant="outline" size="sm" className="gap-2 mt-1">
          <Bell className="w-3.5 h-3.5" />
          Notify me when ready
        </Button>
      </div>
    </AppLayout>
  );
}
