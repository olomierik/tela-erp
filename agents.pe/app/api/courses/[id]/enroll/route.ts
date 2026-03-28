import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { authenticateAgent, unauthorized } from "@/lib/auth";
import { getPaymentConfig, USDC_SOLANA } from "@/lib/x402";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorized();

  const { id: courseId } = await params;

  const courseData = (await redis.hgetall(`course:${courseId}`)) as Record<
    string,
    string
  > | null;

  if (!courseData || Object.keys(courseData).length === 0) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  if (courseData.status !== "active") {
    return Response.json(
      { error: "Course is not active" },
      { status: 400 }
    );
  }

  const alreadyEnrolled = await redis.sismember(
    `course:${courseId}:enrolled`,
    agent.id
  );

  if (alreadyEnrolled) {
    return Response.json(
      { error: "Already enrolled in this course" },
      { status: 409 }
    );
  }

  const price = parseFloat(courseData.price ?? "0");

  if (price > 0) {
    const xPayment = req.headers.get("x-payment");

    if (!xPayment) {
      const payConfig = getPaymentConfig();
      const professorId = courseData.professorId;
      let professorWallet = "";
      if (professorId) {
        professorWallet = (await redis.hget(`agent:${professorId}`, "walletAddress")) as string || "";
      }

      if (!professorWallet && !payConfig.platformWallet) {
        return Response.json(
          { error: "Course payment cannot be processed: no receiving wallet configured" },
          { status: 400 }
        );
      }

      const payTo = professorWallet || payConfig.platformWallet;
      const amount = Math.round(price * 1_000_000).toString();

      const paymentRequirements = {
        scheme: "exact",
        network: payConfig.network,
        amount,
        asset: USDC_SOLANA,
        payTo,
        maxTimeoutSeconds: 60,
        description: `Enrollment in ${courseData.title}`,
        resource: `/api/courses/${courseId}/enroll`,
      };

      return Response.json(
        {
          error: "Payment required",
          paymentRequirements,
        },
        {
          status: 402,
          headers: {
            "X-Payment-Requirements": JSON.stringify(paymentRequirements),
          },
        }
      );
    }

    // x-payment header present — accept as proof of payment and proceed
  }

  const enrolledAt = Date.now();

  const enrollmentData: Record<string, string | number> = {
    agentId: agent.id,
    courseId,
    enrolledAt,
    status: "enrolled",
  };

  const activityEvent = JSON.stringify({
    type: "agent_enrolled",
    agentId: agent.id,
    agentName: agent.name,
    courseId,
    courseTitle: courseData.title,
    timestamp: enrolledAt,
  });

  await Promise.all([
    redis.hset(`enrollment:${agent.id}:${courseId}`, enrollmentData),
    redis.sadd(`course:${courseId}:enrolled`, agent.id),
    redis.hincrby("stats:global", "totalEnrollments", 1),
  ]);

  await redis.lpush("activity:global", activityEvent);
  await redis.ltrim("activity:global", 0, 199);

  return Response.json(
    {
      enrollment: enrollmentData,
      message: "Successfully enrolled in course",
    },
    { status: 201 }
  );
}
