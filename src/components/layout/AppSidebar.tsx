import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Factory,
  Calculator, BarChart3, Bot, Settings, LogOut, ChevronLeft,
  ChevronRight, Building2, CreditCard, Palette, Rocket, Users, Menu, X,
  FileBarChart, Megaphone, ArrowRightLeft, UserCheck, Warehouse, Globe,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const mainNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Sales / POS', icon: ShoppingCart, path: '/sales' },
  { label: 'Purchases', icon: Truck, path: '/procurement' },
  { label: 'Production', icon: Factory, path: '/production' },
  { label: 'Customers', icon: UserCheck, path: '/customers' },
  { label: 'Suppliers', icon: Warehouse, path: '/suppliers' },
  { label: 'Transfers', icon: ArrowRightLeft, path: '/transfers' },
  { label: 'Marketing', icon: Megaphone, path: '/marketing' },
  { label: 'Accounting', icon: Calculator, path: '/accounting' },
  { label: 'Reports', icon: FileBarChart, path: '/reports' },
  { label: 'Stores', icon: Building2, path: '/stores' },
];

const bottomNav = [
  { label: 'Team', icon: Users, path: '/settings/team' },
  { label: 'Billing', icon: CreditCard, path: '/settings/billing' },
  { label: 'White Label', icon: Palette, path: '/settings/white-label' },
  { label: 'Readiness', icon: Rocket, path: '/settings/readiness' },
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

  const NavItem = ({ item, isSettings = false }: { item: typeof mainNav[0]; isSettings?: boolean }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative text-sm",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-glow"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "drop-shadow-sm")} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-sidebar-accent-foreground font-bold text-base tracking-tight whitespace-nowrap">
                {tenant?.name || 'TELA-ERP'}
              </h1>
              <p className="text-[11px] text-sidebar-foreground capitalize leading-none">
                {tenant?.subscription_tier || 'Pro'} Plan
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <p className={cn("text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-1.5", collapsed ? "px-2" : "px-3")}>
          {collapsed ? '—' : 'Modules'}
        </p>
        {mainNav.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        {/* Reseller */}
        {role === 'reseller' && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <p className={cn("text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-1.5", collapsed ? "px-2" : "px-3")}>
              {collapsed ? '—' : 'Reseller'}
            </p>
            <NavItem item={{ label: 'Client Tenants', icon: Building2, path: '/reseller' }} />
          </>
        )}

        <div className="my-3 border-t border-sidebar-border" />
        <p className={cn("text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-1.5", collapsed ? "px-2" : "px-3")}>
          {collapsed ? '—' : 'Admin'}
        </p>
        {bottomNav.map((item) => (
          <NavItem key={item.path} item={item} isSettings />
        ))}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-sidebar-border p-3 shrink-0 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 text-xs font-semibold text-sidebar-accent-foreground">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{profile?.full_name}</p>
              <p className="text-[11px] text-sidebar-foreground truncate capitalize">{role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors",
            "text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-foreground shadow-sm"
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
            className="md:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-[260px] h-full gradient-sidebar flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 text-sidebar-foreground hover:text-sidebar-accent-foreground"
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
        className="hidden md:flex fixed left-0 top-0 h-screen gradient-sidebar flex-col border-r border-sidebar-border z-50"
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>
    </>
  );
}
