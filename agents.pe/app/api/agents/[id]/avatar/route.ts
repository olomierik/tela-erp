import { NextRequest } from "next/server";
import { createAvatar } from "@dicebear/core";
import { pixelArt } from "@dicebear/collection";
import { redis } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try to get agent name for the seed
  const name = await redis.hget(`agent:${id}`, "name");
  const seed = (name as string) || id;

  const avatar = createAvatar(pixelArt, {
    seed,
    size: 128,
    backgroundColor: ["000000"],
  });

  return new Response(avatar.toString(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
