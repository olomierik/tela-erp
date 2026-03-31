import {
  ShoppingCart, FileText, Package, Users, DollarSign,
  CheckCircle, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type ActivityType = 'order' | 'invoice' | 'shipment' | 'employee' | 'payment' | 'approval' | 'alert';

const ACTIVITIES: { id: number; type: ActivityType; text: string; time: string }[] = [
  { id: 1,  type: 'order',    text: 'New sales order #SO-0284 created by Alice Chen',          time: '2 min ago' },
  { id: 2,  type: 'payment',  text: 'Payment of $12,400 received from Acme Corporation',       time: '18 min ago' },
  { id: 3,  type: 'invoice',  text: 'Invoice #INV-0091 issued to GlobalTech Ltd',              time: '42 min ago' },
  { id: 4,  type: 'shipment', text: 'Shipment #SHP-0067 dispatched — 3 items',                 time: '1h ago' },
  { id: 5,  type: 'approval', text: 'Leave request approved for Mark Johnson (3 days)',        time: '2h ago' },
  { id: 6,  type: 'alert',    text: 'Low stock alert: Product SKU-1029 below reorder level',  time: '3h ago' },
  { id: 7,  type: 'employee', text: 'New employee Sarah Williams added to HR',                 time: '4h ago' },
  { id: 8,  type: 'invoice',  text: 'Invoice #INV-0088 overdue — $6,200 outstanding',         time: 'Yesterday' },
];

const ICON_MAP: Record<ActivityType, { icon: any; bg: string; color: string }> = {
  order:    { icon: ShoppingCart, bg: 'bg-primary/10',      color: 'text-primary' },
  invoice:  { icon: FileText,     bg: 'bg-info/10',         color: 'text-info' },
  shipment: { icon: Package,      bg: 'bg-success/10',      color: 'text-success' },
  employee: { icon: Users,        bg: 'bg-violet-500/10',   color: 'text-violet-500' },
  payment:  { icon: DollarSign,   bg: 'bg-success/10',      color: 'text-success' },
  approval: { icon: CheckCircle,  bg: 'bg-success/10',      color: 'text-success' },
  alert:    { icon: AlertTriangle,bg: 'bg-warning/10',      color: 'text-warning' },
};

export default function RecentActivity() {
  return (
    <Card className="rounded-xl border-border h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-1">
            {ACTIVITIES.map(a => {
              const { icon: Icon, bg, color } = ICON_MAP[a.type];
              return (
                <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
