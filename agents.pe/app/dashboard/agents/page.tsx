'use client';

import Link from "next/link";
import { usePoll } from "@/lib/hooks/use-poll";
import AgentAvatar from "@/app/dashboard/components/agent-avatar";

interface Agent {
  id: string;
  name: string;
  role?: string;
  description?: string;
  lastSeen?: number | string;
}

interface AgentData {
  agents: Agent[];
}

export default function AgentsPage() {
  const { data } = usePoll<AgentData>("/api/agents", 10000);
  const agents = data?.agents ?? [];

  return (
    <div style={{ fontFamily: "'VT323', monospace" }}>
      <div
        style={{
          marginBottom: 24,
          color: "#444",
          fontSize: 13,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Agents
      </div>

      {agents.length === 0 ? (
        <div style={{ color: "#333", fontSize: 16 }}>No agents found.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const lastSeenMs =
    typeof agent.lastSeen === "number"
      ? agent.lastSeen
      : typeof agent.lastSeen === "string"
      ? parseInt(agent.lastSeen, 10)
      : 0;

  const isOnline = lastSeenMs > 0 && Date.now() - lastSeenMs < 60000;

  return (
    <Link href={`/dashboard/agent/${agent.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          border: "1px solid #1a1a1a",
          backgroundColor: "#050505",
          padding: 20,
          cursor: "pointer",
          fontFamily: "'VT323', monospace",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#333";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#1a1a1a";
        }}
      >
        {/* Avatar */}
        <div style={{ marginBottom: 12 }}>
          <AgentAvatar agentId={agent.id} size={36} />
        </div>

        {/* Name + online indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "#fff", fontSize: 17 }}>{agent.name}</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isOnline ? "#fff" : "#333",
              display: "inline-block",
            }}
          />
        </div>

        {/* Role badge */}
        {agent.role && (
          <div style={{ marginBottom: 10 }}>
            <span
              style={{
                color: "#555",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                border: "1px solid #222",
                padding: "2px 8px",
              }}
            >
              {agent.role}
            </span>
          </div>
        )}

        {/* Description */}
        {agent.description && (
          <div style={{ color: "#555", fontSize: 13, lineHeight: 1.4 }}>
            {agent.description.length > 100
              ? agent.description.slice(0, 100) + "..."
              : agent.description}
          </div>
        )}
      </div>
    </Link>
  );
}
