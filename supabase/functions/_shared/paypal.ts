// PayPal REST API helpers (LIVE)
const PAYPAL_BASE = "https://api-m.paypal.com";

let cachedToken: { value: string; exp: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.value;
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    console.error("PayPal API error", path, res.status, data);
    throw new Error(data?.message || data?.name || `PayPal ${res.status}`);
  }
  return data;
}

// ---- Plan catalog (matches frontend tier IDs) ----
export type PlanKey =
  | "premium_monthly"
  | "premium_yearly"
  | "enterprise_monthly"
  | "enterprise_yearly";

export const VALID_PLAN_KEYS: PlanKey[] = [
  "premium_monthly",
  "premium_yearly",
  "enterprise_monthly",
  "enterprise_yearly",
];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (VALID_PLAN_KEYS as string[]).includes(value);
}

export function productIdFromPlanKey(planKey: PlanKey): "premium_plan" | "enterprise_plan" {
  return planKey.startsWith("enterprise") ? "enterprise_plan" : "premium_plan";
}

export function tierFromPlanKey(planKey: string): "premium" | "enterprise" | "starter" {
  if (planKey?.startsWith("premium")) return "premium";
  if (planKey?.startsWith("enterprise")) return "enterprise";
  return "starter";
}

export function parseCustomId(value: unknown): { userId?: string; tenantId?: string | null; planKey?: PlanKey } {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    const planKey = isPlanKey(parsed.planKey ?? parsed.p) ? (parsed.planKey ?? parsed.p) : undefined;
    return {
      userId: parsed.userId ?? parsed.u,
      tenantId: parsed.tenantId ?? parsed.t ?? null,
      planKey,
    };
  } catch (_) {
    return {};
  }
}

export const PLAN_CATALOG: Record<PlanKey, {
  productId: string;
  productName: string;
  description: string;
  amount: string;
  intervalUnit: "MONTH" | "YEAR";
}> = {
  premium_monthly: {
    productId: "premium_plan",
    productName: "TELA-ERP Premium",
    description: "All 17 modules, up to 5 users",
    amount: "12.00",
    intervalUnit: "MONTH",
  },
  premium_yearly: {
    productId: "premium_plan",
    productName: "TELA-ERP Premium",
    description: "All 17 modules, up to 5 users (annual)",
    amount: "99.00",
    intervalUnit: "YEAR",
  },
  enterprise_monthly: {
    productId: "enterprise_plan",
    productName: "TELA-ERP Enterprise",
    description: "Unlimited users, white-label, API access",
    amount: "29.00",
    intervalUnit: "MONTH",
  },
  enterprise_yearly: {
    productId: "enterprise_plan",
    productName: "TELA-ERP Enterprise",
    description: "Unlimited users, white-label, API access (annual)",
    amount: "249.00",
    intervalUnit: "YEAR",
  },
};

// In-memory cache; cleared on cold start. Plan IDs are also persisted in DB on first creation
// in production you'd want to load these from the paypal_plans table.
async function ensureProduct(productId: string, name: string, description: string): Promise<string> {
  try {
    const existing = await paypalFetch(`/v1/catalogs/products/${productId}`);
    if (existing?.id) return existing.id;
  } catch (_) { /* not found, create */ }

  const created = await paypalFetch("/v1/catalogs/products", {
    method: "POST",
    headers: { "PayPal-Request-Id": `prod-${productId}` },
    body: JSON.stringify({
      id: productId,
      name,
      description,
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  return created.id;
}

async function createPlan(
  productId: string,
  planKey: PlanKey,
  amount: string,
  intervalUnit: "MONTH" | "YEAR",
): Promise<string> {
  const plan = await paypalFetch("/v1/billing/plans", {
    method: "POST",
    headers: { "PayPal-Request-Id": `plan-${planKey}-${Date.now()}` },
    body: JSON.stringify({
      product_id: productId,
      name: `TELA-ERP ${planKey}`,
      description: `Subscription plan ${planKey}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: intervalUnit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: amount, currency_code: "USD" } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: "0", currency_code: "USD" },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 2,
      },
    }),
  });
  return plan.id;
}

export async function ensurePlanId(
  supabase: any,
  planKey: PlanKey,
): Promise<string> {
  // Check DB cache
  const { data: existing } = await supabase
    .from("paypal_plans")
    .select("paypal_plan_id")
    .eq("plan_key", planKey)
    .maybeSingle();
  if (existing?.paypal_plan_id) return existing.paypal_plan_id;

  const cfg = PLAN_CATALOG[planKey];
  const productId = await ensureProduct(cfg.productId, cfg.productName, cfg.description);
  const planId = await createPlan(productId, planKey, cfg.amount, cfg.intervalUnit);

  await supabase.from("paypal_plans").upsert({
    plan_key: planKey,
    paypal_plan_id: planId,
    paypal_product_id: productId,
    amount: cfg.amount,
    interval_unit: cfg.intervalUnit,
  });

  return planId;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time",
};
