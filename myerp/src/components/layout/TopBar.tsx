import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Bell, Sun, Moon, Menu, User, Settings, LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarContent } from './Sidebar';

// Route → breadcrumb label map
const ROUTE_LABELS: Record<string, string[]> = {
  '/':                               ['Dashboard'],
  '/finance/accounts':               ['Finance', 'Accounts'],
  '/finance/invoices':               ['Finance', 'Invoices'],
  '/finance/bills':                  ['Finance', 'Bills'],
  '/finance/payments':               ['Finance', 'Payments'],
  '/finance/reports':                ['Finance', 'Reports'],
  '/sales/leads':                    ['Sales & CRM', 'Leads'],
  '/sales/customers':                ['Sales & CRM', 'Customers'],
  '/sales/quotes':                   ['Sales & CRM', 'Quotes'],
  '/sales/orders':                   ['Sales & CRM', 'Orders'],
  '/procurement/vendors':            ['Procurement', 'Vendors'],
  '/procurement/purchase-orders':    ['Procurement', 'Purchase Orders'],
  '/procurement/goods-receipt':      ['Procurement', 'Goods Receipt'],
  '/inventory/products':             ['Inventory', 'Products'],
  '/inventory/warehouses':           ['Inventory', 'Warehouses'],
  '/inventory/stock':                ['Inventory', 'Stock'],
  '/inventory/adjustments':          ['Inventory', 'Adjustments'],
  '/hr/employees':                   ['HR & Payroll', 'Employees'],
  '/hr/payroll':                     ['HR & Payroll', 'Payroll'],
  '/hr/leave':                       ['HR & Payroll', 'Leave'],
  '/hr/recruitment':                 ['HR & Payroll', 'Recruitment'],
  '/manufacturing/products':         ['Manufacturing', 'Products'],
  '/manufacturing/boms':             ['Manufacturing', 'BOMs'],
  '/manufacturing/production-orders':['Manufacturing', 'Production Orders'],
  '/projects/projects':              ['Projects', 'Projects'],
  '/projects/tasks':                 ['Projects', 'Tasks'],
  '/projects/timesheets':            ['Projects', 'Timesheets'],
  '/assets/register':                ['Assets', 'Asset Register'],
  '/assets/depreciation':            ['Assets', 'Depreciation'],
  '/reports':                        ['Reports'],
  '/settings':                       ['Settings'],
};

// Mock notifications
const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Invoice #INV-0042 overdue', time: '5m ago', read: false },
  { id: 2, title: 'New purchase order approved', time: '1h ago', read: false },
  { id: 3, title: 'Payroll run completed', time: '3h ago', read: false },
  { id: 4, title: 'Low stock alert: SKU-1029', time: 'Yesterday', read: true },
];

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');

  const crumbs = ROUTE_LABELS[location.pathname] ?? [title ?? 'Dashboard'];
  const unread = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <>
      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex shrink-0"
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
              <span className={cn(
                i === crumbs.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground',
              )}>
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

        {/* Search — desktop */}
        <div className="hidden md:flex items-center relative w-64">
          <Search className="absolute left-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
          <kbd className="absolute right-2.5 text-[10px] text-muted-foreground font-mono bg-background border border-border rounded px-1 py-0.5">
            ⌘K
          </kbd>
        </div>

        {/* Search icon — mobile */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="w-5 h-5" />
        </Button>

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unread > 0 && <span className="text-[11px] text-primary font-normal">{unread} unread</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MOCK_NOTIFICATIONS.map(n => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 py-2.5 cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <span className={cn('text-sm flex-1', !n.read && 'font-medium')}>{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-3.5">{n.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary text-sm font-medium">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs font-semibold">JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-semibold text-sm">John Doe</p>
              <p className="text-xs text-muted-foreground font-normal">john.doe@myerp.com</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>
              <LogOut className="w-4 h-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  );
}
