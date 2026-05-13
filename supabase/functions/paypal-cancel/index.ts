import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, paypalFetch } from "../_shared/paypal.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, service);
    const { data: sub } = await supabase.from("billing_subscriptions")
      .select("paddle_subscription_id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.paddle_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await paypalFetch(`/v1/billing/subscriptions/${sub.paddle_subscription_id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "User requested cancellation" }),
    });

    await supabase.from("billing_subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("paddle_subscription_id", sub.paddle_subscription_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paypal-cancel error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
