import { useCallback, useMemo, useState } from 'react';

/**
 * Reusable bulk-selection state for any list of objects keyed by `id`.
 * Returns helpers to toggle individual rows, select-all/none, and inspect
 * the currently selected rows.
 */
export function useBulkSelection<T extends { id?: string | number }>(rows: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ids = useMemo(
    () => rows.map(r => String((r as any).id ?? '')).filter(Boolean),
    [rows],
  );

  const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
  const someSelected = !allSelected && ids.some(id => selected.has(id));

  const toggle = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      // If everything currently visible is already selected → clear them
      if (ids.every(id => prev.has(id))) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      }
      // Otherwise → add all currently visible ids
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string | number) => selected.has(String(id)), [selected]);

  const selectedRows = useMemo(
    () => rows.filter(r => selected.has(String((r as any).id ?? ''))),
    [rows, selected],
  );

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedRows,
    selectedCount: selected.size,
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    clear,
    isSelected,
  };
}
