import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  ArrowRightLeft, Factory, Users, Globe, Megaphone,
  UserCircle, FolderKanban, Calculator, BarChart3, CreditCard,
  Settings, Palette, Building2, LogOut, ChevronLeft, ChevronRight,
  Menu, X, Briefcase, Star, Brain, ScanLine, Receipt,
  PieChart, Building, Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: any;
  path: string;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    title: 'AI Intelligence',
    items: [
      { label: 'AI CFO Assistant', icon: Brain, path: '/ai-cfo' },
      { label: 'Document Scanner', icon: ScanLine, path: '/documents' },
    ],
    collapsible: true,
  },
  {
    title: 'Operations',
    items: [
      { label: 'Sales', icon: ShoppingCart, path: '/sales' },
      { label: 'Invoices', icon: FileText, path: '/invoices' },
      { label: 'Procurement', icon: Truck, path: '/procurement' },
      { label: 'Inventory', icon: Package, path: '/inventory' },
      { label: 'Stock Transfers', icon: ArrowRightLeft, path: '/transfers' },
      { label: 'Production', icon: Factory, path: '/production' },
      { label: 'Automations', icon: Zap, path: '/automations' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'CRM', icon: UserCircle, path: '/crm' },
      { label: 'Online Store', icon: Globe, path: '/online-store' },
      { label: 'Marketing', icon: Megaphone, path: '/marketing' },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'HR & Payroll', icon: Briefcase, path: '/hr' },
      { label: 'Projects', icon: FolderKanban, path: '/projects' },
      { label: 'Team', icon: Users, path: '/settings/team' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Accounting', icon: Calculator, path: '/accounting' },
      { label: 'Fixed Assets', icon: Building, path: '/assets' },
      { label: 'Expenses', icon: Receipt, path: '/expenses' },
      { label: 'Budgets', icon: PieChart, path: '/budgets' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
      { label: 'Billing', icon: CreditCard, path: '/billing' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Stores', icon: Building2, path: '/stores' },
      { label: 'Settings', icon: Settings, path: '/settings' },
      { label: 'White Label', icon: Palette, path: '/settings/white-label' },
      { label: 'Reseller Portal', icon: Star, path: '/reseller' },
    ],
  },
];

const mobileBottomNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Sales', icon: ShoppingCart, path: '/sales' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'CRM', icon: UserCircle, path: '/crm' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, tenant, role, signOut } = useAuth();

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-100 group select-none',
          active
            ? 'bg-white/8 text-white font-medium'
            : 'text-white/55 hover:bg-white/6 hover:text-white/85'
        )}
        title={collapsed ? item.label : undefined}
      >
        {/* Left accent bar for active item — no animation, pure CSS */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-r-full bg-primary" />
        )}
        <item.icon className={cn(
          'w-[18px] h-[18px] shrink-0 transition-colors duration-100',
          active ? 'text-primary' : 'text-white/40 group-hover:text-white/70'
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
      <div className="flex items-center gap-3 px-4 h-[57px] border-b border-white/8 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <h1 className="text-white font-bold text-sm tracking-tight whitespace-nowrap leading-tight">
                {tenant?.name ?? 'TELA ERP'}
              </h1>
              <p className="text-[10px] text-white/35 whitespace-nowrap leading-none mt-0.5">Enterprise Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {navSections.map(section => {
          if (section.title === 'Admin' && role !== 'admin' && role !== 'reseller') return null;
          const isSectionCollapsed = collapsedSections.has(section.title);

          return (
            <div key={section.title} className="mb-2">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    onClick={() => section.collapsible && toggleSection(section.title)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 mb-1 py-0.5',
                      section.collapsible && 'cursor-pointer hover:text-white/60 transition-colors'
                    )}
                  >
                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.08em]">
                      {section.title}
                    </span>
                    {section.collapsible && (
                      <ChevronRight className={cn(
                        'w-3 h-3 text-white/30 transition-transform duration-150',
                        !isSectionCollapsed && 'rotate-90'
                      )} />
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {!isSectionCollapsed && (
                  <motion.div
                    initial={section.collapsible ? { height: 0, opacity: 0 } : false}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="space-y-0.5 overflow-hidden"
                  >
                    {section.items.map(item => {
                      if (item.path === '/reseller' && role !== 'reseller') return null;
                      return <NavItemComponent key={item.path} item={item} />;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/8 p-3 shrink-0 space-y-1">
        <Link to="/profile" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/6 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-sm">
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
                  <p className="text-sm font-medium text-white/85 truncate leading-tight">{profile?.full_name ?? 'User'}</p>
                  <p className="text-[11px] text-white/35 capitalize leading-tight">{role ?? 'user'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors text-white/40 hover:bg-red-500/10 hover:text-red-400"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-sidebar border border-white/10 flex items-center justify-center text-white/70 shadow-lg hover:bg-white/8 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
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
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0, 0.25, 1] }}
              className="w-[260px] h-full bg-sidebar flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3.5 right-3 text-white/40 hover:text-white/70 transition-colors"
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
        className="hidden md:flex fixed left-0 top-0 h-screen bg-sidebar flex-col border-r border-white/8 z-50 overflow-hidden shadow-xl shadow-black/20"
      >
        {sidebarContent}
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[57px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-white/8 flex items-center justify-around px-1 py-1 safe-area-pb shadow-lg shadow-black/20">
        {mobileBottomNav.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors min-w-[52px]',
                active ? 'text-primary bg-primary/10' : 'text-white/40 hover:text-white/70'
              )}
            >
              <item.icon className={cn('w-5 h-5', active && 'text-primary')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
