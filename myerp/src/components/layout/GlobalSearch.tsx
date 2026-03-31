import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Clock, Users, FileText, Package, Briefcase, Building2,
  ClipboardList, ChevronRight, ArrowUp, ArrowDown, CornerDownLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ─── Mock search data ─────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_RESULTS: SearchResult[] = [
  // Customers
  { id: 'c1', title: 'Acme Corp', subtitle: 'Active customer · 12 orders', category: 'Customers', path: '/sales/customers', icon: Users },
  { id: 'c2', title: 'TechVision Ltd', subtitle: 'Active customer · 8 orders', category: 'Customers', path: '/sales/customers', icon: Users },
  { id: 'c3', title: 'GlobalMart Inc', subtitle: 'Active customer · 24 orders', category: 'Customers', path: '/sales/customers', icon: Users },
  { id: 'c4', title: 'Sunrise Retail', subtitle: 'Inactive customer · 3 orders', category: 'Customers', path: '/sales/customers', icon: Users },
  { id: 'c5', title: 'DataCore Systems', subtitle: 'Active customer · 6 orders', category: 'Customers', path: '/sales/customers', icon: Users },
  // Invoices
  { id: 'i1', title: 'INV-0042', subtitle: 'Acme Corp · $12,400 · Overdue', category: 'Invoices', path: '/finance/invoices', icon: FileText },
  { id: 'i2', title: 'INV-0041', subtitle: 'TechVision Ltd · $8,200 · Sent', category: 'Invoices', path: '/finance/invoices', icon: FileText },
  { id: 'i3', title: 'INV-0040', subtitle: 'GlobalMart · $34,500 · Paid', category: 'Invoices', path: '/finance/invoices', icon: FileText },
  { id: 'i4', title: 'INV-0039', subtitle: 'Sunrise Retail · $2,100 · Draft', category: 'Invoices', path: '/finance/invoices', icon: FileText },
  // Products
  { id: 'p1', title: 'Laptop Pro X1', subtitle: 'SKU-1029 · Electronics · 42 in stock', category: 'Products', path: '/inventory/products', icon: Package },
  { id: 'p2', title: 'Office Chair Deluxe', subtitle: 'SKU-2041 · Furniture · 8 in stock', category: 'Products', path: '/inventory/products', icon: Package },
  { id: 'p3', title: 'Wireless Keyboard', subtitle: 'SKU-1032 · Electronics · 0 in stock', category: 'Products', path: '/inventory/products', icon: Package },
  { id: 'p4', title: 'Industrial Motor 5HP', subtitle: 'SKU-3011 · Machinery · 3 in stock', category: 'Products', path: '/inventory/products', icon: Package },
  // Employees
  { id: 'e1', title: 'Sarah Chen', subtitle: 'Senior Engineer · Engineering', category: 'Employees', path: '/hr/employees', icon: Users },
  { id: 'e2', title: 'Marcus Johnson', subtitle: 'Sales Manager · Sales', category: 'Employees', path: '/hr/employees', icon: Users },
  { id: 'e3', title: 'Elena Petrova', subtitle: 'HR Director · Human Resources', category: 'Employees', path: '/hr/employees', icon: Users },
  { id: 'e4', title: 'Luca Ferrari', subtitle: 'CFO · Finance', category: 'Employees', path: '/hr/employees', icon: Users },
  // Vendors
  { id: 'v1', title: 'Alpha Supplies Co', subtitle: 'Raw Materials · Net 30 · Active', category: 'Vendors', path: '/procurement/vendors', icon: Building2 },
  { id: 'v2', title: 'TechParts Ltd', subtitle: 'Electronics · Net 60 · Active', category: 'Vendors', path: '/procurement/vendors', icon: Building2 },
  { id: 'v3', title: 'FastLog Logistics', subtitle: 'Logistics · COD · Active', category: 'Vendors', path: '/procurement/vendors', icon: Building2 },
  // Projects
  { id: 'pr1', title: 'Platform Redesign', subtitle: 'TechVision Ltd · Active · $120K budget', category: 'Projects', path: '/projects/projects', icon: ClipboardList },
  { id: 'pr2', title: 'ERP Migration', subtitle: 'Acme Corp · Planning · $85K budget', category: 'Projects', path: '/projects/projects', icon: ClipboardList },
  { id: 'pr3', title: 'Mobile App MVP', subtitle: 'DataCore Systems · Active · $45K budget', category: 'Projects', path: '/projects/projects', icon: ClipboardList },
  // Orders
  { id: 'o1', title: 'ORD-2025-014', subtitle: 'GlobalMart · $24,800 · Delivered', category: 'Orders', path: '/sales/orders', icon: Briefcase },
  { id: 'o2', title: 'ORD-2025-013', subtitle: 'Acme Corp · $5,400 · Processing', category: 'Orders', path: '/sales/orders', icon: Briefcase },
];

const RECENT_SEARCHES = ['INV-0042', 'Sarah Chen', 'Acme Corp', 'SKU-1029'];

const CATEGORY_COLORS: Record<string, string> = {
  Customers: 'info',
  Invoices:  'warning',
  Products:  'secondary',
  Employees: 'success',
  Vendors:   'default',
  Projects:  'destructive',
  Orders:    'outline',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setActiveIndex(-1);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Filter results
  const results = query.trim()
    ? ALL_RESULTS.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 12)
    : [];

  // Group by category
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flatResults = results;

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const r = flatResults[activeIndex];
      if (r) { navigate(r.path); onClose(); }
    }
  }

  function selectResult(r: SearchResult) {
    navigate(r.path);
    onClose();
  }

  function selectRecent(term: string) {
    setQuery(term);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 mx-auto w-full max-w-2xl mt-16 px-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKey}
              placeholder="Search customers, invoices, products, employees…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono border border-border rounded px-1.5 py-0.5 bg-muted/50">
              ESC
            </kbd>
          </div>

          {/* Results or recent searches */}
          <div className="overflow-y-auto max-h-[60vh]">
            {!query.trim() ? (
              /* Recent searches */
              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Recent searches
                </p>
                <div className="space-y-1">
                  {RECENT_SEARCHES.map(term => (
                    <button
                      key={term}
                      onClick={() => selectRecent(term)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">{term}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              /* No results */
              <div className="py-14 text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
              </div>
            ) : (
              /* Grouped results */
              <div className="p-2">
                {(() => {
                  let globalIdx = 0;
                  return Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="mb-2">
                      <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {category}
                      </p>
                      {items.map(item => {
                        const idx = globalIdx++;
                        const Icon = item.icon;
                        const isActive = idx === activeIndex;
                        return (
                          <button
                            key={item.id}
                            onClick={() => selectResult(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-left',
                              isActive ? 'bg-primary/10' : 'hover:bg-muted/50',
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                              isActive ? 'bg-primary/20' : 'bg-muted',
                            )}>
                              <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                            </div>
                            <Badge variant={CATEGORY_COLORS[item.category] as any} className="text-[10px] shrink-0">
                              {category}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {results.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> Navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> Open</span>
              <span className="flex items-center gap-1"><kbd className="font-mono">ESC</kbd> Close</span>
              <span className="ml-auto">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
