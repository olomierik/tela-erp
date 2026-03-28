import { getPaymentConfig } from "@/lib/x402";

export async function GET() {
  return Response.json({ payment: getPaymentConfig() });
}
