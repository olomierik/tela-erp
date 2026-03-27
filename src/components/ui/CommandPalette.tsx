import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, ShoppingCart, FileText, Package, Truck,
  Factory, UserCircle, Briefcase, FolderKanban, Calculator, BarChart3,
  Users, Settings, ArrowRight, Clock, Zap, Brain, ScanLine, Building,
  Receipt, PieChart, Globe, Megaphone, ArrowRightLeft, Star, Palette,
  Plus, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'customer' | 'invoice' | 'product' | 'order' | 'deal';
  href: string;
}

interface NavItem {
  label: string;
  icon: any;
  path: string;
  section: string;
  keywords?: string;
}

const ALL_PAGES: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', section: 'Overview' },
  { label: 'Sales', icon: ShoppingCart, path: '/sales', section: 'Operations', keywords: 'orders revenue' },
  { label: 'Invoices', icon: FileText, path: '/invoices', section: 'Operations', keywords: 'billing payments' },
  { label: 'Procurement', icon: Truck, path: '/procurement', section: 'Operations', keywords: 'purchase orders suppliers' },
  { label: 'Inventory', icon: Package, path: '/inventory', section: 'Operations', keywords: 'stock products SKU' },
  { label: 'Stock Transfers', icon: ArrowRightLeft, path: '/transfers', section: 'Operations' },
  { label: 'Production', icon: Factory, path: '/production', section: 'Operations', keywords: 'manufacturing BOM' },
  { label: 'CRM', icon: UserCircle, path: '/crm', section: 'Customers', keywords: 'deals pipeline leads contacts' },
  { label: 'Online Store', icon: Globe, path: '/online-store', section: 'Customers', keywords: 'ecommerce storefront' },
  { label: 'Marketing', icon: Megaphone, path: '/marketing', section: 'Customers', keywords: 'campaigns leads' },
  { label: 'HR & Payroll', icon: Briefcase, path: '/hr', section: 'Workforce', keywords: 'employees attendance leave salary' },
  { label: 'Projects', icon: FolderKanban, path: '/projects', section: 'Workforce', keywords: 'tasks kanban time tracking' },
  { label: 'Team', icon: Users, path: '/settings/team', section: 'Workforce', keywords: 'users permissions roles stores' },
  { label: 'Accounting', icon: Calculator, path: '/accounting', section: 'Finance', keywords: 'transactions journal ledger' },
  { label: 'Reports', icon: BarChart3, path: '/reports', section: 'Finance', keywords: 'analytics charts P&L balance sheet' },
  { label: 'Fixed Assets', icon: Building, path: '/assets', section: 'Finance', keywords: 'depreciation equipment' },
  { label: 'Expenses', icon: Receipt, path: '/expenses', section: 'Finance', keywords: 'claims reimbursement receipts' },
  { label: 'Budgets', icon: PieChart, path: '/budgets', section: 'Finance', keywords: 'planning forecast variance' },
  { label: 'AI CFO Assistant', icon: Brain, path: '/ai-cfo', section: 'AI Intelligence', keywords: 'insights anomaly forecast' },
  { label: 'Document Scanner', icon: ScanLine, path: '/documents', section: 'AI Intelligence', keywords: 'OCR receipt invoice parser' },
  { label: 'Automations', icon: Zap, path: '/automations', section: 'Operations', keywords: 'workflows triggers rules' },
  { label: 'Stores', icon: Building, path: '/stores', section: 'Admin', keywords: 'locations branches' },
  { label: 'Settings', icon: Settings, path: '/settings', section: 'Admin' },
  { label: 'White Label', icon: Palette, path: '/settings/white-label', section: 'Admin', keywords: 'branding colors logo' },
  { label: 'Reseller Portal', icon: Star, path: '/reseller', section: 'Admin', keywords: 'clients tenants' },
];

