import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Menu, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarContent } from './Sidebar';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationCenter';

// Route → breadcrumb label map
const ROUTE_LABELS: Record<string, string[]> = {
  '/':                                ['Dashboard'],
  '/finance/accounts':                ['Finance', 'Accounts'],
  '/finance/invoices':                ['Finance', 'Invoices'],
  '/finance/bills':                   ['Finance', 'Bills'],
  '/finance/payments':                ['Finance', 'Payments'],
  '/finance/reports':                 ['Finance', 'Reports'],
  '/finance/journal-entries':        ['Finance', 'Journal Entries'],
  '/finance/journal-entries/new':    ['Finance', 'Journal Entries', 'New Entry'],
  '/sales/leads':                     ['Sales & CRM', 'Leads'],
  '/sales/customers':                 ['Sales & CRM', 'Customers'],
  '/sales/quotes':                    ['Sales & CRM', 'Quotes'],
  '/sales/orders':                    ['Sales & CRM', 'Orders'],
  '/procurement/vendors':             ['Procurement', 'Vendors'],
  '/procurement/purchase-orders':     ['Procurement', 'Purchase Orders'],
  '/procurement/goods-receipt':       ['Procurement', 'Goods Receipt'],
  '/inventory/products':              ['Inventory', 'Products'],
  '/inventory/warehouses':            ['Inventory', 'Warehouses'],
  '/inventory/stock':                 ['Inventory', 'Stock'],
  '/inventory/adjustments':           ['Inventory', 'Adjustments'],
  '/hr/employees':                    ['HR & Payroll', 'Employees'],
  '/hr/payroll':                      ['HR & Payroll', 'Payroll'],
  '/hr/leave':                        ['HR & Payroll', 'Leave'],
  '/hr/recruitment':                  ['HR & Payroll', 'Recruitment'],
  '/manufacturing/products':          ['Manufacturing', 'Products'],
  '/manufacturing/boms':              ['Manufacturing', 'BOMs'],
  '/manufacturing/production-orders': ['Manufacturing', 'Production Orders'],
  '/projects/projects':               ['Projects', 'Projects'],
  '/projects/tasks':                  ['Projects', 'Tasks'],
  '/projects/timesheets':             ['Projects', 'Timesheets'],
  '/assets/register':                 ['Assets', 'Asset Register'],
  '/assets/depreciation':             ['Assets', 'Depreciation'],
  '/reports':                         ['Reports'],
  '/settings':                        ['Settings'],
  '/components/demo':                 ['Components'],
};

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const email = user?.email ?? '';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // Global ⌘K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const crumbs = ROUTE_LABELS[location.pathname] ?? [title ?? 'Dashboard'];

  return (
    <>
      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Global search overlay */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4">
        {/* Mobile hamburger */}
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setMobileOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>

        {/* Desktop collapse toggle */}
        <Button
          variant="ghost" size="icon" className="hidden md:flex shrink-0"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium min-w-0">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <span className={cn(i === crumbs.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Mobile title */}
        <span className="sm:hidden font-semibold text-sm text-foreground truncate">
          {crumbs[crumbs.length - 1]}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search trigger — desktop */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 w-64 h-8 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] font-mono border border-border rounded px-1 py-0.5 bg-background/50">⌘K</kbd>
        </button>

        {/* Search icon — mobile */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)}>
          <Search className="w-5 h-5" />
        </Button>

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Notification bell (replaces old DropdownMenu-based bell) */}
        <NotificationBell />

        {/* User avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="w-4 h-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={handleSignOut}>
              <LogOut className="w-4 h-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  );
}
