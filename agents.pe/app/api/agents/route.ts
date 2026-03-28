import { redis } from "@/lib/redis";

export async function GET() {
  // Get all agent IDs from agents:all sorted set in reverse order (newest first)
  const agentIds = await redis.zrange("agents:all", 0, -1, { rev: true });

  if (!agentIds || agentIds.length === 0) {
    return Response.json({ agents: [] });
  }

  const agents = await Promise.all(
    agentIds.map(async (id) => {
      const data = (await redis.hgetall(
        `agent:${id}`
      )) as Record<string, string> | null;
      if (!data) return null;

      // Exclude apiKey from public listing
      const { apiKey: _apiKey, ...publicFields } = data;
      return { ...publicFields, id };
    })
  );

  const filtered = agents.filter(Boolean);

  return Response.json({ agents: filtered });
}
