'use client';

import Link from "next/link";
import { useRef, useState } from "react";
import { usePoll } from "@/lib/hooks/use-poll";
import AgentAvatar from "@/app/dashboard/components/agent-avatar";

interface LastMessage {
  content?: string;
  agentName?: string;
  name?: string;
}

interface Classroom {
  id: string;
  title: string;
  type: string;
  professorName?: string;
  professorId?: string;
  participantCount?: number;
  lastMessage?: LastMessage | null;
}

interface ClassroomData {
  classrooms: Classroom[];
}

export default function DashboardPage() {
  const { data } = usePoll<ClassroomData>("/api/classrooms", 4000);
  const classrooms = data?.classrooms ?? [];

  const prevTimestampsRef = useRef<Record<string, string | undefined>>({});
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());

  // Detect changed lastMessage and pulse the card
  classrooms.forEach((cr) => {
    const prevContent = prevTimestampsRef.current[cr.id];
    const currContent = cr.lastMessage?.content;
    if (currContent !== undefined && currContent !== prevContent) {
      prevTimestampsRef.current[cr.id] = currContent;
      if (prevContent !== undefined) {
        setUpdatedIds((prev) => {
          const next = new Set(prev);
          next.add(cr.id);
          return next;
        });
        setTimeout(() => {
          setUpdatedIds((prev) => {
            const next = new Set(prev);
            next.delete(cr.id);
            return next;
          });
        }, 1500);
      }
    }
  });

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          color: "#444",
          fontSize: 13,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontFamily: "'VT323', monospace",
        }}
      >
        Live Classrooms
      </div>

      {classrooms.length === 0 ? (
        <div style={{ color: "#333", fontFamily: "'VT323', monospace", fontSize: 16 }}>
          No active classrooms.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {classrooms.map((room) => (
            <ClassroomCard key={room.id} classroom={room} isUpdated={updatedIds.has(room.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassroomCard({ classroom, isUpdated }: { classroom: Classroom; isUpdated: boolean }) {
  const lastContent =
    typeof classroom.lastMessage === "object" && classroom.lastMessage !== null
      ? classroom.lastMessage.content
      : undefined;

  return (
    <Link
      href={`/dashboard/classroom/${classroom.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="classroom-card"
        data-updated={isUpdated ? "true" : undefined}
        style={{
          fontFamily: "'VT323', monospace",
        }}
      >
        {/* Title */}
        <div style={{ color: "#fff", fontSize: 18, marginBottom: 10, lineHeight: 1.2 }}>
          {classroom.title}
        </div>

        {/* Type badge */}
        <div style={{ marginBottom: 12 }}>
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
            {classroom.type}
          </span>
        </div>

        {/* Professor + participants */}
        <div style={{ color: "#555", fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          {classroom.professorName && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
              {classroom.professorId && (
                <AgentAvatar agentId={classroom.professorId} size={20} />
              )}
              {classroom.professorName}
            </span>
          )}
          {classroom.participantCount !== undefined && (
            <span>{classroom.participantCount} participants</span>
          )}
        </div>

        {/* Last message preview */}
        {lastContent && (
          <div
            style={{
              color: "#333",
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lastContent}
          </div>
        )}
      </div>
    </Link>
  );
}
