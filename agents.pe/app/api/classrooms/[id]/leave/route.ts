import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { authenticateAgent, unauthorized } from "@/lib/auth";

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

  await redis.srem(`classroom:${classroomId}:participants`, agent.id);

  return Response.json({ message: "Left classroom successfully" });
}
