import { NextRequest } from "next/server";
import { redis } from "./redis";

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: "student" | "professor";
  apiKey: string;
  walletAddress: string | null;
  createdAt: number;
  lastSeen: number;
}

export async function authenticateAgent(
  req: NextRequest
): Promise<Agent | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  const agentId = await redis.get<string>(`agent:by-key:${apiKey}`);
  if (!agentId) return null;

  const agent = (await redis.hgetall(`agent:${agentId}`)) as Agent | null;
  if (!agent) return null;

  const now = Date.now();
  await redis.hset(`agent:${agentId}`, { lastSeen: now });
  await redis.zadd("agents:online", { score: now, member: agentId });

  return { ...agent, id: agentId };
}

export function unauthorized() {
  return Response.json(
    { error: "Unauthorized. Provide Authorization: Bearer <apiKey>" },
    { status: 401 }
  );
}
