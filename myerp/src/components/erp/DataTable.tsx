import { useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download, Trash2,
  Pencil, Eye, Plus, SlidersHorizontal, ChevronLeft, ChevronRight,
  PackageOpen, Check, X, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc';

export interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  visible?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface BulkAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: (selectedIds: string[]) => void;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  idKey?: string;
  title?: string;
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  addButton?: { label: string; onClick: () => void };
  bulkActions?: BulkAction[];
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyText?: string;
  emptySubtext?: string;
  searchPlaceholder?: string;
  defaultPageSize?: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Main component ───────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  idKey = 'id',
  title,
  isLoading = false,
  onEdit,
  onDelete,
  onView,
  addButton,
  bulkActions,
  emptyIcon: EmptyIcon = PackageOpen,
  emptyText = 'No records found',
  emptySubtext,
  searchPlaceholder = 'Search…',
  defaultPageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>(
    () => Object.fromEntries(columns.map(c => [c.key, c.visible !== false])),
  );
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const visibleColumns = columns.filter(c => colVisibility[c.key]);
  const hasRowActions = !!(onEdit || onDelete || onView);

  // ── Search ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      visibleColumns.some(col => {
        const val = (row as Record<string, unknown>)[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, search, visibleColumns]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageData = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startRow = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, sorted.length);

  function handleSort(key: string) {
    setSort(prev =>
      prev?.key === key
        ? prev.dir === 'asc' ? { key, dir: 'desc' } : null
        : { key, dir: 'asc' },
    );
    setPage(1);
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); setSelected(new Set()); }

  // ── Selection ─────────────────────────────────────────────────────────────
  function rowId(row: T) { return String((row as Record<string, unknown>)[idKey] ?? ''); }
  const pageIds = pageData.map(rowId);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const somePageSelected = pageIds.some(id => selected.has(id));

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  }
  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCsv = useCallback(() => {
    const headers = visibleColumns.map(c => c.header);
    const rows = sorted.map(row =>
      visibleColumns.map(c => {
        const v = (row as Record<string, unknown>)[c.key];
        const str = v == null ? '' : String(v);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted, visibleColumns, title]);

  // ── Column toggle ─────────────────────────────────────────────────────────
  function toggleCol(key: string) {
    setColVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const selectedArr = Array.from(selected);

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-border">
        {title && <h3 className="text-sm font-semibold text-foreground mr-2 hidden sm:block">{title}</h3>}

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs bg-muted/40 border-0 focus-visible:ring-1"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Column visibility */}
          <div className="relative">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setColMenuOpen(v => !v)}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </Button>
            {colMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setColMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  {columns.map(col => (
                    <button
                      key={col.key}
                      onClick={() => toggleCol(col.key)}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                    >
                      <span className={cn('w-4 h-4 rounded border border-border flex items-center justify-center shrink-0 transition-colors', colVisibility[col.key] && 'bg-primary border-primary')}>
                        {colVisibility[col.key] && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      {col.header}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Add button */}
          {addButton && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={addButton.onClick}>
              <Plus className="w-3.5 h-3.5" />
              {addButton.label}
            </Button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20 text-sm animate-in slide-in-from-top-1 duration-150">
          <span className="font-medium text-primary text-xs">
            {selected.size} row{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {bulkActions?.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant ?? 'outline'}
                  className="h-7 text-xs gap-1.5"
                  onClick={() => { action.onClick(selectedArr); setSelected(new Set()); }}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {action.label}
                </Button>
              );
            })}
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1.5"
                onClick={() => {
                  const toDelete = data.filter(row => selected.has(rowId(row)));
                  toDelete.forEach(row => onDelete(row));
                  setSelected(new Set());
                }}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {/* Checkbox */}
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                />
              </th>

              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable !== false && 'select-none',
                  )}
                >
                  {col.sortable !== false ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors group"
                    >
                      {col.header}
                      <span className="opacity-50 group-hover:opacity-100">
                        {sort?.key === col.key
                          ? sort.dir === 'asc'
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                          : <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        }
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}

              {hasRowActions && (
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3"><Skeleton className="w-3.5 h-3.5 rounded" /></td>
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                  {hasRowActions && (
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-7 w-16 rounded ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={visibleColumns.length + (hasRowActions ? 2 : 1)} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <EmptyIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground text-sm">{emptyText}</p>
                    {emptySubtext && <p className="text-xs text-muted-foreground">{emptySubtext}</p>}
                    {addButton && (
                      <Button size="sm" className="mt-1 gap-1.5" onClick={addButton.onClick}>
                        <Plus className="w-3.5 h-3.5" />
                        {addButton.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => {
                const id = rowId(row);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id || i}
                    className={cn(
                      'border-b border-border transition-colors group/row',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/30',
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                      />
                    </td>

                    {/* Data cells */}
                    {visibleColumns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-sm text-foreground',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                        )}
                      >
                        {col.render
                          ? col.render(row, i)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}

                    {/* Row actions */}
                    {hasRowActions && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          {onView && (
                            <button
                              onClick={() => onView(row)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!isLoading && sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/10">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startRow}–{endRow}</span> of{' '}
            <span className="font-medium text-foreground">{sorted.length}</span> records
            {data.length !== sorted.length && (
              <span className="text-muted-foreground"> (filtered from {data.length})</span>
            )}
          </p>

          <div className="flex items-center gap-3">
            {/* Page size */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-7 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Prev/Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (safePage <= 3) p = i + 1;
                  else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = safePage - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                        p === safePage
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge helper ───────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | 'outline' | 'default'> = {
  active: 'success', enabled: 'success', paid: 'success', approved: 'success',
  completed: 'success', delivered: 'success', won: 'success', excellent: 'success',
  good: 'info',
  pending: 'warning', processing: 'warning', on_leave: 'warning', low: 'warning',
  sent: 'info', submitted: 'info', contacted: 'info', in_progress: 'info',
  inactive: 'secondary', draft: 'secondary', new: 'secondary', planned: 'secondary',
  overdue: 'destructive', failed: 'destructive', rejected: 'destructive',
  cancelled: 'outline', terminated: 'destructive', lost: 'outline', disposed: 'outline',
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status.toLowerCase()] ?? 'secondary';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <Badge variant={variant}>{label}</Badge>;
}

export default DataTable;
