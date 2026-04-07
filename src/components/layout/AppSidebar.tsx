import { useState, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  Factory, Users, Globe, Megaphone, ArrowRightLeft,
  UserCircle, FolderKanban, Calculator, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Menu, X, Briefcase, Brain, Receipt, Store,
  MoreHorizontal, BookOpen, Landmark, ScanLine,
  UsersRound, PiggyBank, UserPlus, Grid3X3,
  Car, Wrench, ShoppingBag, RefreshCw, Lightbulb,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useModules, type ModuleKey } from '@/contexts/ModulesContext';
import { useTenantApps } from '@/hooks/use-tenant-apps';
import { cn } from '@/lib/utils';
import telaLogo from '@/assets/tela-erp-logo.png';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  icon: any;
  path: string;
  badge?: number;
  badgeColor?: string;
  module?: ModuleKey;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'AI Assistant', icon: Brain, path: '/ai-cfo', module: 'ai' },
    ],
  },
  {
    title: 'Sales & CRM',
    items: [
      { label: 'Sales Orders', icon: ShoppingCart, path: '/sales', module: 'sales' },
      { label: 'Invoices', icon: FileText, path: '/invoices', module: 'accounting' },
      { label: 'Customers', icon: Users, path: '/customers', module: 'crm' },
      { label: 'CRM Pipeline', icon: UserCircle, path: '/crm', module: 'crm' },
      { label: 'Marketing', icon: Megaphone, path: '/marketing', module: 'marketing' },
      { label: 'Subscriptions', icon: RefreshCw, path: '/subscriptions', module: 'subscriptions' },
      { label: 'Point of Sale', icon: ShoppingBag, path: '/pos', module: 'pos' },
    ],
  },
  {
    title: 'Supply Chain',
    items: [
      { label: 'Inventory', icon: Package, path: '/inventory', module: 'inventory' },
      { label: 'Procurement', icon: Truck, path: '/procurement', module: 'procurement' },
      { label: 'Suppliers', icon: UserPlus, path: '/suppliers', module: 'procurement' },
      { label: 'Transfers', icon: ArrowRightLeft, path: '/transfers', module: 'inventory' },
      { label: 'Production', icon: Factory, path: '/production', module: 'production' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Accounting', icon: Calculator, path: '/accounting', module: 'accounting' },
      { label: 'Vouchers', icon: FileText, path: '/accounting/vouchers', module: 'accounting' },
      { label: 'Ledger', icon: BookOpen, path: '/accounting/ledger', module: 'accounting' },
      { label: 'Financials', icon: BarChart3, path: '/accounting/reports', module: 'accounting' },
      { label: 'Expenses', icon: Receipt, path: '/expenses', module: 'expenses' },
      { label: 'Budgets', icon: PiggyBank, path: '/budgets', module: 'budgets' },
      { label: 'Fixed Assets', icon: Landmark, path: '/assets', module: 'assets' },
    ],
  },
  {
    title: 'People & Projects',
    items: [
      { label: 'HR & Payroll', icon: Briefcase, path: '/hr', module: 'hr' },
      { label: 'Team', icon: UsersRound, path: '/settings/team' },
      { label: 'Projects', icon: FolderKanban, path: '/projects', module: 'projects' },
    ],
  },
  {
    title: 'Fleet & Maintenance',
    items: [
      { label: 'Fleet', icon: Car, path: '/fleet', module: 'fleet' },
      { label: 'Maintenance', icon: Wrench, path: '/maintenance', module: 'maintenance' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Industry Insights', icon: Lightbulb, path: '/industry-insights' },
      { label: 'Stores', icon: Store, path: '/stores' },
      { label: 'Online Store', icon: Globe, path: '/online-store' },
      { label: 'Doc Scanner', icon: ScanLine, path: '/documents' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
    ],
  },
];

const mobileBottomNav: NavItem[] = [
  { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Sales', icon: ShoppingCart, path: '/sales' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Finance', icon: Calculator, path: '/accounting' },
];

const MODULE_TO_APP_KEY: Partial<Record<ModuleKey, string>> = {
  production: 'manufacturing',
  inventory: 'inventory',
  sales: 'sales',
  marketing: 'marketing',
  accounting: 'accounting',
  procurement: 'procurement',
  hr: 'hr',
  crm: 'crm',
  projects: 'projects',
  assets: 'fixed-assets',
  expenses: 'expenses',
  budgets: 'budgets',
  fleet: 'fleet',
  maintenance: 'maintenance',
  pos: 'pos',
  subscriptions: 'subscriptions',
  ai: 'ai-assistant',
};

export default function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, tenant, role, signOut } = useAuth();
  const { activeModules } = useModules();
  const { isInstalled } = useTenantApps();

  const filteredNavSections = useMemo(() => {
    const isVisibleByModule = (module?: ModuleKey) => {
      if (!module) return true;
      const appKey = MODULE_TO_APP_KEY[module] ?? module;
      return activeModules.includes(module) || isInstalled(appKey);
    };

    return navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (item.path === '/reseller' && role !== 'reseller') return false;
          return isVisibleByModule(item.module);
        }),
      }))
      .filter(section => section.items.length > 0);
  }, [activeModules, isInstalled, role]);

  /* ─── Swipe-to-close for mobile drawer ─────────────────────── */
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${-diff}px)`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 80) {
      setMobileOpen(false);
    }
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
  }, []);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 md:py-[7px] rounded-lg text-[13px] transition-colors duration-100 group select-none touch-manipulation',
          active
            ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground active:bg-sidebar-accent/80'
        )}
        title={collapsed ? item.label : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon className={cn(
          'w-[18px] h-[18px] md:w-[16px] md:h-[16px] shrink-0 transition-colors duration-100',
          active ? 'text-sidebar-primary' : 'text-sidebar-foreground group-hover:text-sidebar-foreground'
        )} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap overflow-hidden flex-1 leading-none"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && item.badge !== undefined && item.badge > 0 && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none',
            item.badgeColor ?? 'bg-red-500 text-white'
          )}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[56px] md:h-[52px] border-b border-sidebar-border shrink-0">
        <img src={telaLogo} alt="TELA ERP" className={cn("shrink-0 object-contain transition-all duration-150", collapsed ? "h-7 w-7" : "h-8 w-auto max-w-[140px]")} />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 overscroll-contain">
        {filteredNavSections.map(section => (
          <div key={section.title} className="mb-1">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="px-3 mb-0.5 py-1 md:py-0.5"
                >
                  <span className="text-[10px] font-semibold text-sidebar-muted/60 uppercase tracking-[0.1em]">
                    {section.title}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-[2px] md:space-y-[1px]">
              {section.items.map(item => (
                <NavItemComponent key={item.path} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + User footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0 space-y-[2px] md:space-y-[1px]">
        <Link
          to="/apps"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 md:py-[7px] rounded-lg text-[13px] transition-colors duration-100 group select-none touch-manipulation',
            isActive('/apps')
              ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80'
          )}
          title={collapsed ? 'Apps' : undefined}
        >
          <Grid3X3 className={cn(
            'w-[18px] h-[18px] md:w-[16px] md:h-[16px] shrink-0',
            isActive('/apps') ? 'text-sidebar-primary' : 'text-sidebar-muted'
          )} />
          {!collapsed && <span>Apps</span>}
        </Link>
        <Link
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 md:py-[7px] rounded-lg text-[13px] transition-colors duration-100 group select-none touch-manipulation',
            isActive('/settings')
              ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className={cn(
            'w-[18px] h-[18px] md:w-[16px] md:h-[16px] shrink-0',
            isActive('/settings') ? 'text-sidebar-primary' : 'text-sidebar-muted'
          )} />
          {!collapsed && <span>Settings</span>}
        </Link>

        <Link to="/profile" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-2.5 px-2 py-2 md:py-1.5 rounded-lg hover:bg-sidebar-accent/60 active:bg-sidebar-accent/80 transition-colors cursor-pointer group touch-manipulation">
            <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-[hsl(172,66%,40%)] to-[hsl(172,66%,30%)] flex items-center justify-center shrink-0 text-xs font-bold text-white">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-[12px] font-medium text-sidebar-accent-foreground truncate leading-tight">{profile?.full_name ?? 'User'}</p>
                  <p className="text-[10px] text-sidebar-muted capitalize leading-tight">{role ?? 'user'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 md:py-[7px] rounded-lg text-[13px] w-full transition-colors text-sidebar-muted hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 touch-manipulation"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] md:w-[16px] md:h-[16px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-11 h-11 rounded-xl bg-sidebar-background border border-sidebar-border flex items-center justify-center text-sidebar-foreground shadow-lg hover:bg-sidebar-accent active:bg-sidebar-accent/80 transition-colors touch-manipulation"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay drawer with swipe-to-close */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              ref={drawerRef}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0, 0.25, 1] }}
              className="w-[280px] h-full bg-sidebar-background flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 w-9 h-9 rounded-lg flex items-center justify-center text-sidebar-muted hover:text-sidebar-accent-foreground active:bg-sidebar-accent/60 transition-colors touch-manipulation"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-sidebar-background flex-col border-r border-sidebar-border z-50 overflow-hidden shadow-lg shadow-black/5"
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[52px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar-background border-t border-sidebar-border flex items-center justify-around px-1 safe-area-pb shadow-lg shadow-black/20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
      >
        {mobileBottomNav.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl text-[10px] font-medium transition-colors min-w-[56px] min-h-[48px] touch-manipulation',
                active ? 'text-sidebar-primary bg-sidebar-accent' : 'text-sidebar-muted hover:text-sidebar-foreground active:bg-sidebar-accent/60'
              )}
            >
              <item.icon className={cn('w-5 h-5', active && 'text-sidebar-primary')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl text-[10px] font-medium transition-colors min-w-[56px] min-h-[48px] touch-manipulation',
            moreOpen ? 'text-sidebar-primary bg-sidebar-accent' : 'text-sidebar-muted hover:text-sidebar-foreground active:bg-sidebar-accent/60'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl bg-background border-border p-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <SheetHeader className="px-5 pt-2 pb-3 border-b border-border">
            <SheetTitle className="text-base font-semibold">All Modules</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-full pb-20 px-4 pt-3 overscroll-contain">
            {filteredNavSections.map(section => (
              <div key={section.title} className="mb-5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2 px-1">
                  {section.title}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {section.items.map(item => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors text-center min-h-[72px] justify-center touch-manipulation',
                          active
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'border-border hover:bg-accent active:bg-accent/80 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
