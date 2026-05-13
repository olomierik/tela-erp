import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, ensurePlanId, paypalFetch, type PlanKey } from "../_shared/paypal.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { planKey, tenantId, returnUrl, cancelUrl, customerEmail } = body as {
      planKey: PlanKey;
      tenantId?: string;
      returnUrl?: string;
      cancelUrl?: string;
      customerEmail?: string;
    };

    const valid = ["premium_monthly", "premium_yearly", "enterprise_monthly", "enterprise_yearly"];
    if (!planKey || !valid.includes(planKey)) {
      return new Response(JSON.stringify({ error: "Invalid planKey" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, service);
    const planId = await ensurePlanId(supabase, planKey);

    const origin = returnUrl?.split("/").slice(0, 3).join("/") ||
      "https://tela-erp.com";

    const subscription = await paypalFetch("/v1/billing/subscriptions", {
      method: "POST",
      headers: { "PayPal-Request-Id": `sub-${user.id}-${Date.now()}` },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: customerEmail ? { email_address: customerEmail } : undefined,
        application_context: {
          brand_name: "TELA-ERP",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payer_selected: "PAYPAL",
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
          },
          return_url: returnUrl || `${origin}/billing?paypal=success`,
          cancel_url: cancelUrl || `${origin}/billing?paypal=cancelled`,
        },
        custom_id: JSON.stringify({ userId: user.id, tenantId: tenantId ?? null, planKey }),
      }),
    });

    // Pre-record (status: APPROVAL_PENDING). Webhook will confirm activation.
    await supabase.from("billing_subscriptions").upsert({
      user_id: user.id,
      tenant_id: tenantId ?? null,
      paddle_subscription_id: subscription.id,
      paddle_customer_id: subscription.id, // payer ID unknown until activated
      product_id: planKey.startsWith("premium") ? "premium_plan" : "enterprise_plan",
      price_id: planKey,
      status: "pending",
      environment: "live",
      provider: "paypal",
    }, { onConflict: "paddle_subscription_id" });

    const approvalLink = subscription.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approvalLink) throw new Error("PayPal did not return an approval URL");

    return new Response(JSON.stringify({
      subscriptionId: subscription.id,
      approvalUrl: approvalLink,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("paypal-checkout error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
