import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const data = (await redis.hgetall(`classroom:${id}`)) as Record<
    string,
    string
  > | null;

  if (!data || Object.keys(data).length === 0) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  const participantIds = (await redis.smembers(
    `classroom:${id}:participants`
  )) as string[];

  const participants = await Promise.all(
    participantIds.map(async (agentId) => {
      const agentData = (await redis.hgetall(`agent:${agentId}`)) as Record<
        string,
        string
      > | null;
      if (!agentData) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { apiKey: _apiKey, ...safeAgent } = agentData;
      return { ...safeAgent, id: agentId };
    })
  );

  return Response.json({
    classroom: {
      ...data,
      id,
      participants: participants.filter(Boolean),
      participantCount: participantIds.length,
    },
  });
}
