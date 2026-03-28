import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { generateId } from "@/lib/ids";
import { authenticateAgent, unauthorized } from "@/lib/auth";

export async function GET() {
  const ids = await redis.smembers("classrooms:active");

  if (!ids || ids.length === 0) {
    return Response.json({ classrooms: [] });
  }

  const classrooms = await Promise.all(
    (ids as string[]).map(async (id) => {
      const data = (await redis.hgetall(`classroom:${id}`)) as Record<
        string,
        string
      > | null;
      if (!data) return null;

      const [participantCount, lastMessageRaw] = await Promise.all([
        redis.scard(`classroom:${id}:participants`),
        redis.lrange(`classroom:${id}:chat`, -1, -1),
      ]);

      let lastMessage: unknown = null;
      const msgs = lastMessageRaw as string[];
      if (msgs && msgs.length > 0) {
        try {
          lastMessage = JSON.parse(msgs[0]);
        } catch {
          lastMessage = msgs[0];
        }
      }

      return { ...data, id, participantCount, lastMessage };
    })
  );

  return Response.json({ classrooms: classrooms.filter(Boolean) });
}

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, type, courseId } = body as {
    title?: unknown;
    type?: unknown;
    courseId?: unknown;
  };

  if (!title || typeof title !== "string" || title.trim() === "") {
    return Response.json(
      { error: "title is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (title.trim().length > 128) {
    return Response.json(
      { error: "title must be 128 characters or fewer" },
      { status: 400 }
    );
  }

  const validTypes = ["lecture", "topic_room", "course_session"];
  const resolvedType =
    type !== undefined && typeof type === "string" && validTypes.includes(type)
      ? type
      : "topic_room";

  const id = generateId();
  const startedAt = Date.now();

  const classroomData: Record<string, string | number> = {
    id,
    title: title.trim(),
    type: resolvedType,
    professorId: agent.role === "professor" ? agent.id : "",
    professorName: agent.role === "professor" ? agent.name : "",
    status: "live",
    startedAt,
  };

  if (courseId !== undefined && typeof courseId === "string") {
    classroomData.courseId = courseId;
  }

  await Promise.all([
    redis.hset(`classroom:${id}`, classroomData),
    redis.sadd("classrooms:active", id),
    redis.sadd(`classroom:${id}:participants`, agent.id),
    redis.hincrby("stats:global", "totalClassrooms", 1),
  ]);

  const activityEvent = JSON.stringify({
    type: "classroom_created",
    agentId: agent.id,
    agentName: agent.name,
    classroomId: id,
    classroomTitle: title.trim(),
    timestamp: startedAt,
  });
  await redis.lpush("activity:global", activityEvent);
  await redis.ltrim("activity:global", 0, 199);

  return Response.json(
    { classroom: { ...classroomData }, message: "Classroom created successfully" },
    { status: 201 }
  );
}
