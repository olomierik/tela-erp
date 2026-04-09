import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// ─── Storage keys ─────────────────────────────────────────────────────────────

const PERF_KEY = "tela_perf_log";
const EVENT_KEY = "tela_event_log";
const TIMING_KEY = "tela_timing_log";
const MAX_ENTRIES = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageViewEntry {
  type: "pageview";
  pageName: string;
  timestamp: string;
  durationSinceLastMs: number | null;
}

export interface EventEntry {
  type: "event";
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
}

export interface TimingEntry {
  type: "timing";
  name: string;
  durationMs: number;
  timestamp: string;
}

export type TelemetryEntry = PageViewEntry | EventEntry | TimingEntry;

export interface AllMetrics {
  pageViews: PageViewEntry[];
  events: EventEntry[];
  timings: TimingEntry[];
}

// ─── Generic storage helpers ──────────────────────────────────────────────────

function readLog<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function appendLog<T>(key: string, entry: T): void {
  try {
    const log = readLog<T>(key);
    log.push(entry);
    if (log.length > MAX_ENTRIES) {
      log.splice(0, log.length - MAX_ENTRIES);
    }
    localStorage.setItem(key, JSON.stringify(log));
  } catch {
    // Quota exceeded or unavailable — fail silently
  }
}

// ─── Last-view timestamp (in-memory; resets per session) ─────────────────────

let lastViewTimestamp: number | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Records a page view with the time elapsed since the previous page view.
 */
export function trackPageView(pageName: string): void {
  const now = Date.now();
  const entry: PageViewEntry = {
    type: "pageview",
    pageName,
    timestamp: new Date(now).toISOString(),
    durationSinceLastMs: lastViewTimestamp !== null ? now - lastViewTimestamp : null,
  };
  lastViewTimestamp = now;
  appendLog<PageViewEntry>(PERF_KEY, entry);
}

/**
 * Records a custom event (e.g. button click, form submit).
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number,
): void {
  const entry: EventEntry = {
    type: "event",
    category,
    action,
    ...(label !== undefined && { label }),
    ...(value !== undefined && { value }),
    timestamp: new Date().toISOString(),
  };
  appendLog<EventEntry>(EVENT_KEY, entry);
}

/**
 * Records a render or load duration measurement.
 */
export function trackTiming(name: string, durationMs: number): void {
  const entry: TimingEntry = {
    type: "timing",
    name,
    durationMs,
    timestamp: new Date().toISOString(),
  };
  appendLog<TimingEntry>(TIMING_KEY, entry);
}

/**
 * Returns all stored telemetry as a structured object.
 */
export function getMetrics(): AllMetrics {
  return {
    pageViews: readLog<PageViewEntry>(PERF_KEY),
    events: readLog<EventEntry>(EVENT_KEY),
    timings: readLog<TimingEntry>(TIMING_KEY),
  };
}

/**
 * Wipes all telemetry from localStorage.
 */
export function clearMetrics(): void {
  try {
    localStorage.removeItem(PERF_KEY);
    localStorage.removeItem(EVENT_KEY);
    localStorage.removeItem(TIMING_KEY);
  } catch {
    // fail silently
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Automatically tracks page views whenever the React Router location changes.
 * Must be used inside a component that is a descendant of <BrowserRouter>.
 */
export function useTelemetry(): void {
  const location = useLocation();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    const pageName = location.pathname;
    // Avoid duplicate tracking on initial render with same path
    if (pageName !== prevPathname.current) {
      prevPathname.current = pageName;
      trackPageView(pageName);
    }
  }, [location.pathname]);
}
