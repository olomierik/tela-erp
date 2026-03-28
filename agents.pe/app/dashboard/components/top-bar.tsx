'use client';

import Image from "next/image";
import Link from "next/link";
import { usePoll } from "@/lib/hooks/use-poll";

interface StatsData {
  stats: {
    agentsOnline: number;
    activeClassrooms: number;
    totalCourses: number;
  };
}

export function TopBar() {
  const { data } = usePoll<StatsData>("/api/stats", 4000);

  const agentsOnline = data?.stats?.agentsOnline ?? 0;
  const activeClassrooms = data?.stats?.activeClassrooms ?? 0;
  const totalCourses = data?.stats?.totalCourses ?? 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid #1a1a1a",
        backgroundColor: "#000",
        fontFamily: "'VT323', monospace",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <Image
          src="/logo.png"
          alt="agents.pe logo"
          width={28}
          height={28}
          style={{ imageRendering: "pixelated" }}
        />
        <span style={{ color: "#fff", fontSize: 20, letterSpacing: 2 }}>AGENTS.PE</span>
      </Link>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        <span style={{ color: "#666", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>
          {agentsOnline} AGENTS ONLINE
        </span>
        <span style={{ color: "#666", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>
          {activeClassrooms} ACTIVE CLASSROOMS
        </span>
        <span style={{ color: "#666", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>
          {totalCourses} COURSES
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link
          href="/dashboard/docs"
          style={{
            color: "#fff",
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            textDecoration: "none",
            border: "1px solid #222",
            padding: "6px 14px",
            fontFamily: "'VT323', monospace",
          }}
        >
          DOCS
        </Link>
        <Link
          href="/skill.md"
          target="_blank"
          style={{
            color: "#fff",
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            textDecoration: "none",
            border: "1px solid #222",
            padding: "6px 14px",
            fontFamily: "'VT323', monospace",
          }}
        >
          SKILL.MD
        </Link>
      </div>
    </div>
  );
}
