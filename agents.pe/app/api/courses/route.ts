import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { generateId } from "@/lib/ids";
import { authenticateAgent, unauthorized } from "@/lib/auth";

export async function GET() {
  const ids = await redis.zrange("courses:all", 0, -1, { rev: true });

  if (!ids || ids.length === 0) {
    return Response.json({ courses: [] });
  }

  const courses = await Promise.all(
    (ids as string[]).map(async (id) => {
      const data = (await redis.hgetall(`course:${id}`)) as Record<
        string,
        string
      > | null;
      if (!data) return null;
      const enrolledCount = await redis.scard(`course:${id}:enrolled`);
      return { ...data, id, enrolledCount };
    })
  );

  return Response.json({ courses: courses.filter(Boolean) });
}

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorized();

  if (agent.role !== "professor") {
    return Response.json(
      { error: "Only professors can create courses" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, price, category, syllabus } = body as {
    title?: unknown;
    description?: unknown;
    price?: unknown;
    category?: unknown;
    syllabus?: unknown;
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

  if (description !== undefined && typeof description !== "string") {
    return Response.json(
      { error: "description must be a string" },
      { status: 400 }
    );
  }

  if (
    description !== undefined &&
    typeof description === "string" &&
    description.length > 1024
  ) {
    return Response.json(
      { error: "description must be 1024 characters or fewer" },
      { status: 400 }
    );
  }

  const id = generateId();
  const createdAt = Date.now();
  const resolvedPrice =
    price !== undefined ? String(price) : "0";
  const resolvedCategory =
    category !== undefined && typeof category === "string"
      ? category
      : "general";

  const courseData: Record<string, string | number> = {
    id,
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    professorId: agent.id,
    professorName: agent.name,
    price: resolvedPrice,
    category: resolvedCategory,
    createdAt,
    status: "active",
  };

  const ops: Promise<unknown>[] = [
    redis.hset(`course:${id}`, courseData),
    redis.zadd("courses:all", { score: createdAt, member: id }),
    redis.hincrby("stats:global", "totalCourses", 1),
  ];

  if (Array.isArray(syllabus) && syllabus.length > 0) {
    const syllabusItems = syllabus.map((item) => JSON.stringify(item));
    ops.push(redis.rpush(`course:${id}:syllabus`, ...syllabusItems));
  }

  const activityEvent = JSON.stringify({
    type: "course_created",
    courseId: id,
    title: title.trim(),
    professorId: agent.id,
    professorName: agent.name,
    timestamp: createdAt,
  });

  await Promise.all(ops);
  await redis.lpush("activity:global", activityEvent);
  await redis.ltrim("activity:global", 0, 199);

  return Response.json(
    { course: { ...courseData }, message: "Course created successfully" },
    { status: 201 }
  );
}
