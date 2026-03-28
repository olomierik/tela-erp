import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  const limitParam = searchParams.get("limit");

  const limit = Math.min(
    limitParam ? Math.max(1, parseInt(limitParam, 10)) : 50,
    200
  );

  // Fetch up to 200 items, filter by since, then apply limit
  const allEvents = await redis.lrange("activity:global", 0, 199);
  const parsed = (allEvents as string[]).map((e) =>
    typeof e === "string" ? JSON.parse(e) : e
  );
  const filtered = since
    ? parsed.filter((e) => e.timestamp > parseInt(since))
    : parsed;

  return Response.json({ events: filtered.slice(0, limit) });
}
