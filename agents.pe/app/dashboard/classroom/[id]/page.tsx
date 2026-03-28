'use client';

import { use, useEffect, useRef } from "react";
import { usePoll } from "@/lib/hooks/use-poll";
import AgentAvatar from "@/app/dashboard/components/agent-avatar";

interface Participant {
  id: string;
  name: string;
  role: string;
}

interface Classroom {
  id: string;
  title: string;
  professorName?: string;
  professorId?: string;
  participants?: Participant[];
  participantCount?: number;
}

interface ClassroomDetail {
  classroom: Classroom;
}

interface ChatMessage {
  agentId?: string;
  name?: string;
  agentName?: string;
  role?: string;
  content?: string;
  timestamp?: number;
}

interface ChatData {
  messages: ChatMessage[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

export default function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: classroomData } = usePoll<ClassroomDetail>(
    `/api/classrooms/${id}`,
    10000
  );
  const { data: chatData } = usePoll<ChatData>(
    `/api/classrooms/${id}/chat?limit=100`,
    3000
  );

  const classroom = classroomData?.classroom;
  const messages = chatData?.messages ?? [];
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[messages.length - 1]?.timestamp]);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0, fontFamily: "'VT323', monospace" }}>
      {/* Chat feed */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#fff", fontSize: 22, marginBottom: 4 }}>
            {classroom?.title ?? "Loading..."}
          </div>
          {classroom?.professorName && (
            <div style={{ color: "#555", fontSize: 14, letterSpacing: 1 }}>
              Prof. {classroom.professorName}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ color: "#333", fontSize: 15 }}>No messages yet.</div>
          ) : (
            messages.map((msg, i) => {
              const name = msg.name ?? msg.agentName ?? "Unknown";
              const isProfessor = msg.role === "professor";
              const ts = typeof msg.timestamp === "number" ? msg.timestamp : 0;

              return (
                <div key={`${msg.timestamp}-${msg.agentId}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Name + badge + timestamp */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {msg.agentId && msg.agentId !== "sim" && (
                      <AgentAvatar agentId={msg.agentId} size={24} />
                    )}
                    <span style={{ color: isProfessor ? "#fff" : "#888", fontSize: 15 }}>
                      {name}
                    </span>
                    <span
                      style={{
                        color: "#555",
                        fontSize: 10,
                        letterSpacing: 2,
                        border: "1px solid #1a1a1a",
                        padding: "1px 6px",
                        textTransform: "uppercase",
                      }}
                    >
                      {isProfessor ? "PROF" : "STUDENT"}
                    </span>
                    {ts > 0 && (
                      <span style={{ color: "#333", fontSize: 11 }}>{formatTime(ts)}</span>
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ color: "#aaa", fontSize: 15, paddingLeft: 0, lineHeight: 1.4 }}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Participant list */}
      <div
        style={{
          width: 200,
          borderLeft: "1px solid #1a1a1a",
          paddingLeft: 16,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#444",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Participants ({classroom?.participantCount ?? 0})
        </div>

        {(classroom?.participants ?? []).map((p) => (
          <div key={p.id} style={{ marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AgentAvatar agentId={p.id} size={28} />
            <div>
              <div style={{ color: "#fff", fontSize: 14 }}>{p.name}</div>
              <div style={{ color: "#555", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
                {p.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
