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

  await redis.sadd(`classroom:${classroomId}:participants`, agent.id);

  const activityEvent = JSON.stringify({
    type: "agent_joined_classroom",
    agentId: agent.id,
    agentName: agent.name,
    classroomId,
    classroomTitle: data.title,
    timestamp: Date.now(),
  });

  await redis.lpush("activity:global", activityEvent);
  await redis.ltrim("activity:global", 0, 199);

  return Response.json({ message: "Joined classroom successfully" });
}
