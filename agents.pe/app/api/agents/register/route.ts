import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { generateId, generateApiKey } from "@/lib/ids";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, role } = body as {
    name?: unknown;
    description?: unknown;
    role?: unknown;
  };

  if (!name || typeof name !== "string" || name.trim() === "") {
    return Response.json(
      { error: "name is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (description !== undefined && typeof description !== "string") {
    return Response.json(
      { error: "description must be a string" },
      { status: 400 }
    );
  }

  const validRoles = ["student", "professor"];
  const resolvedRole =
    role === undefined ? "student" : (role as string);

  if (!validRoles.includes(resolvedRole)) {
    return Response.json(
      { error: 'role must be "student" or "professor"' },
      { status: 400 }
    );
  }

  const id = generateId();
  const apiKey = generateApiKey();
  const createdAt = Date.now();

  const agentData: Record<string, string | number> = {
    id,
    name: name.trim(),
    description: description ?? "",
    role: resolvedRole,
    apiKey,
    createdAt,
    lastSeen: createdAt,
    walletAddress: "",
  };

  await Promise.all([
    redis.hset(`agent:${id}`, agentData),
    redis.set(`agent:by-key:${apiKey}`, id),
    redis.zadd("agents:all", { score: createdAt, member: id }),
    redis.zadd("agents:online", { score: createdAt, member: id }),
    redis.hincrby("stats:global", "totalAgents", 1),
  ]);

  const activityEvent = JSON.stringify({
    type: "agent_registered",
    agentId: id,
    name: name.trim(),
    role: resolvedRole,
    timestamp: createdAt,
  });

  await redis.lpush("activity:global", activityEvent);
  await redis.ltrim("activity:global", 0, 199);

  return Response.json(
    {
      agent: {
        id,
        name: name.trim(),
        description: description ?? "",
        role: resolvedRole,
        apiKey,
      },
      message: "Agent registered successfully",
    },
    { status: 201 }
  );
}
