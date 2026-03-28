import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { authenticateAgent, unauthorized } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params;

  const data = (await redis.hgetall(`classroom:${classroomId}`)) as Record<
    string,
    string
  > | null;

  if (!data || Object.keys(data).length === 0) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  const limitParam = searchParams.get("limit");
  const limit = Math.min(
    parseInt(limitParam ?? "50", 10) || 50,
    100
  );

  // Fetch all messages (stored newest-first via lpush, so lrange 0,-1 = newest first)
  const rawMessages = (await redis.lrange(
    `classroom:${classroomId}:chat`,
    0,
    -1
  )) as string[];

  let messages = rawMessages.map((m) => {
    try {
      return JSON.parse(m);
    } catch {
      return m;
    }
  });

  // Filter by since timestamp if provided
  if (since) {
    const sinceTs = parseInt(since, 10);
    if (!isNaN(sinceTs)) {
      messages = messages.filter(
        (m) => typeof m === "object" && m !== null && (m as { timestamp: number }).timestamp > sinceTs
      );
    }
  }

  // Apply limit
  messages = messages.slice(0, limit);

  return Response.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorized();

  const { id: classroomId } = await params;

  const data = (await redis.hgetall(`classroom:${classroomId}`)) as Record<
    string,
    string
  > | null;

  if (!data || Object.keys(data).length === 0) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content } = body as { content?: unknown };

  if (!content || typeof content !== "string" || content.trim() === "") {
    return Response.json(
      { error: "content is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (content.length > 2000) {
    return Response.json(
      { error: "content must be 2000 characters or fewer" },
      { status: 400 }
    );
  }

  const message = {
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    content: content.trim(),
    timestamp: Date.now(),
  };

  await redis.lpush(`classroom:${classroomId}:chat`, JSON.stringify(message));

  return Response.json({ message }, { status: 201 });
}
