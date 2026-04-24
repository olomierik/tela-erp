import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

/**
 * Global period selector — shared across all modules via TopBar.
 *
 * Two modes:
 *   - 'month' : single calendar month (YYYY-MM). `from` = 1st of month, `to` = last day.
 *   - 'range' : explicit `from`/`to` ISO date strings (YYYY-MM-DD).
 *
 * Persisted to localStorage so it survives reloads. Pages can opt-in by reading
 * { from, to } and filtering their queries.
 */

export type PeriodMode = 'month' | 'range';

interface PeriodContextValue {
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
  /** YYYY-MM, only meaningful when mode === 'month' */
  month: string;
  setMonth: (m: string) => void;
  /** ISO date YYYY-MM-DD — first day of selected period */
  from: string;
  /** ISO date YYYY-MM-DD — last day of selected period (inclusive) */
  to: string;
  setRange: (from: string, to: string) => void;
  /** Human label, e.g. "April 2026" or "1 Apr → 30 Apr 2026" */
  label: string;
}

const STORAGE_KEY = 'tela_global_period_v1';

const todayMonth = () => new Date().toISOString().slice(0, 7);

function monthBounds(yyyymm: string): { from: string; to: string } {
  const [y, m] = yyyymm.split('-').map(Number);
  const start = new Date(Date.UTC(y, (m || 1) - 1, 1));
  const end = new Date(Date.UTC(y, m || 1, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function formatLabel(mode: PeriodMode, month: string, from: string, to: string): string {
  if (mode === 'month') {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  const f = new Date(from); const t = new Date(to);
  const sameYear = f.getFullYear() === t.getFullYear();
  const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const fmtFull  = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return sameYear ? `${fmtShort(f)} → ${fmtFull(t)}` : `${fmtFull(f)} → ${fmtFull(t)}`;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PeriodMode>('month');
  const [month, setMonthState] = useState<string>(todayMonth);
  const [from, setFromState] = useState<string>(() => monthBounds(todayMonth()).from);
  const [to, setToState] = useState<string>(() => monthBounds(todayMonth()).to);

  // Load persisted state once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.mode === 'month' && typeof parsed.month === 'string') {
        const b = monthBounds(parsed.month);
        setModeState('month'); setMonthState(parsed.month);
        setFromState(b.from); setToState(b.to);
      } else if (parsed?.mode === 'range' && parsed.from && parsed.to) {
        setModeState('range'); setFromState(parsed.from); setToState(parsed.to);
      }
    } catch { /* ignore */ }
  }, []);

  const persist = (next: { mode: PeriodMode; month: string; from: string; to: string }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const setMode = (m: PeriodMode) => {
    setModeState(m);
    if (m === 'month') {
      const b = monthBounds(month);
      setFromState(b.from); setToState(b.to);
      persist({ mode: m, month, from: b.from, to: b.to });
    } else {
      persist({ mode: m, month, from, to });
    }
  };

  const setMonth = (yyyymm: string) => {
    const safe = /^\d{4}-\d{2}$/.test(yyyymm) ? yyyymm : todayMonth();
    const b = monthBounds(safe);
    setModeState('month'); setMonthState(safe); setFromState(b.from); setToState(b.to);
    persist({ mode: 'month', month: safe, from: b.from, to: b.to });
  };

  const setRange = (f: string, t: string) => {
    setModeState('range'); setFromState(f); setToState(t);
    persist({ mode: 'range', month, from: f, to: t });
  };

  const label = useMemo(() => formatLabel(mode, month, from, to), [mode, month, from, to]);

  const value: PeriodContextValue = { mode, setMode, month, setMonth, from, to, setRange, label };
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider');
  return ctx;
}
