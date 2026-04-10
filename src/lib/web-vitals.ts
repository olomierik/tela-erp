// Web Vitals — uses only browser-native PerformanceObserver API.
// No external packages required.

// ─── Types ────────────────────────────────────────────────────────────────────

export type VitalName = "FCP" | "LCP" | "CLS" | "FID" | "INP" | "TTFB";

export interface VitalEntry {
  name: VitalName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const VITALS_KEY = "tela_vitals_log";
const MAX_ENTRIES = 100;

function appendVital(entry: VitalEntry): void {
  try {
    const raw = localStorage.getItem(VITALS_KEY);
    const log: VitalEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    if (log.length > MAX_ENTRIES) {
      log.splice(0, log.length - MAX_ENTRIES);
    }
    localStorage.setItem(VITALS_KEY, JSON.stringify(log));
  } catch {
    // fail silently
  }
}

export function getVitals(): VitalEntry[] {
  try {
    const raw = localStorage.getItem(VITALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearVitals(): void {
  try {
    localStorage.removeItem(VITALS_KEY);
  } catch {
    // fail silently
  }
}

// ─── Rating thresholds (per Web Vitals spec) ──────────────────────────────────

function rateFCP(v: number): VitalEntry["rating"] {
  return v <= 1800 ? "good" : v <= 3000 ? "needs-improvement" : "poor";
}

function rateLCP(v: number): VitalEntry["rating"] {
  return v <= 2500 ? "good" : v <= 4000 ? "needs-improvement" : "poor";
}

function rateCLS(v: number): VitalEntry["rating"] {
  return v <= 0.1 ? "good" : v <= 0.25 ? "needs-improvement" : "poor";
}

function rateFID(v: number): VitalEntry["rating"] {
  return v <= 100 ? "good" : v <= 300 ? "needs-improvement" : "poor";
}

function rateINP(v: number): VitalEntry["rating"] {
  return v <= 200 ? "good" : v <= 500 ? "needs-improvement" : "poor";
}

function rateTTFB(v: number): VitalEntry["rating"] {
  return v <= 800 ? "good" : v <= 1800 ? "needs-improvement" : "poor";
}

// ─── PerformanceObserver-based collectors ─────────────────────────────────────

function observe(
  type: string,
  callback: PerformanceObserverCallback,
  options?: PerformanceObserverInit,
): PerformanceObserver | null {
  try {
    if (!("PerformanceObserver" in window)) return null;
    // Check that the entry type is supported before observing
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return null;
    const po = new PerformanceObserver(callback);
    po.observe({ type, buffered: true, ...options });
    return po;
  } catch {
    return null;
  }
}

function record(name: VitalName, value: number, rater: (v: number) => VitalEntry["rating"]): void {
  const entry: VitalEntry = {
    name,
    value: Math.round(name === "CLS" ? value * 1000 : value), // store CLS ×1000 as integer
    rating: rater(value),
    timestamp: new Date().toISOString(),
  };
  appendVital(entry);
  // Also emit to console in dev
  if (import.meta.env.DEV) {
    console.debug(`[WebVitals] ${name}: ${value.toFixed(2)} (${entry.rating})`);
  }
}

// ─── TTFB via Navigation Timing ───────────────────────────────────────────────

function collectTTFB(): void {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb > 0) {
        record("TTFB", ttfb, rateTTFB);
      }
    }
  } catch {
    // fail silently
  }
}

// ─── Public initializer ───────────────────────────────────────────────────────

let initialized = false;

/**
 * Call once at app startup (e.g. in main.tsx) to begin collecting Web Vitals.
 * Uses only browser-native APIs — no external packages.
 */
export function initWebVitals(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // FCP — First Contentful Paint
  observe("paint", (list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === "first-contentful-paint") {
        record("FCP", entry.startTime, rateFCP);
      }
    }
  });

  // LCP — Largest Contentful Paint (use the last reported value)
  let lcpValue = 0;
  const lcpObserver = observe("largest-contentful-paint", (list) => {
    const entries = list.getEntries();
    if (entries.length > 0) {
      lcpValue = entries[entries.length - 1].startTime;
    }
  });

  // Finalise LCP on user interaction or page hide
  const finalizeLCP = () => {
    if (lcpValue > 0) {
      record("LCP", lcpValue, rateLCP);
      lcpValue = 0; // prevent double-recording
    }
    lcpObserver?.disconnect();
    document.removeEventListener("visibilitychange", finalizeLCPOnHide);
    window.removeEventListener("pointerdown", finalizeLCP);
    window.removeEventListener("keydown", finalizeLCP);
  };
  const finalizeLCPOnHide = () => {
    if (document.visibilityState === "hidden") finalizeLCP();
  };
  document.addEventListener("visibilitychange", finalizeLCPOnHide);
  window.addEventListener("pointerdown", finalizeLCP, { once: true });
  window.addEventListener("keydown", finalizeLCP, { once: true });

  // CLS — Cumulative Layout Shift (accumulate across session)
  let clsValue = 0;
  let clsSessionValue = 0;
  let clsSessionEntries: PerformanceEntry[] = [];

  observe("layout-shift", (list) => {
    for (const entry of list.getEntries()) {
      const ls = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
      if (!ls.hadRecentInput) {
        const firstEntry = clsSessionEntries[0];
        const lastEntry = clsSessionEntries[clsSessionEntries.length - 1];
        if (
          clsSessionEntries.length === 0 ||
          (ls.startTime - (lastEntry?.startTime ?? 0) < 1000 &&
            ls.startTime - (firstEntry?.startTime ?? 0) < 5000)
        ) {
          clsSessionValue += ls.value;
          clsSessionEntries.push(ls);
        } else {
          clsValue = Math.max(clsValue, clsSessionValue);
          clsSessionValue = ls.value;
          clsSessionEntries = [ls];
        }
      }
    }
    clsValue = Math.max(clsValue, clsSessionValue);
  });

  // Store CLS when page becomes hidden
  const recordCLS = () => {
    if (document.visibilityState === "hidden") {
      record("CLS", clsValue, rateCLS);
      document.removeEventListener("visibilitychange", recordCLS);
    }
  };
  document.addEventListener("visibilitychange", recordCLS);

  // FID — First Input Delay
  observe("first-input", (list) => {
    for (const entry of list.getEntries()) {
      const fi = entry as PerformanceEntry & { processingStart: number };
      const fid = fi.processingStart - fi.startTime;
      if (fid >= 0) {
        record("FID", fid, rateFID);
      }
    }
  });

  // INP — Interaction to Next Paint (Chrome 96+)
  let maxINP = 0;
  observe("event", (list) => {
    for (const entry of list.getEntries()) {
      const ev = entry as PerformanceEntry & { processingEnd: number; processingStart: number };
      const inp = ev.processingEnd - ev.startTime;
      if (inp > maxINP) maxINP = inp;
    }
  }, { durationThreshold: 16 });

  const recordINP = () => {
    if (document.visibilityState === "hidden" && maxINP > 0) {
      record("INP", maxINP, rateINP);
      document.removeEventListener("visibilitychange", recordINP);
    }
  };
  document.addEventListener("visibilitychange", recordINP);

  // TTFB — Time to First Byte (from Navigation Timing)
  if (document.readyState === "complete") {
    collectTTFB();
  } else {
    window.addEventListener("load", collectTTFB, { once: true });
  }
}
