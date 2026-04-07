import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart3, ShoppingCart, Package, Zap, Users, Briefcase,
  Settings, HelpCircle, Search, ChevronDown, Home, FileText,
  TrendingUp, Brain, DollarSign, Truck, Cog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavModule {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
}

const modules: NavModule[] = [
  {
    label: 'Core',
    icon: <Home className="w-4 h-4" />,
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <BarChart3 className="w-4 h-4" />, description: 'Business overview' },
      { label: 'Reports', path: '/reports', icon: <FileText className="w-4 h-4" />, description: 'Analytics & insights' },
    ],
  },
  {
    label: 'Sales',
    icon: <ShoppingCart className="w-4 h-4" />,
    items: [
      { label: 'Sales Orders', path: '/sales', icon: <ShoppingCart className="w-4 h-4" />, description: 'Manage orders' },
      { label: 'Invoices', path: '/invoices', icon: <FileText className="w-4 h-4" />, description: 'Billing & invoicing' },
      { label: 'Customers', path: '/customers', icon: <Users className="w-4 h-4" />, description: 'Customer database' },
      { label: 'CRM', path: '/crm', icon: <TrendingUp className="w-4 h-4" />, description: 'Lead & opportunity management' },
    ],
  },
  {
    label: 'Operations',
    icon: <Package className="w-4 h-4" />,
    items: [
      { label: 'Inventory', path: '/inventory', icon: <Package className="w-4 h-4" />, description: 'Stock management' },
      { label: 'Production', path: '/production', icon: <Zap className="w-4 h-4" />, description: 'Manufacturing orders' },
      { label: 'Procurement', path: '/procurement', icon: <Truck className="w-4 h-4" />, description: 'Supplier & purchasing' },
      { label: 'Stock Transfers', path: '/transfers', icon: <Truck className="w-4 h-4" />, description: 'Warehouse transfers' },
    ],
  },
  {
    label: 'Finance',
    icon: <DollarSign className="w-4 h-4" />,
    items: [
      { label: 'Accounting', path: '/accounting', icon: <DollarSign className="w-4 h-4" />, description: 'Double-entry accounting' },
      { label: 'Vouchers', path: '/accounting/vouchers', icon: <FileText className="w-4 h-4" />, description: 'Journal entries' },
      { label: 'Expenses', path: '/expenses', icon: <TrendingUp className="w-4 h-4" />, description: 'Expense tracking' },
      { label: 'Budgets', path: '/budgets', icon: <BarChart3 className="w-4 h-4" />, description: 'Budget planning' },
    ],
  },
  {
    label: 'People',
    icon: <Users className="w-4 h-4" />,
    items: [
      { label: 'HR', path: '/hr', icon: <Users className="w-4 h-4" />, description: 'Human resources' },
      { label: 'Team', path: '/settings/team', icon: <Users className="w-4 h-4" />, description: 'Team management' },
    ],
  },
  {
    label: 'Tools',
    icon: <Cog className="w-4 h-4" />,
    items: [
      { label: 'AI CFO', path: '/ai-cfo', icon: <Brain className="w-4 h-4" />, description: 'AI insights' },
      { label: 'Projects', path: '/projects', icon: <Briefcase className="w-4 h-4" />, description: 'Project management' },
      { label: 'Automations', path: '/automations', icon: <Zap className="w-4 h-4" />, description: 'Workflow automation' },
      { label: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" />, description: 'App settings' },
    ],
  },
];

export function ImprovedNavigation() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all items for search
  const allItems = modules.flatMap(m => m.items);
  const filteredItems = searchQuery
    ? allItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <div className="w-full bg-white dark:bg-slate-950 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search modules and features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && filteredItems.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50">
              {filteredItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => setSearchQuery('')}
                >
                  {item.icon}
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Module Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {modules.map((module) => (
            <DropdownMenu key={module.label}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <span className="flex items-center gap-2">
                    {module.icon}
                    {module.label}
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{module.label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {module.items.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center gap-2 cursor-pointer">
                      {item.icon}
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>
    </div>
  );
}
