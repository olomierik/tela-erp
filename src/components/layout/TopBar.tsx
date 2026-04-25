import { useState, useEffect } from 'react';
import { Bell, Store, ChevronDown, LogOut, Settings, User, Search, Check, Dot, Sun, Moon, Menu, AlertTriangle } from 'lucide-react';
import { useSubscriptionAlerts } from '@/hooks/use-subscription-alerts';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import CommandPalette from '@/components/ui/CommandPalette';
import CompanySwitcher from '@/components/company/CompanySwitcher';
import PeriodSelector from '@/components/layout/PeriodSelector';
import { NetworkStatusIndicator } from '@/components/layout/NetworkStatusIndicator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Map each route to its breadcrumb chain: [section?, page]
const routeBreadcrumbs: Record<string, string[]> = {
  '/dashboard': ['Dashboard'],
  '/sales': ['Operations', 'Sales'],
  '/invoices': ['Operations', 'Invoices'],
  '/procurement': ['Operations', 'Procurement'],
  '/inventory': ['Operations', 'Inventory'],
  '/transfers': ['Operations', 'Stock Transfers'],
  '/production': ['Operations', 'Production'],
  '/automations': ['Operations', 'Automations'],
  '/crm': ['Customers', 'CRM'],
  '/customers': ['Customers', 'Customers'],
  '/suppliers': ['Supply Chain', 'Suppliers'],
  '/online-store': ['Customers', 'Online Store'],
  '/marketing': ['Customers', 'Marketing'],
  '/hr': ['Workforce', 'HR & Payroll'],
  '/team': ['Workforce', 'Team'],
  '/projects': ['Workforce', 'Projects'],
  '/settings/team': ['Admin', 'Settings', 'Team'],
  '/accounting': ['Finance', 'Accounting'],
  '/accounting/vouchers': ['Finance', 'Accounting', 'Vouchers'],
  '/accounting/ledger': ['Finance', 'Accounting', 'Ledger'],
  '/accounting/reports': ['Finance', 'Accounting', 'Reports'],
  '/fixed-assets': ['Finance', 'Fixed Assets'],
  '/expenses': ['Finance', 'Expenses'],
  '/budgets': ['Finance', 'Budgets'],
  '/reports': ['Finance', 'Reports'],
  '/billing': ['Finance', 'Billing'],
  '/ai-cfo': ['AI Intelligence', 'AI CFO Assistant'],
  '/document-scanner': ['Tools', 'Document Scanner'],
  '/stores': ['Admin', 'Stores'],
  '/settings/white-label': ['Admin', 'Settings', 'White Label'],
  '/settings/readiness': ['Admin', 'Settings', 'Readiness'],
  '/settings': ['Admin', 'Settings'],
  '/reseller': ['Admin', 'Reseller Portal'],
  '/profile': ['Profile'],
};

function useBreadcrumbs(pathname: string): string[] {
  if (routeBreadcrumbs[pathname]) return routeBreadcrumbs[pathname];
  let best = '';
  for (const key of Object.keys(routeBreadcrumbs)) {
    if (pathname.startsWith(key + '/') && key.length > best.length) best = key;
  }
  return best ? routeBreadcrumbs[best] : [];
}

