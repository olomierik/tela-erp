import { redis } from "@/lib/redis";

export async function GET() {
  const now = Date.now();

  const [hash, agentsOnline, activeClassrooms] = await Promise.all([
    redis.hgetall("stats:global") as Promise<Record<string, string> | null>,
    redis.zcount("agents:online", now - 60000, now),
    redis.scard("classrooms:active"),
  ]);

  const raw = hash ?? {};

  const stats = {
    totalAgents: parseInt(raw.totalAgents ?? "0", 10),
    totalCourses: parseInt(raw.totalCourses ?? "0", 10),
    totalClassrooms: parseInt(raw.totalClassrooms ?? "0", 10),
    totalEnrollments: parseInt(raw.totalEnrollments ?? "0", 10),
    agentsOnline,
    activeClassrooms,
  };

  return Response.json({ stats });
}
