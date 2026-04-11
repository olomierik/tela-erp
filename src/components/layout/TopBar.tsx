import { useState, useEffect } from 'react';
import { Bell, Store, ChevronDown, LogOut, Settings, User, Search, Check, Dot, Sun, Moon } from 'lucide-react';
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

  const unreadCount = notifications.filter(n => !n.read).length;

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

  return (
    <>
      <header className="h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-3 md:px-6 sticky top-0 z-40 min-w-0 overflow-x-hidden">
        {/* Left: breadcrumbs + title */}
        <div className="min-w-0 pl-12 md:pl-0 flex flex-col justify-center">
          {crumbs.length > 1 ? (
            <>
              <Breadcrumb>
                <BreadcrumbList className="text-[11px]">
                  {crumbs.slice(0, -1).map((crumb, i) => (
                    <BreadcrumbItem key={i}>
                      <BreadcrumbLink className="text-muted-foreground/70 hover:text-muted-foreground transition-colors text-[11px]">
                        {crumb}
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </BreadcrumbItem>
                  ))}
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground font-semibold text-[11px]">
                      {crumbs[crumbs.length - 1]}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              {subtitle && <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{subtitle}</p>}
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-foreground truncate leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground truncate leading-tight">{subtitle}</p>}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Company Switcher */}
          <CompanySwitcher />

          {/* ⌘K Search trigger — desktop */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors text-xs text-muted-foreground group"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="ml-2 flex items-center gap-0.5 font-mono text-[10px] bg-background border border-border rounded px-1 py-0.5 group-hover:border-primary/30 transition-colors">
              <span>⌘</span><span>K</span>
            </kbd>
          </button>

          {/* Mobile search button — larger touch target */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 touch-manipulation"
            onClick={() => setCmdOpen(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Dark / Light mode toggle — larger on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5 sm:w-4 sm:h-4" /> : <Moon className="w-5 h-5 sm:w-4 sm:h-4" />}
          </Button>

          {/* Store Switcher — hidden on small screens */}
          {stores.length > 0 && (
            <Select value={selectedStoreId ?? 'all'} onValueChange={v => setSelectedStoreId(v === 'all' ? null : v)}>
              <SelectTrigger className="hidden sm:flex h-8 text-xs border-border bg-background min-w-[100px] max-w-[140px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    selectedStoreId ? 'bg-emerald-500' : 'bg-blue-500'
                  )} />
                  <span className="truncate">{selectedStoreName}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {isStoreAdmin && (
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      All Stores
                    </div>
                  </SelectItem>
                )}
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Currency — hidden on small screens */}
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger className="hidden sm:flex w-[76px] h-8 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {popularCurrencies.map(c => (
                <SelectItem key={c} value={c}>{currencySymbol(c)} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Notifications Bell — larger touch target on mobile */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 sm:h-8 sm:w-8 touch-manipulation">
                <Bell className="w-5 h-5 sm:w-4 sm:h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-24px)] sm:w-80 p-0 shadow-xl border-border">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{unreadCount}</Badge>}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1 touch-manipulation py-1 px-2 -mr-2">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-border max-h-72 overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'px-4 py-3 text-sm cursor-pointer hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation',
                        !n.read && 'bg-primary/5 hover:bg-primary/10'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColors[n.type] ?? 'bg-blue-500')} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium text-foreground', !n.read && 'font-semibold')}>{n.title}</p>
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-muted-foreground/50 text-[10px] mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border">
                <Link
                  to="/settings"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-primary hover:underline w-full text-center block touch-manipulation py-1"
                >
                  Notification settings
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Avatar Menu — larger touch target on mobile */}
          <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 sm:h-8 gap-2 px-2 rounded-lg touch-manipulation">
                <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-sm">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <span className="hidden lg:block text-sm font-medium max-w-[90px] truncate">
                  {profile?.full_name?.split(' ')[0] ?? 'User'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5 shadow-xl border-border">
              <div className="px-3 py-2.5 border-b border-border mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </div>
              </div>
              <Link
                to="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                My Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Settings
              </Link>
              <div className="border-t border-border mt-1.5 pt-1.5">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 active:bg-red-100 dark:active:bg-red-950/30 text-red-600 w-full text-left transition-colors touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
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