interface TopBarProps {
  title: string;
  subtitle?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { displayCurrency, setDisplayCurrency, popularCurrencies, currencySymbol } = useCurrency();
  const { stores, selectedStoreId, setSelectedStoreId, isStoreAdmin } = useStore();
  const { profile, tenant, signOut, isDemo } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const crumbs = useBreadcrumbs(location.pathname);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load real notifications
  useEffect(() => {
    if (isDemo || !tenant?.id || !profile?.user_id) return;
    const load = async () => {
      const { data } = await (supabase.from as any)('notifications')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data ?? []);
    };
    load();

    const channel = supabase.channel(`notifications:${tenant.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenant.id}` },
        payload => setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 19)])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id, profile?.user_id, isDemo]);

  const subAlerts = useSubscriptionAlerts();
  const unreadCount = notifications.filter(n => !n.read).length + subAlerts.overdueCount;

  const markAllRead = async () => {
    if (!tenant?.id) return;
    await (supabase.from as any)('notifications').update({ read: true }).eq('tenant_id', tenant.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await (supabase.from as any)('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const typeColors: Record<string, string> = {
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    success: 'bg-emerald-500',
    info: 'bg-blue-500',
  };

  const selectedStoreName = selectedStoreId
    ? stores.find(s => s.id === selectedStoreId)?.name ?? 'Store'
    : 'All Stores';

  // Dispatch custom event to open mobile sidebar
  const openMobileSidebar = () => {
    // We need to communicate with AppSidebar — use a custom DOM event
    window.dispatchEvent(new CustomEvent('open-mobile-sidebar'));
  };

  return (
    <>
      <header className="h-13 sm:h-12 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 min-w-0 overflow-x-hidden">
        {/* Left */}
        <div className="min-w-0 flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 shrink-0 touch-manipulation -ml-1 text-muted-foreground hover:text-foreground"
            onClick={openMobileSidebar}
            aria-label="Open menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </Button>

          <div className="min-w-0 flex flex-col justify-center">
            {crumbs.length > 1 ? (
              <>
                <Breadcrumb className="hidden md:flex">
                  <BreadcrumbList className="text-[11px]">
                    {crumbs.slice(0, -1).map((crumb, i) => (
                      <BreadcrumbItem key={i}>
                        <BreadcrumbLink className="text-muted-foreground/60 hover:text-muted-foreground transition-colors text-[11px]">
                          {crumb}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator />
                      </BreadcrumbItem>
                    ))}
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-foreground font-semibold text-[11px] tracking-tight">
                        {crumbs[crumbs.length - 1]}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h2 className="md:hidden text-[13.5px] font-semibold text-foreground truncate leading-tight tracking-tight">
                  {crumbs[crumbs.length - 1]}
                </h2>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground/70 truncate leading-tight hidden md:block mt-0.5">
                    {subtitle}
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className="text-[13.5px] md:text-sm font-semibold text-foreground truncate leading-tight tracking-tight">{title}</h2>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground/70 truncate leading-tight hidden md:block mt-0.5">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:block">
            <CompanySwitcher />
          </div>

          {/* Search — desktop */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors text-[12px] text-muted-foreground/70 hover:text-muted-foreground group min-w-[160px]"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="flex items-center gap-px font-mono text-[10px] bg-card border border-border/70 rounded px-1.5 py-0.5 group-hover:border-primary/30 transition-colors leading-none">
              ⌘K
            </kbd>
          </button>

          {/* Search — mobile */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 touch-manipulation text-muted-foreground" onClick={() => setCmdOpen(true)}>
            <Search className="w-[17px] h-[17px]" />
          </Button>

          {/* Dark/light toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 touch-manipulation text-muted-foreground hover:text-foreground"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode
              ? <Sun className="w-[16px] h-[16px]" />
              : <Moon className="w-[16px] h-[16px]" />}
          </Button>

          {/* Store switcher */}
          {stores.length > 0 && (
            <Select value={selectedStoreId ?? 'all'} onValueChange={v => setSelectedStoreId(v === 'all' ? null : v)}>
              <SelectTrigger className="hidden sm:flex h-8 text-[12px] border-border bg-transparent hover:bg-muted/50 min-w-[96px] max-w-[136px] rounded-md">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', selectedStoreId ? 'bg-emerald-500' : 'bg-violet-500')} />
                  <span className="truncate">{selectedStoreName}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {isStoreAdmin && (
                  <SelectItem value="all">
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" />All Stores</div>
                  </SelectItem>
                )}
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{s.name}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Currency */}
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger className="hidden sm:flex w-[72px] h-8 text-[12px] border-border bg-transparent hover:bg-muted/50 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {popularCurrencies.map(c => (
                <SelectItem key={c} value={c}>{currencySymbol(c)} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <PeriodSelector />

          <NetworkStatusIndicator />

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 touch-manipulation text-muted-foreground hover:text-foreground">
                <Bell className="w-[16px] h-[16px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-destructive ring-2 ring-card" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-24px)] sm:w-80 p-0 shadow-xl border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[13px] tracking-tight">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 touch-manipulation">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-border/50 max-h-72 overflow-y-auto overscroll-contain">
                {subAlerts.overdueCount > 0 && (
                  <Link to="/subscriptions" onClick={() => setNotifOpen(false)}
                    className="block px-4 py-3 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[12.5px] text-red-700 dark:text-red-300">
                          {subAlerts.overdueCount} overdue subscription invoice{subAlerts.overdueCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-red-600/80 dark:text-red-400/80 line-clamp-2">
                          {subAlerts.customers.slice(0, 3).map(c => c.customer_name).join(', ')}
                          {subAlerts.customers.length > 3 && ` +${subAlerts.customers.length - 3} more`}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}
                {notifications.length === 0 && subAlerts.overdueCount === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-[13px] text-muted-foreground">All caught up</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'px-4 py-3 text-[13px] cursor-pointer hover:bg-muted/40 transition-colors touch-manipulation',
                        !n.read && 'bg-primary/[0.03]'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', typeColors[n.type] ?? 'bg-blue-500')} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium text-foreground text-[12.5px]', !n.read && 'font-semibold')}>{n.title}</p>
                          <p className="text-muted-foreground text-[11.5px] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-muted-foreground/40 text-[10px] mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                <Link to="/settings" onClick={() => setNotifOpen(false)} className="text-[11.5px] text-primary hover:text-primary/80 w-full text-center block touch-manipulation">
                  Notification settings
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-2 px-2 rounded-lg touch-manipulation">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <span className="hidden lg:block text-[12.5px] font-medium max-w-[80px] truncate text-foreground">
                  {profile?.full_name?.split(' ')[0] ?? 'User'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground/60 hidden lg:block" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1.5 shadow-xl border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold truncate tracking-tight">{profile?.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </div>
              </div>
              <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[12.5px] rounded-md hover:bg-muted transition-colors touch-manipulation">
                <User className="w-3.5 h-3.5 text-muted-foreground" />My Profile
              </Link>
              <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[12.5px] rounded-md hover:bg-muted transition-colors touch-manipulation">
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />Settings
              </Link>
              <div className="border-t border-border mt-1 pt-1">
                <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 text-[12.5px] rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 w-full text-left transition-colors touch-manipulation">
                  <LogOut className="w-3.5 h-3.5" />Sign out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
