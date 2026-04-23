import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  Factory, Users, Globe, Megaphone, ArrowRightLeft,
  UserCircle, FolderKanban, Calculator, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight,
  X, Briefcase, Brain, Receipt, Store,
  MoreHorizontal, BookOpen, Landmark, ScanLine,
  UsersRound, PiggyBank, UserPlus, Grid3X3,
  Car, Wrench, ShoppingBag, RefreshCw, Lightbulb,
  Scale, CalendarDays, TrendingDown, ClipboardList,
  Upload, AlertTriangle, Zap, FileSearch, Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { type ModuleKey } from '@/contexts/ModulesContext';
import { useTenantApps } from '@/hooks/use-tenant-apps';
import { cn } from '@/lib/utils';
import telaLogo from '@/assets/tela-erp-logo.png';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  icon: any;
  path: string;
  badge?: number;
  badgeColor?: string;
  module?: ModuleKey;
  appKey?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  appKey?: string;
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
    title: 'Financial Management',
    appKey: 'financial-management',
    items: [
      { label: 'CFO Command Center', icon: Building2, path: '/financial-management', appKey: 'financial-management' },
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
    title: 'Tax & Compliance',
    appKey: 'tax-compliance',
    items: [
      { label: 'AI Tax Consultant', icon: Scale, path: '/tax-consultant' },
      { label: 'Tax Calendar', icon: CalendarDays, path: '/tax-calendar' },
      { label: 'Tax Scenarios', icon: TrendingDown, path: '/tax-scenarios' },
      { label: 'Deduction Optimizer', icon: TrendingDown, path: '/deduction-optimizer' },
      { label: 'TRA E-Filing', icon: Upload, path: '/tra-filing' },
      { label: 'Filing Audit Log', icon: FileSearch, path: '/filing-audit-log' },
    ],
  },
  {
    title: 'Automation',
    appKey: 'automation',
    items: [
      { label: 'Automation Rules', icon: Zap, path: '/automations' },
      { label: 'Execution Log', icon: ClipboardList, path: '/automation-log' },
      { label: 'Anomaly Alerts', icon: AlertTriangle, path: '/anomaly-alerts' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Industry Insights', icon: Lightbulb, path: '/industry-insights' },
      { label: 'Stores', icon: Store, path: '/stores', appKey: 'stores' },
      { label: 'Online Store', icon: Globe, path: '/online-store', appKey: 'online-store' },
      { label: 'Doc Scanner', icon: ScanLine, path: '/documents', appKey: 'doc-scanner' },
      { label: 'Reports', icon: BarChart3, path: '/reports', appKey: 'reports' },
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
  const { isInstalled } = useTenantApps();

  // Listen for TopBar hamburger event
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', handler);
    return () => window.removeEventListener('open-mobile-sidebar', handler);
  }, []);

  const filteredNavSections = useMemo(() => {
    const isVisibleByModule = (item: NavItem) => {
      if (item.appKey) return isInstalled(item.appKey);
      if (item.module) {
        const appKey = MODULE_TO_APP_KEY[item.module] ?? item.module;
        return isInstalled(appKey);
      }
      return true;
    };

    return navSections
      .filter(section => {
        if (section.appKey) return isInstalled(section.appKey);
        return true;
      })
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (item.path === '/reseller' && role !== 'reseller') return false;
          return isVisibleByModule(item);
        }),
      }))
      .filter(section => section.items.length > 0);
  }, [isInstalled, role]);

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
    if (diff > 60) {
      setMobileOpen(false);
    }
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
  }, []);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  /* ─── Nav Item (desktop & mobile drawer) ─── */
  const NavItemComponent = ({ item, isMobileDrawer }: { item: NavItem; isMobileDrawer?: boolean }) => {
    const active = isActive(item.path);
    const height = isMobileDrawer ? 'h-11' : 'h-9';
    const padding = isMobileDrawer ? 'px-4 gap-3' : 'px-3 gap-3';
    const iconSize = isMobileDrawer ? 'w-5 h-5' : 'w-4 h-4';
    const textSize = isMobileDrawer ? 'text-sm' : 'text-[13px]';

    const linkContent = (
      <Link
        to={item.path}
        onClick={() => { setMobileOpen(false); setMoreOpen(false); }}
        className={cn(
          'relative flex items-center rounded-lg transition-colors duration-100 select-none touch-manipulation',
          height, padding, textSize,
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon className={cn('shrink-0', iconSize)} />
        {(!collapsed || isMobileDrawer) && (
          <span className="whitespace-nowrap overflow-hidden flex-1 leading-none">
            {item.label}
          </span>
        )}
        {(!collapsed || isMobileDrawer) && item.badge !== undefined && item.badge > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none bg-destructive text-destructive-foreground">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );

    // Show tooltip when collapsed on desktop (not in mobile drawer)
    if (collapsed && !isMobileDrawer) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="text-sm">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  /* ─── Build sidebar inner content ─── */
  const buildSidebarContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0 bg-sidebar">
        <img
          src={telaLogo}
          alt="TELA ERP"
          className={cn(
            'shrink-0 object-contain transition-all duration-150',
            collapsed && !isMobileDrawer ? 'h-7 w-7' : 'h-8 w-auto max-w-[140px]'
          )}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden scrollbar-thin overscroll-contain">
        <TooltipProvider delayDuration={200}>
          {filteredNavSections.map(section => (
            <div key={section.title} className="mb-1">
              {(!collapsed || isMobileDrawer) && (
                <div className="px-3 mb-1 mt-4 first:mt-1">
                  <span className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && !isMobileDrawer && (
                <div className="my-2 mx-2 border-t border-sidebar-border" />
              )}
              <div className="space-y-[2px]">
                {section.items.map(item => (
                  <NavItemComponent key={item.path} item={item} isMobileDrawer={isMobileDrawer} />
                ))}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Footer: Apps, Settings, User, Sign out */}
      <div className="border-t border-sidebar-border p-2 shrink-0 space-y-[2px]">
        <TooltipProvider delayDuration={200}>
          {/* Apps */}
          <NavItemComponent
            item={{ label: 'Apps', icon: Grid3X3, path: '/apps' }}
            isMobileDrawer={isMobileDrawer}
          />
          {/* Settings */}
          <NavItemComponent
            item={{ label: 'Settings', icon: Settings, path: '/settings' }}
            isMobileDrawer={isMobileDrawer}
          />
        </TooltipProvider>

        {/* User profile */}
        <Link to="/profile" onClick={() => setMobileOpen(false)}>
          <div className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer touch-manipulation',
            collapsed && !isMobileDrawer ? 'justify-center' : ''
          )}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            {(!collapsed || isMobileDrawer) && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-sidebar-accent-foreground truncate leading-tight">{profile?.full_name ?? 'User'}</p>
                <p className="text-[10px] text-sidebar-muted capitalize leading-tight">{role ?? 'user'}</p>
              </div>
            )}
          </div>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] w-full transition-colors text-sidebar-muted hover:bg-destructive/10 hover:text-destructive touch-manipulation',
            collapsed && !isMobileDrawer ? 'justify-center' : ''
          )}
          title={collapsed && !isMobileDrawer ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobileDrawer) && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      {!isMobileDrawer && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay drawer with swipe-to-close */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              ref={drawerRef}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0, 0.25, 1] }}
              className="w-[280px] h-full bg-sidebar flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors touch-manipulation z-10"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              {buildSidebarContent(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex fixed left-0 top-0 h-screen bg-sidebar flex-col border-r border-sidebar-border z-50 overflow-hidden transition-all duration-200 ease-out',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {buildSidebarContent(false)}
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border flex items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {mobileBottomNav.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-14 touch-manipulation relative',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-b-full bg-primary" />
              )}
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 h-14 touch-manipulation relative',
            mobileOpen ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">More</span>
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
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
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
