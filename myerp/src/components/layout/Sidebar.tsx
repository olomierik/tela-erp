import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart2, Handshake, Truck, Box, Users, Factory,
  ClipboardList, Building2, BarChart3, Settings, ChevronDown, ChevronRight,
  Boxes, Layers, Receipt, HeadphonesIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Navigation tree ────────────────────────────────────────────────────────

type NavChild = { label: string; path: string };
type NavItem =
  | { label: string; icon: any; path: string; children?: undefined }
  | { label: string; icon: any; path?: undefined; children: NavChild[] };

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Finance', icon: BarChart2, children: [
      { label: 'Accounts',        path: '/finance/accounts' },
      { label: 'Journal Entries', path: '/finance/journal-entries' },
      { label: 'Invoices',        path: '/finance/invoices' },
      { label: 'Bills',           path: '/finance/bills' },
      { label: 'Payments',        path: '/finance/payments' },
      { label: 'Budgets',         path: '/finance/budgets' },
      { label: 'Tax Rates',       path: '/finance/tax-rates' },
      { label: 'Aging Report',    path: '/finance/reports/aging' },
      { label: 'Reports',         path: '/finance/reports' },
    ],
  },
  {
    label: 'Sales & CRM', icon: Handshake, children: [
      { label: 'Leads',     path: '/sales/leads' },
      { label: 'Customers', path: '/sales/customers' },
      { label: 'Quotes',    path: '/sales/quotes' },
      { label: 'Orders',    path: '/sales/orders' },
    ],
  },
  {
    label: 'Procurement', icon: Truck, children: [
      { label: 'Vendors',         path: '/procurement/vendors' },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders' },
      { label: 'Goods Receipt',   path: '/procurement/goods-receipt' },
    ],
  },
  {
    label: 'Inventory', icon: Box, children: [
      { label: 'Products',       path: '/inventory/products' },
      { label: 'Warehouses',     path: '/inventory/warehouses' },
      { label: 'Stock',          path: '/inventory/stock' },
      { label: 'Transfers',      path: '/inventory/transfers' },
      { label: 'Adjustments',    path: '/inventory/adjustments' },
      { label: 'Reorder Rules',  path: '/inventory/reorder-rules' },
    ],
  },
  {
    label: 'HR & Payroll', icon: Users, children: [
      { label: 'Employees',   path: '/hr/employees' },
      { label: 'Contracts',   path: '/hr/contracts' },
      { label: 'Attendance',  path: '/hr/attendance' },
      { label: 'Payroll',     path: '/hr/payroll' },
      { label: 'Leave',       path: '/hr/leave' },
      { label: 'Recruitment', path: '/hr/recruitment' },
    ],
  },
  {
    label: 'Manufacturing', icon: Factory, children: [
      { label: 'Products',          path: '/manufacturing/products' },
      { label: 'BOMs',              path: '/manufacturing/boms' },
      { label: 'Production Orders', path: '/manufacturing/production-orders' },
      { label: 'Work Centers',      path: '/manufacturing/work-centers' },
      { label: 'Quality Checks',    path: '/manufacturing/quality' },
    ],
  },
  {
    label: 'Projects', icon: ClipboardList, children: [
      { label: 'Projects',   path: '/projects/projects' },
      { label: 'Tasks',      path: '/projects/tasks' },
      { label: 'Timesheets', path: '/projects/timesheets' },
    ],
  },
  {
    label: 'Assets', icon: Building2, children: [
      { label: 'Asset Register', path: '/assets/register' },
      { label: 'Depreciation',   path: '/assets/depreciation' },
    ],
  },
  { label: 'Expenses',   icon: Receipt,         path: '/expenses' },
  { label: 'Helpdesk',   icon: HeadphonesIcon,  path: '/helpdesk' },
  { label: 'Reports',    icon: BarChart3,        path: '/reports' },
  { label: 'Settings',   icon: Settings,         path: '/settings' },
  { label: 'Components', icon: Layers,           path: '/components/demo' },
];

// ─── SectionItem (collapsible group) ────────────────────────────────────────

function SectionItem({ item }: { item: NavItem & { children: NavChild[] } }) {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const isAnyChildActive = item.children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));
  const [open, setOpen] = useState(isAnyChildActive);

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('sidebar-item', isAnyChildActive && 'active')}>
              <item.icon className="w-5 h-5 shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn('sidebar-item w-full', isAnyChildActive && 'active')}>
          <item.icon className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open
            ? <ChevronDown className="w-4 h-4 shrink-0 text-sidebar-muted" />
            : <ChevronRight className="w-4 h-4 shrink-0 text-sidebar-muted" />
          }
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-0.5 ml-3 pl-4 border-l border-sidebar-border space-y-0.5 pb-1">
          {item.children.map(child => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) => cn(
                'block px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'text-sidebar-primary bg-sidebar-accent'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60',
              )}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── LeafItem (single route) ─────────────────────────────────────────────────

function LeafItem({ item }: { item: NavItem & { path: string } }) {
  const { collapsed } = useSidebar();

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.path}
              className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
            >
              <item.icon className="w-5 h-5 shrink-0" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

// ─── Sidebar inner content ───────────────────────────────────────────────────

export function SidebarContent() {
  const { collapsed } = useSidebar();
  const { profile, user } = useAuth();

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const companyName = profile?.company_name ?? 'myERP';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-sidebar-background text-sidebar-foreground">
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border shrink-0', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Boxes className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        {!collapsed && (
          <span className="font-bold text-base text-sidebar-accent-foreground tracking-tight">myERP</span>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
          {NAV.map(item =>
            item.children
              ? <SectionItem key={item.label} item={item as any} />
              : <LeafItem key={item.label} item={item as any} />,
          )}
        </nav>
      </ScrollArea>

      {/* User footer */}
      <div className={cn('border-t border-sidebar-border p-3 shrink-0', collapsed && 'p-2')}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary mx-auto">
            {initials}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-sidebar-muted truncate">{companyName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────

export default function Sidebar() {
  const { collapsed } = useSidebar();
  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-30 transition-all duration-200 hidden md:block',
      collapsed ? 'w-16' : 'w-60',
    )}>
      <SidebarContent />
    </aside>
  );
}
