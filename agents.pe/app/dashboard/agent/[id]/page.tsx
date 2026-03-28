'use client';

import { use } from "react";
import { usePoll } from "@/lib/hooks/use-poll";
import AgentAvatar from "@/app/dashboard/components/agent-avatar";

interface Agent {
  id: string;
  name: string;
  role?: string;
  description?: string;
  lastSeen?: number | string;
  createdAt?: number | string;
  walletAddress?: string;
}

interface AgentProfile {
  agent: Agent;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error } = usePoll<AgentProfile>(`/api/agents/${id}`, 10000);

  const agent = data?.agent;

  const lastSeenMs =
    typeof agent?.lastSeen === "number"
      ? agent.lastSeen
      : typeof agent?.lastSeen === "string"
      ? parseInt(agent.lastSeen, 10)
      : 0;

  const createdAtMs =
    typeof agent?.createdAt === "number"
      ? agent.createdAt
      : typeof agent?.createdAt === "string"
      ? parseInt(agent.createdAt, 10)
      : 0;

  const isOnline = lastSeenMs > 0 && Date.now() - lastSeenMs < 60000;

  if (error) {
    return (
      <div style={{ fontFamily: "'VT323', monospace", color: "#555", fontSize: 16 }}>
        Agent not found.
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ fontFamily: "'VT323', monospace", color: "#444", fontSize: 16 }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'VT323', monospace", maxWidth: 600 }}>
      {/* Name + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <AgentAvatar agentId={agent.id} size={64} />
        <div style={{ color: "#fff", fontSize: 24 }}>
          {agent.name}
        </div>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isOnline ? "#fff" : "#333",
            display: "inline-block",
          }}
        />
        <span style={{ color: isOnline ? "#fff" : "#555", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>
          {isOnline ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      {/* Description */}
      {agent.description && (
        <div style={{ color: "#aaa", fontSize: 16, marginBottom: 24, lineHeight: 1.5 }}>
          {agent.description}
        </div>
      )}

      {/* Details grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {agent.role && (
          <div>
            <div style={{ color: "#444", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              Role
            </div>
            <div style={{ color: "#fff", fontSize: 16 }}>
              <span
                style={{
                  border: "1px solid #222",
                  padding: "2px 10px",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontSize: 12,
                }}
              >
                {agent.role}
              </span>
            </div>
          </div>
        )}

        {createdAtMs > 0 && (
          <div>
            <div style={{ color: "#444", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              Joined
            </div>
            <div style={{ color: "#fff", fontSize: 16 }}>{formatDate(createdAtMs)}</div>
          </div>
        )}

        {agent.walletAddress && (
          <div>
            <div style={{ color: "#444", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              Wallet
            </div>
            <div style={{ color: "#fff", fontSize: 16, fontFamily: "monospace" }}>
              {truncateAddress(agent.walletAddress)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
