import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Download, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  deleting?: boolean;
  exporting?: boolean;
  /** Optional label for the entity (e.g. "subscription") used in the count badge */
  entityLabel?: string;
  className?: string;
  /** Extra action buttons rendered after Delete/Export */
  extra?: React.ReactNode;
}

/**
 * Small inline action bar that appears next to a list when one or more
 * rows are selected. Pair with `useBulkSelection`.
 */
export default function BulkActionBar({
  count, onClear, onDelete, onExport, deleting, exporting,
  entityLabel, className, extra,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2',
            className,
          )}
        >
          <Badge variant="secondary" className="text-xs">
            {count} {entityLabel ? (count === 1 ? entityLabel : `${entityLabel}s`) : 'selected'}
          </Badge>

          {onExport && (
            <Button
              size="sm" variant="outline" className="h-8 text-xs gap-1.5"
              onClick={onExport} disabled={exporting}
            >
              {exporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />
              }
              Export
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm" variant="destructive" className="h-8 text-xs gap-1.5"
              onClick={onDelete} disabled={deleting}
            >
              {deleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
              Delete
            </Button>
          )}

          {extra}

          <Button
            size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto"
            onClick={onClear} title="Clear selection"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Convert an array of plain objects into a CSV string and trigger a
 * browser download. Use as the default `onExport` handler.
 */
export function downloadRowsAsCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headerSet = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
