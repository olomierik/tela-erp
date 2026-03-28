import { redis } from "@/lib/redis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const data = (await redis.hgetall(
    `agent:${id}`
  )) as Record<string, string> | null;

  if (!data || Object.keys(data).length === 0) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  // Exclude apiKey from public response
  const { apiKey: _apiKey, ...publicFields } = data;

  return Response.json({ agent: { ...publicFields, id } });
}
