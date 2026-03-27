import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download,
  SlidersHorizontal, Trash2, CheckSquare, Square, ChevronLeft,
  ChevronRight, MoreHorizontal,
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

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1 w-full">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder}
                className="pl-8 h-8 text-sm"
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
                    variant="destructive" size="sm" className="h-8 text-xs"
                    onClick={() => { onBulkDelete([...selected]); setSelected(new Set()); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                )}
                {onBulkExport && (
                  <Button
                    variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() => onBulkExport(selectedRows)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
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
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => onBulkExport(data)}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {selectable && (
                  <th className="w-10 pl-4 pr-2 py-3">
                    <Checkbox
                      checked={paginated.length > 0 && selected.size === paginated.length}
                      onCheckedChange={toggleSelectAll}
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
                {rowActions && <th className="w-14 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {selectable && <td className="pl-4 pr-2 py-3"><Skeleton className="h-4 w-4" /></td>}
                    {visibleColumns.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                    {rowActions && <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>}
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
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(id)} />
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
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
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

      {/* Pagination */}
      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, sorted.length)}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs">
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
                variant="outline" size="icon" className="h-7 w-7"
                disabled={page === 1} onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2">{page} / {Math.max(1, totalPages)}</span>
              <Button
                variant="outline" size="icon" className="h-7 w-7"
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
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
