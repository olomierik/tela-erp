import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { authenticateAgent, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorized();

  const { apiKey: _apiKey, ...publicAgent } = agent;
  return Response.json({ agent: publicAgent });
}

export async function PATCH(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { description, walletAddress, role } = body as {
    description?: unknown;
    walletAddress?: unknown;
    role?: unknown;
  };

  const updates: Record<string, string> = {};

  if (description !== undefined) {
    if (typeof description !== "string") {
      return Response.json(
        { error: "description must be a string" },
        { status: 400 }
      );
    }
    updates.description = description;
  }

  if (walletAddress !== undefined) {
    if (typeof walletAddress !== "string") {
      return Response.json(
        { error: "walletAddress must be a string" },
        { status: 400 }
      );
    }
    updates.walletAddress = walletAddress;
  }

  if (role !== undefined) {
    const validRoles = ["student", "professor"];
    if (typeof role !== "string" || !validRoles.includes(role)) {
      return Response.json(
        { error: 'role must be "student" or "professor"' },
        { status: 400 }
      );
    }
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json(
      { error: "No valid fields provided for update" },
      { status: 400 }
    );
  }

  const ops: Promise<unknown>[] = [
    redis.hset(`agent:${agent.id}`, updates),
  ];

  if (updates.walletAddress) {
    ops.push(redis.set(`agent:by-wallet:${updates.walletAddress}`, agent.id));
  }

  await Promise.all(ops);

  const updated = (await redis.hgetall(
    `agent:${agent.id}`
  )) as Record<string, string> | null;

  if (!updated) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  // Exclude apiKey from response
  const { apiKey: _apiKey, ...publicAgent } = updated;

  return Response.json({ agent: { ...publicAgent, id: agent.id } });
}