const QUICK_ACTIONS = [
  { label: 'New Invoice', icon: Plus, path: '/invoices' },
  { label: 'New Sales Order', icon: Plus, path: '/sales' },
  { label: 'Add Product', icon: Plus, path: '/inventory' },
  { label: 'New Purchase Order', icon: Plus, path: '/procurement' },
  { label: 'New Customer', icon: Plus, path: '/crm' },
  { label: 'Record Expense', icon: Plus, path: '/expenses' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { tenant, isDemo } = useAuth();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const searchData = useCallback(async (q: string) => {
    if (!q.trim() || isDemo || !tenant?.id) { setResults([]); return; }
    setSearching(true);
    try {
      const [customers, invoices, products, orders] = await Promise.all([
        (supabase.from('customers') as any).select('id,name,email').eq('tenant_id', tenant.id).ilike('name', `%${q}%`).limit(3),
        (supabase.from('invoices') as any).select('id,invoice_number,customer_name').eq('tenant_id', tenant.id).ilike('invoice_number', `%${q}%`).limit(3),
        (supabase.from('inventory_items') as any).select('id,name,sku').eq('tenant_id', tenant.id).ilike('name', `%${q}%`).limit(3),
        (supabase.from('sales_orders') as any).select('id,order_number,customer_name').eq('tenant_id', tenant.id).ilike('order_number', `%${q}%`).limit(3),
      ]);
      const all: SearchResult[] = [
        ...(customers.data ?? []).map((c: any) => ({ id: c.id, title: c.name, subtitle: c.email, type: 'customer' as const, href: '/crm' })),
        ...(invoices.data ?? []).map((i: any) => ({ id: i.id, title: i.invoice_number, subtitle: i.customer_name, type: 'invoice' as const, href: '/invoices' })),
        ...(products.data ?? []).map((p: any) => ({ id: p.id, title: p.name, subtitle: p.sku, type: 'product' as const, href: '/inventory' })),
        ...(orders.data ?? []).map((o: any) => ({ id: o.id, title: o.order_number, subtitle: o.customer_name, type: 'order' as const, href: '/sales' })),
      ];
      setResults(all);
    } catch (_) {}
    setSearching(false);
  }, [tenant, isDemo]);

  useEffect(() => {
    const t = setTimeout(() => searchData(query), 300);
    return () => clearTimeout(t);
  }, [query, searchData]);

  const filteredPages = query
    ? ALL_PAGES.filter(p =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        (p.keywords ?? '').toLowerCase().includes(query.toLowerCase()) ||
        p.section.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredActions = query
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS;

  const allItems = [
    ...filteredActions.map(a => ({ ...a, _type: 'action' })),
    ...results.map(r => ({ ...r, _type: 'result', icon: null })),
    ...filteredPages.map(p => ({ ...p, _type: 'page' })),
  ];

  const navigate_ = (path: string) => { navigate(path); onClose(); };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[activeIndex]) navigate_((allItems[activeIndex] as any).path ?? (allItems[activeIndex] as any).href);
  };

  const typeColors: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    product: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    order: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                onKeyDown={handleKey}
                placeholder="Search pages, records, actions..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto py-2">
              {/* Quick actions */}
              {filteredActions.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {query ? 'Quick Actions' : 'Common Actions'}
                  </p>
                  {filteredActions.map((action, i) => {
                    const globalIdx = i;
                    return (
                      <button
                        key={action.label}
                        onClick={() => navigate_(action.path)}
                        className={cn(
                          'flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors text-left',
                          activeIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <action.icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span>{action.label}</span>
                        <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Data results */}
              {results.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Records</p>
                  {results.map((result, i) => {
                    const globalIdx = filteredActions.length + i;
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate_(result.href)}
                        className={cn(
                          'flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors text-left',
                          activeIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                        )}
                      >
                        <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded', typeColors[result.type])}>
                          {result.type}
                        </span>
                        <div>
                          <p className="font-medium">{result.title}</p>
                          {result.subtitle && <p className="text-xs text-muted-foreground">{result.subtitle}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pages */}
              {filteredPages.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Navigation</p>
                  {filteredPages.map((page, i) => {
                    const globalIdx = filteredActions.length + results.length + i;
                    return (
                      <button
                        key={page.path}
                        onClick={() => navigate_(page.path)}
                        className={cn(
                          'flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors text-left',
                          activeIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <page.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{page.label}</p>
                          <p className="text-xs text-muted-foreground">{page.section}</p>
                        </div>
                        <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}

              {query && !searching && results.length === 0 && filteredPages.length === 0 && filteredActions.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {!query && (
                <div className="px-4 py-3 mt-1 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>↑↓ navigate</span>
                  <span>↵ open</span>
                  <span>ESC close</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
