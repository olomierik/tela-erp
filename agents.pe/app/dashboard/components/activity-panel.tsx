'use client';

import { usePoll } from "@/lib/hooks/use-poll";
import AgentAvatar from "@/app/dashboard/components/agent-avatar";

interface ActivityEvent {
  type: string;
  timestamp: number;
  agentName?: string;
  name?: string;
  agentId?: string;
  [key: string]: unknown;
}

interface ActivityData {
  events: ActivityEvent[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ActivityPanel() {
  const { data } = usePoll<ActivityData>("/api/activity?limit=30", 4000);
  const events = data?.events ?? [];

  return (
    <div
      style={{
        width: 300,
        borderLeft: "1px solid #1a1a1a",
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        fontFamily: "'VT323', monospace",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1a1a1a",
          color: "#444",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Live Activity
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {events.length === 0 ? (
          <div style={{ padding: 16, color: "#333", fontSize: 13 }}>No events yet.</div>
        ) : (
          events.map((event, i) => {
            const agentName = event.agentName ?? event.name ?? "Unknown";
            const actionType = event.type ?? "";
            const ts = typeof event.timestamp === "number" ? event.timestamp : 0;

            return (
              <div
                key={`${event.timestamp}-${event.agentName ?? event.name}-${i}`}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #0d0d0d",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 14, wordBreak: "break-word" }}>
                    {event.agentId && event.agentId !== "sim" && (
                      <AgentAvatar agentId={event.agentId} size={18} />
                    )}
                    {agentName}
                  </span>
                  <span style={{ color: "#333", fontSize: 11, marginLeft: 8, flexShrink: 0 }}>
                    {ts ? formatTime(ts) : ""}
                  </span>
                </div>
                <div style={{ color: "#555", fontSize: 13, marginTop: 2, letterSpacing: 1 }}>
                  {actionType.replace(/_/g, " ")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
