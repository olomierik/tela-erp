import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, paypalFetch } from "../_shared/paypal.ts";

// PayPal webhook handler. PUBLIC endpoint — verify signature via PayPal API.
// Configure webhook in https://developer.paypal.com → Apps → Webhooks pointing to:
//   https://<project>.supabase.co/functions/v1/paypal-webhook
// and subscribe to BILLING.SUBSCRIPTION.* events.

async function verifyWebhook(req: Request, body: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID not set — skipping signature verification (NOT recommended)");
    return true;
  }
  try {
    const verification = await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo"),
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });
    return verification?.verification_status === "SUCCESS";
  } catch (e) {
    console.error("Webhook verification failed", e);
    return false;
  }
}

function tierFromPlanKey(planKey: string): "premium" | "enterprise" | "starter" {
  if (planKey?.startsWith("premium")) return "premium";
  if (planKey?.startsWith("enterprise")) return "enterprise";
  return "starter";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const ok = await verifyWebhook(req, raw);
  if (!ok) {
    console.error("Invalid webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  console.log("PayPal webhook:", event.event_type);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const resource = event.resource ?? {};
    const subscriptionId: string | undefined = resource.id;

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED": {
        if (!subscriptionId) break;
        // Fetch full sub for accurate fields
        const sub = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
        const customId = sub.custom_id ? JSON.parse(sub.custom_id) : {};
        const planKey = customId.planKey ?? "premium_monthly";
        const product = tierFromPlanKey(planKey) === "enterprise" ? "enterprise_plan" : "premium_plan";

        await supabase.from("billing_subscriptions").upsert({
          user_id: customId.userId,
          tenant_id: customId.tenantId ?? null,
          paddle_subscription_id: sub.id,
          paddle_customer_id: sub.subscriber?.payer_id ?? sub.id,
          product_id: product,
          price_id: planKey,
          status: sub.status === "ACTIVE" ? "active" : sub.status.toLowerCase(),
          current_period_start: sub.billing_info?.last_payment?.time ?? null,
          current_period_end: sub.billing_info?.next_billing_time ?? null,
          environment: "live",
          provider: "paypal",
          updated_at: new Date().toISOString(),
        }, { onConflict: "paddle_subscription_id" });
        break;
      }
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        if (!subscriptionId) break;
        await supabase.from("billing_subscriptions")
          .update({
            status: event.event_type.includes("SUSPEND") ? "past_due" : "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("paddle_subscription_id", subscriptionId);
        break;
      }
      case "PAYMENT.SALE.COMPLETED": {
        // Renewal payment — bump period end via subscription fetch
        const subId = resource.billing_agreement_id;
        if (!subId) break;
        const sub = await paypalFetch(`/v1/billing/subscriptions/${subId}`);
        await supabase.from("billing_subscriptions").update({
          status: "active",
          current_period_start: sub.billing_info?.last_payment?.time ?? null,
          current_period_end: sub.billing_info?.next_billing_time ?? null,
          updated_at: new Date().toISOString(),
        }).eq("paddle_subscription_id", subId);
        break;
      }
      default:
        console.log("Unhandled event:", event.event_type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error", err);
    return new Response("Webhook error", { status: 500 });
  }
});
