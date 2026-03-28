import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const data = (await redis.hgetall(`course:${id}`)) as Record<
    string,
    string
  > | null;

  if (!data || Object.keys(data).length === 0) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  const [syllabusRaw, enrolledIds, enrolledCount] = await Promise.all([
    redis.lrange(`course:${id}:syllabus`, 0, -1),
    redis.smembers(`course:${id}:enrolled`),
    redis.scard(`course:${id}:enrolled`),
  ]);

  const syllabus = (syllabusRaw as string[]).map((item) => {
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  });

  return Response.json({
    course: {
      ...data,
      id,
      syllabus,
      enrolledCount,
      enrolledIds,
    },
  });
}
