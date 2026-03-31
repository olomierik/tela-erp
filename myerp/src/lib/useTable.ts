import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UseTableReturn<T extends { id: string }> {
  rows: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  insert: (row: Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<T>;
  update: (id: string, updates: Partial<Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Generic hook for a myerp_* Supabase table.
 * Handles fetch on mount, optimistic local state updates, and typed CRUD.
 *
 * @param tableName  e.g. 'myerp_customers'
 * @param orderCol   column used for default sort (default: 'created_at')
 * @param ascending  sort direction (default: false = newest first)
 */
export function useTable<T extends Record<string, unknown> & { id: string }>(
  tableName: string,
  orderCol = 'created_at',
  ascending = false,
): UseTableReturn<T> {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', user.id)
      .order(orderCol, { ascending });
    if (err) {
      setError(err.message);
    } else {
      setRows((data ?? []) as T[]);
    }
    setLoading(false);
  }, [tableName, user, orderCol, ascending]);

  useEffect(() => { refetch(); }, [refetch]);

  const insert = useCallback(async (
    row: Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ): Promise<T> => {
    if (!user) throw new Error('Not authenticated');
    const { data, error: err } = await supabase
      .from(tableName)
      .insert({ ...row, user_id: user.id })
      .select()
      .single();
    if (err) throw err;
    const inserted = data as T;
    setRows(prev => [inserted, ...prev]);
    return inserted;
  }, [tableName, user]);

  const update = useCallback(async (
    id: string,
    updates: Partial<Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<T> => {
    const { data, error: err } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    const updated = data as T;
    setRows(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, [tableName]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    if (err) throw err;
    setRows(prev => prev.filter(r => r.id !== id));
  }, [tableName]);

  return { rows, loading, error, refetch, insert, update, remove, setRows };
}
