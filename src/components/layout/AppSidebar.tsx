import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  Factory, Users, Globe, Megaphone, ArrowRightLeft,
  UserCircle, FolderKanban, Calculator, BarChart3,
  Settings, Building2, LogOut, ChevronLeft, ChevronRight,
  Menu, X, Briefcase, Brain, Receipt, Store,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
}

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'AI Assistant', icon: Brain, path: '/ai-cfo' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Sales', icon: ShoppingCart, path: '/sales' },
      { label: 'Invoices', icon: FileText, path: '/invoices' },
      { label: 'Procurement', icon: Truck, path: '/procurement' },
      { label: 'Inventory', icon: Package, path: '/inventory' },
      { label: 'Transfers', icon: ArrowRightLeft, path: '/transfers' },
      { label: 'Production', icon: Factory, path: '/production' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'CRM', icon: UserCircle, path: '/crm' },
      { label: 'Store', icon: Globe, path: '/online-store' },
      { label: 'Marketing', icon: Megaphone, path: '/marketing' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'HR & Payroll', icon: Briefcase, path: '/hr' },
      { label: 'Projects', icon: FolderKanban, path: '/projects' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Accounting', icon: Calculator, path: '/accounting' },
      { label: 'Expenses', icon: Receipt, path: '/expenses' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
    ],
  },
];

const mobileBottomNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Sales', icon: ShoppingCart, path: '/sales' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'CRM', icon: UserCircle, path: '/crm' },
];

export default function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, tenant, role, signOut } = useAuth();

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
          'relative flex items-center gap-3 px-3 py-[7px] rounded-lg text-[16px] transition-colors duration-100 group select-none',
          active
            ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )}
        title={collapsed ? item.label : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon className={cn(
          'w-[17px] h-[17px] shrink-0 transition-colors duration-100',
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
      <div className="flex items-center gap-3 px-4 h-[52px] border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(172,66%,40%)] to-[hsl(172,66%,30%)] flex items-center justify-center shrink-0 shadow-lg shadow-[hsl(172,66%,40%)/0.25]">
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
              <h1 className="text-sidebar-accent-foreground font-bold text-sm tracking-tight whitespace-nowrap leading-tight text-slate-800">
                {tenant?.name ?? 'TELA ERP'}
              </h1>
              <p className="text-[10px] text-sidebar-muted whitespace-nowrap leading-none mt-0.5">Enterprise Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {navSections.map(section => (
          <div key={section.title} className="mb-1.5">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="px-3 mb-0.5 py-0.5"
                >
                  <span className="text-[10px] font-semibold text-sidebar-muted/60 uppercase tracking-[0.1em]">
                    {section.title}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-[1px]">
              {section.items.map(item => (
                <NavItemComponent key={item.path} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + User footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0 space-y-[1px]">
        <Link
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-[7px] rounded-lg text-[16px] transition-colors duration-100 group select-none',
            isActive('/settings')
              ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className={cn(
            'w-[17px] h-[17px] shrink-0',
            isActive('/settings') ? 'text-sidebar-primary' : 'text-sidebar-muted'
          )} />
          {!collapsed && <span>Settings</span>}
        </Link>

        <Link to="/profile" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(172,66%,40%)] to-[hsl(172,66%,30%)] flex items-center justify-center shrink-0 text-xs font-bold text-white">
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
                  <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate leading-tight">{profile?.full_name ?? 'User'}</p>
                  <p className="text-[10px] text-sidebar-muted capitalize leading-tight">{role ?? 'user'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-[7px] rounded-lg text-[16px] w-full transition-colors text-sidebar-muted hover:bg-destructive/10 hover:text-destructive"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-[17px] h-[17px] shrink-0" />
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
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-sidebar-background border border-sidebar-border flex items-center justify-center text-sidebar-foreground shadow-lg hover:bg-sidebar-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay drawer */}
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
              className="w-[260px] h-full bg-sidebar-background flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3.5 right-3 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
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
        animate={{ width: collapsed ? 64 : 230 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-sidebar-background flex-col border-r border-sidebar-border z-50 overflow-hidden shadow-lg shadow-black/5"
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[52px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar-background border-t border-sidebar-border flex items-center justify-around px-1 py-1 safe-area-pb shadow-lg shadow-black/20">
        {mobileBottomNav.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors min-w-[52px]',
                active ? 'text-sidebar-primary bg-sidebar-accent' : 'text-sidebar-muted hover:text-sidebar-foreground'
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
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors min-w-[52px]',
            moreOpen ? 'text-sidebar-primary bg-sidebar-accent' : 'text-sidebar-muted hover:text-sidebar-foreground'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl bg-background border-border p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="text-base font-semibold">All Modules</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-full pb-20 px-4 pt-3">
            {navSections.map(section => (
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
                          'flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-medium text-center transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/60 text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="leading-tight">{item.label}</span>
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
