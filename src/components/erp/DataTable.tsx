import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download,
  SlidersHorizontal, Trash2, ChevronLeft, ChevronRight, MoreHorizontal,
  LayoutGrid, LayoutList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  hidden?: boolean;
  /** Hide this column in mobile card view (useful for less important fields) */
  mobileHidden?: boolean;
  /** Mark as the primary display column in card view */
  primary?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  onBulkDelete?: (ids: string[]) => void;
  onBulkExport?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  pageSize?: number;
  className?: string;
  filterSlot?: React.ReactNode;
}

/* ─── useMediaQuery hook (inline) ────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  // SSR-safe: check on mount and on resize
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMemo(() => {
      const mq = window.matchMedia('(max-width: 767px)');
      setIsMobile(mq.matches);
      const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);
  }
  return isMobile;
}

export default function DataTable<T extends { id?: string }>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  selectable = true,
  onBulkDelete,
  onBulkExport,
  onRowClick,
  rowActions,
  emptyTitle = 'No records found',
  emptyDescription = 'No data to display yet.',
  emptyAction,
  pageSize: defaultPageSize = 25,
  className,
  filterSlot,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(columns.filter(c => !c.hidden).map(c => c.key))
  );
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const isMobile = useIsMobile();

  // Auto-switch to cards on mobile
  const effectiveView = isMobile ? 'cards' : viewMode;

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = (row as any)[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(r => (r as any).id).filter(Boolean)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const visibleColumns = columns.filter(c => visibleCols.has(c.key));
  const selectedRows = paginated.filter(r => selected.has((r as any).id ?? ''));

  // For card view: identify primary column and visible card columns
  const primaryCol = columns.find(c => c.primary) ?? visibleColumns[0];
  const cardColumns = visibleColumns.filter(c => !c.mobileHidden && c.key !== primaryCol?.key);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  /* ─── Card View (Mobile) ───────────────────────────────────────── */
  const renderCardView = () => {
    if (loading) {
      return (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      );
    }

    if (paginated.length === 0) {
      return (
        <div className="py-16">
          <EmptyState
            title={search ? 'No results found' : emptyTitle}
            description={search ? `No records match "${search}". Try a different search.` : emptyDescription}
            action={!search ? emptyAction : undefined}
          />
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {paginated.map((row, i) => {
          const id = (row as any).id ?? String(i);
          const isSelected = selected.has(id);
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'rounded-xl border border-border p-4 transition-colors active:bg-muted/60',
                onRowClick && 'cursor-pointer',
                isSelected ? 'bg-primary/5 border-primary/30' : 'bg-card hover:bg-muted/40'
              )}
            >
              {/* Card header: primary field + actions */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectable && (
                    <div
                      className="shrink-0 pt-0.5"
                      onClick={e => { e.stopPropagation(); toggleRow(id); }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(id)}
                        className="h-5 w-5"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {primaryCol && (
                      <p className="font-semibold text-sm text-foreground truncate">
                        {primaryCol.render
                          ? primaryCol.render((row as any)[primaryCol.key], row)
                          : String((row as any)[primaryCol.key] ?? '—')
                        }
                      </p>
                    )}
                  </div>
                </div>
                {/* Always-visible actions */}
                {rowActions && (
                  <div className="shrink-0 flex items-center" onClick={e => e.stopPropagation()}>
                    {rowActions(row)}
                  </div>
                )}
              </div>

              {/* Card body: secondary fields as label-value pairs */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {cardColumns.slice(0, 6).map(col => (
                  <div key={col.key} className="min-w-0">
                    <span className="text-muted-foreground">{col.label}: </span>
                    <span className="text-foreground font-medium">
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : String((row as any)[col.key] ?? '—')
                      }
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  /* ─── Table View (Desktop) ─────────────────────────────────────── */
  const renderTableView = () => (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 sticky top-0 z-10">
              {selectable && (
                <th className="w-10 pl-4 pr-2 py-3">
                  <Checkbox
                    checked={paginated.length > 0 && selected.size === paginated.length}
                    onCheckedChange={toggleSelectAll}
                    className="h-5 w-5"
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                    col.sortable !== false && 'cursor-pointer select-none hover:text-foreground transition-colors',
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </div>
                </th>
              ))}
              {rowActions && <th className="w-16 px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="pl-4 pr-2 py-3"><Skeleton className="h-5 w-5" /></td>}
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                  {rowActions && <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="py-16">
                  <EmptyState
                    title={search ? 'No results found' : emptyTitle}
                    description={search ? `No records match "${search}". Try a different search.` : emptyDescription}
                    action={!search ? emptyAction : undefined}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => {
                const id = (row as any).id ?? String(i);
                const isSelected = selected.has(id);
                return (
                  <motion.tr
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'group transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                    )}
                  >
                    {selectable && (
                      <td className="pl-4 pr-2 py-3" onClick={e => { e.stopPropagation(); toggleRow(id); }}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(id)} className="h-5 w-5" />
                      </td>
                    )}
                    {visibleColumns.map(col => (
                      <td key={col.key} className={cn('px-4 py-3 text-sm', col.className)}>
                        {col.render
                          ? col.render((row as any)[col.key], row)
                          : <span className="text-foreground">{String((row as any)[col.key] ?? '—')}</span>
                        }
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {/* Always visible — no hover dependency */}
                        <div className="flex justify-end">
                          {rowActions(row)}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1 w-full">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder}
                className="pl-9 h-10 sm:h-8 text-sm"
              />
            </div>
          )}
          {filterSlot}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Bulk actions */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5"
              >
                <Badge variant="secondary" className="text-xs">{selected.size} selected</Badge>
                {onBulkDelete && (
                  <Button
                    variant="destructive" size="sm" className="h-9 sm:h-8 text-xs"
                    onClick={() => { onBulkDelete([...selected]); setSelected(new Set()); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                )}
                {onBulkExport && (
                  <Button
                    variant="outline" size="sm" className="h-9 sm:h-8 text-xs"
                    onClick={() => onBulkExport(selectedRows)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* View mode toggle (desktop only) */}
          <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'cards' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 sm:h-8 text-xs gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleCols.has(col.key)}
                  onCheckedChange={v => {
                    const next = new Set(visibleCols);
                    v ? next.add(col.key) : next.delete(col.key);
                    setVisibleCols(next);
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {onBulkExport && (
            <Button variant="outline" size="sm" className="h-9 sm:h-8 text-xs gap-1.5" onClick={() => onBulkExport(data)}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content: Table or Cards */}
      {effectiveView === 'cards' ? renderCardView() : renderTableView()}

      {/* Pagination */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, sorted.length)}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-9 sm:h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7"
                disabled={page === 1} onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
              <span className="px-2 min-w-[48px] text-center">{page} / {Math.max(1, totalPages)}</span>
              <Button
                variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7"
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
