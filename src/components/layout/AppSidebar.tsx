import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  ArrowRightLeft, Factory, Users, Globe, Megaphone,
  UserCircle, FolderKanban, Calculator, BarChart3, CreditCard,
  Settings, Palette, Building2, LogOut, ChevronLeft, ChevronRight,
  Menu, X, Briefcase, Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: any;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ],
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
      { label: 'Reports', icon: BarChart3, path: '/reports' },
      { label: 'Billing', icon: CreditCard, path: '/billing' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Settings', icon: Settings, path: '/settings' },
      { label: 'White Label', icon: Palette, path: '/settings/white-label' },
      { label: 'Reseller Portal', icon: Star, path: '/reseller' },
    ],
  },
];

// Mobile bottom nav (most important items)
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
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, tenant, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm group',
          active
            ? 'bg-indigo-600 text-white font-medium shadow-sm'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Tenant */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-700/50 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-white font-bold text-sm tracking-tight whitespace-nowrap leading-tight">
                {tenant?.name || 'TELA-ERP'}
              </h1>
              <p className="text-[10px] text-slate-400 whitespace-nowrap leading-none">
                Business Management
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0">
        {navSections.map((section) => {
          // Hide reseller section for non-resellers
          if (section.title === 'Admin' && role !== 'admin' && role !== 'reseller') return null;
          return (
            <div key={section.title} className="mb-4">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"
                  >
                    {section.title}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // Only show reseller portal for resellers
                  if (item.path === '/reseller' && role !== 'reseller') return null;
                  return <NavItemComponent key={item.path} item={item} />;
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-700/50 p-3 shrink-0 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-400">
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
                <p className="text-[11px] text-slate-400 capitalize">{role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-lg"
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
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-[260px] h-full bg-slate-900 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3.5 right-3 text-slate-400 hover:text-white"
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
        className="hidden md:flex fixed left-0 top-0 h-screen bg-slate-900 flex-col border-r border-slate-700/50 z-50 overflow-hidden"
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shadow-sm z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700/50 flex items-center justify-around px-2 py-1.5 safe-area-pb">
        {mobileBottomNav.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-colors',
                active ? 'text-indigo-400' : 'text-slate-500'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
