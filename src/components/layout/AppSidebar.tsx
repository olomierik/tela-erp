import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Factory, Package, ShoppingCart, Megaphone,
  Calculator, Truck, Settings, Users, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, Building2, CreditCard, Palette,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Production', icon: Factory, path: '/production' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Sales', icon: ShoppingCart, path: '/sales' },
  { label: 'Marketing', icon: Megaphone, path: '/marketing' },
  { label: 'Accounting', icon: Calculator, path: '/accounting' },
  { label: 'Procurement', icon: Truck, path: '/procurement' },
];

const settingsItems = [
  { label: 'Team', icon: Users, path: '/settings/team' },
  { label: 'Billing', icon: CreditCard, path: '/settings/billing' },
  { label: 'White Label', icon: Palette, path: '/settings/white-label' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, tenant } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen gradient-sidebar flex flex-col border-r border-sidebar-border z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-sidebar-accent-foreground font-bold text-lg tracking-tight whitespace-nowrap">
                {tenant?.name || 'TELA-ERP'}
              </h1>
              <p className="text-xs text-sidebar-foreground capitalize">
                {tenant?.subscription_tier || 'Pro'} Plan
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <p className={cn("text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2", collapsed ? "px-2" : "px-3")}>
          {collapsed ? '—' : 'Modules'}
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-sm")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        <div className="my-4 border-t border-sidebar-border" />
        
        <p className={cn("text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2", collapsed ? "px-2" : "px-3")}>
          {collapsed ? '—' : 'Admin'}
        </p>
        {settingsItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 text-sm font-semibold text-sidebar-accent-foreground">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{profile?.full_name}</p>
              <p className="text-xs text-sidebar-foreground truncate capitalize">{role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </motion.aside>
  );
}
