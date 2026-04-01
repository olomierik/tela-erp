import { useState, useEffect, useRef } from 'react';
import {
  Bell, CheckCircle2, DollarSign, Clock, AlertTriangle,
  CalendarDays, UserPlus, X, CheckCheck, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types & mock data ────────────────────────────────────────────────────────

type NotifType = 'invoice' | 'payment' | 'approval' | 'stock' | 'leave' | 'customer';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'payment', read: false,
    title: 'Payment received — $12,400',
    description: 'Acme Corp paid invoice INV-0040 in full.',
    time: '5 min ago',
  },
  {
    id: 'n2', type: 'stock', read: false,
    title: 'Low stock alert: SKU-1029',
    description: 'Laptop Pro X1 has only 3 units remaining. Reorder level is 10.',
    time: '18 min ago',
  },
  {
    id: 'n3', type: 'approval', read: false,
    title: 'Purchase order pending approval',
    description: 'PO-2025-028 from TechParts Ltd ($8,200) is awaiting your approval.',
    time: '42 min ago',
  },
  {
    id: 'n4', type: 'leave', read: false,
    title: 'Leave request submitted',
    description: 'Elena Petrova requested 5 days annual leave (Apr 7–11).',
    time: '1 hr ago',
  },
  {
    id: 'n5', type: 'invoice', read: false,
    title: 'Invoice INV-0042 overdue',
    description: 'GlobalMart owes $34,500 — overdue by 7 days. Consider sending a reminder.',
    time: '2 hrs ago',
  },
  {
    id: 'n6', type: 'customer', read: true,
    title: 'New customer registered',
    description: 'Meridian Logistics signed up and placed their first inquiry.',
    time: '4 hrs ago',
  },
  {
    id: 'n7', type: 'payment', read: true,
    title: 'Payment received — $5,400',
    description: 'TechVision Ltd settled invoice INV-0041.',
    time: '6 hrs ago',
  },
  {
    id: 'n8', type: 'approval', read: true,
    title: 'Production order approved',
    description: 'PRD-2025-014 for Industrial Motor 5HP has been approved and scheduled.',
    time: 'Yesterday',
  },
  {
    id: 'n9', type: 'stock', read: true,
    title: 'Stock adjustment recorded',
    description: 'Inventory adjustment for Office Chair Deluxe: +50 units at Main Warehouse.',
    time: 'Yesterday',
  },
  {
    id: 'n10', type: 'invoice', read: true,
    title: 'Invoice INV-0043 sent',
    description: 'Invoice for $9,800 sent to DataCore Systems. Due in 30 days.',
    time: '2 days ago',
  },
];

const NOTIF_CONFIG: Record<NotifType, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}> = {
  invoice:  { icon: CheckCircle2,  iconBg: 'bg-warning/10',     iconColor: 'text-warning' },
  payment:  { icon: DollarSign,    iconBg: 'bg-success/10',     iconColor: 'text-success' },
  approval: { icon: Clock,         iconBg: 'bg-warning/10',     iconColor: 'text-warning' },
  stock:    { icon: AlertTriangle, iconBg: 'bg-destructive/10', iconColor: 'text-destructive' },
  leave:    { icon: CalendarDays,  iconBg: 'bg-info/10',        iconColor: 'text-info' },
  customer: { icon: UserPlus,      iconBg: 'bg-info/10',        iconColor: 'text-info' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [notifs, setNotifs] = useState(INITIAL_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'relative flex items-center justify-center w-9 h-9 rounded-md transition-colors',
          'hover:bg-accent/10 text-foreground/70 hover:text-foreground',
          open && 'bg-accent/10 text-foreground',
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-1rem)]',
            'bg-card border border-border rounded-xl shadow-2xl z-50',
            'animate-in fade-in-0 slide-in-from-top-2 duration-150',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unread > 0 && (
                <span className="text-xs bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-full">
                  {unread} unread
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[420px]">
            {notifs.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifs.map(notif => {
                const cfg = NOTIF_CONFIG[notif.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group relative',
                      'hover:bg-muted/50 border-b border-border last:border-0',
                      !notif.read && 'bg-primary/5 hover:bg-primary/8',
                    )}
                  >
                    {/* Unread dot */}
                    {!notif.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}

                    {/* Icon */}
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg)}>
                      <Icon className={cn('w-4 h-4', cfg.iconColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-snug', notif.read ? 'text-foreground' : 'font-medium text-foreground')}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {notif.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{notif.time}</p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <button className="flex items-center justify-center gap-1.5 w-full text-xs text-primary hover:text-primary/80 font-medium transition-colors py-1">
              <ExternalLink className="w-3 h-3" />
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
