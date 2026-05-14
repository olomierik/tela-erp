import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, parseCustomId, paypalFetch, productIdFromPlanKey } from "../_shared/paypal.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subscriptionId } = await req.json() as { subscriptionId?: string };
    if (!subscriptionId || !subscriptionId.startsWith("I-")) {
      return new Response(JSON.stringify({ error: "Invalid subscriptionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
    const custom = parseCustomId(sub.custom_id);
    if (custom.userId && custom.userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: cached } = await admin
      .from("paypal_plans")
      .select("plan_key")
      .eq("paypal_plan_id", sub.plan_id)
      .maybeSingle();
    const planKey = custom.planKey ?? cached?.plan_key;
    if (!planKey) throw new Error("Unable to resolve PayPal plan");

    const status = sub.status === "ACTIVE" || sub.status === "APPROVAL_PENDING"
      ? (sub.status === "ACTIVE" ? "active" : "pending")
      : String(sub.status || "pending").toLowerCase();

    await admin.from("billing_subscriptions").upsert({
      user_id: user.id,
      tenant_id: custom.tenantId ?? null,
      paddle_subscription_id: sub.id,
      paddle_customer_id: sub.subscriber?.payer_id ?? sub.id,
      product_id: productIdFromPlanKey(planKey),
      price_id: planKey,
      status,
      current_period_start: sub.billing_info?.last_payment?.time ?? null,
      current_period_end: sub.billing_info?.next_billing_time ?? null,
      environment: "live",
      provider: "paypal",
      updated_at: new Date().toISOString(),
    }, { onConflict: "paddle_subscription_id" });

    return new Response(JSON.stringify({ ok: true, status, planKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paypal-sync error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
