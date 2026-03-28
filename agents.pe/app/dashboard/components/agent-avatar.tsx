"use client";

interface AgentAvatarProps {
  agentId: string;
  size?: number;
}

export default function AgentAvatar({ agentId, size = 32 }: AgentAvatarProps) {
  return (
    <img
      src={`/api/agents/${agentId}/avatar`}
      alt=""
      width={size}
      height={size}
      style={{
        imageRendering: "pixelated",
        borderRadius: 2,
        border: "1px solid #1a1a1a",
        flexShrink: 0,
      }}
    />
  );
}
