import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useErrorLog } from "@/components/ErrorBoundary";
import { getMetrics, clearMetrics, type PageViewEntry, type EventEntry, type TimingEntry } from "@/lib/telemetry";
import { getVitals, clearVitals, type VitalEntry } from "@/lib/web-vitals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function ratingColor(rating: VitalEntry["rating"]): string {
  switch (rating) {
    case "good":
      return "text-green-600";
    case "needs-improvement":
      return "text-yellow-600";
    case "poor":
      return "text-red-600";
  }
}

function eventCountMap(events: EventEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    const key = `${ev.category} / ${ev.action}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function vitalDisplayValue(entry: VitalEntry): string {
  // CLS was stored ×1000 as integer
  if (entry.name === "CLS") {
    return (entry.value / 1000).toFixed(4);
  }
  return `${entry.value} ms`;
}

// ─── Section components ───────────────────────────────────────────────────────

function ErrorsSection() {
  const errors = useErrorLog();

  if (errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Last 10 unhandled errors caught by ErrorBoundary</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No errors recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Errors</CardTitle>
        <CardDescription>Last {errors.length} unhandled errors caught by ErrorBoundary</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>User ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...errors].reverse().map((e, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-xs">{formatTs(e.timestamp)}</TableCell>
                <TableCell className="max-w-xs truncate text-sm font-mono">{e.message}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{e.url}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.userId ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface MetricsSectionProps {
  pageViews: PageViewEntry[];
  events: EventEntry[];
  timings: TimingEntry[];
}

function PageViewSection({ pageViews }: { pageViews: PageViewEntry[] }) {
  if (pageViews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Page View Timeline</CardTitle>
          <CardDescription>Navigate around the app to populate this log</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No page views recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page View Timeline</CardTitle>
        <CardDescription>Last {pageViews.length} page views (capped at 100)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Time on previous page</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...pageViews].reverse().map((pv, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-xs">{formatTs(pv.timestamp)}</TableCell>
                <TableCell className="font-mono text-sm">{pv.pageName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {pv.durationSinceLastMs !== null
                    ? `${(pv.durationSinceLastMs / 1000).toFixed(1)}s`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EventCountsSection({ events }: { events: EventEntry[] }) {
  const counts = eventCountMap(events);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Counts</CardTitle>
          <CardDescription>Aggregated custom event totals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Counts</CardTitle>
        <CardDescription>{events.length} events recorded across {entries.length} unique action(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category / Action</TableHead>
              <TableHead>Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([key, count]) => (
              <TableRow key={key}>
                <TableCell className="font-mono text-sm">{key}</TableCell>
                <TableCell className="font-semibold">{count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TimingsSection({ timings }: { timings: TimingEntry[] }) {
  if (timings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Render / Load Timings</CardTitle>
          <CardDescription>Custom duration measurements via trackTiming()</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No timings recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Render / Load Timings</CardTitle>
        <CardDescription>Last {timings.length} timing measurements</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...timings].reverse().map((t, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-xs">{formatTs(t.timestamp)}</TableCell>
                <TableCell className="font-mono text-sm">{t.name}</TableCell>
                <TableCell className="text-sm">{t.durationMs} ms</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function WebVitalsSection({ vitals }: { vitals: VitalEntry[] }) {
  if (vitals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Web Vitals</CardTitle>
          <CardDescription>FCP, LCP, CLS, FID, INP, TTFB — collected via PerformanceObserver</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No vitals recorded yet. They are collected during normal page load and
            recorded when the page becomes hidden.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show most recent reading per metric
  const latestByName: Record<string, VitalEntry> = {};
  for (const v of vitals) {
    latestByName[v.name] = v;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Web Vitals</CardTitle>
        <CardDescription>Latest reading per metric (raw historical log has {vitals.length} entries)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Recorded at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(latestByName).map((v) => (
              <TableRow key={v.name}>
                <TableCell className="font-semibold">{v.name}</TableCell>
                <TableCell className="font-mono text-sm">{vitalDisplayValue(v)}</TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${ratingColor(v.rating)}`}>
                    {v.rating}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatTs(v.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TelemetryDashboard() {
  const [metrics, setMetrics] = useState(() => getMetrics());
  const [vitals, setVitals] = useState<VitalEntry[]>(() => getVitals());

  const refresh = useCallback(() => {
    setMetrics(getMetrics());
    setVitals(getVitals());
  }, []);

  // Refresh data on mount (the hook reads from localStorage at render time)
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleExportJSON = useCallback(() => {
    const errors = JSON.parse(localStorage.getItem("tela_error_log") ?? "[]");
    const payload = {
      exportedAt: new Date().toISOString(),
      errors,
      ...metrics,
      vitals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tela-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, vitals]);

  const handleClearAll = useCallback(() => {
    if (!window.confirm("Clear all telemetry data? This cannot be undone.")) return;
    clearMetrics();
    clearVitals();
    localStorage.removeItem("tela_error_log");
    refresh();
  }, [refresh]);

  const totalEvents =
    metrics.pageViews.length + metrics.events.length + metrics.timings.length + vitals.length;

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telemetry Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browser-native telemetry — {totalEvents} total entries stored locally
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={refresh}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            Export JSON
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            Clear All Data
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Page Views", value: metrics.pageViews.length },
          { label: "Events", value: metrics.events.length },
          { label: "Timings", value: metrics.timings.length },
          { label: "Errors", value: JSON.parse(localStorage.getItem("tela_error_log") ?? "[]").length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sections */}
      <WebVitalsSection vitals={vitals} />
      <ErrorsSection />
      <PageViewSection pageViews={metrics.pageViews} />
      <EventCountsSection events={metrics.events} />
      <TimingsSection timings={metrics.timings} />
    </div>
  );
}
