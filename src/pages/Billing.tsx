import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePaypalCheckout, type PaypalPlanKey } from "@/hooks/usePaypalCheckout";

const PLANS: Record<string, {
  name: string;
  description: string;
  monthly: { price: string; planKey: PaypalPlanKey };
  annual: { price: string; planKey: PaypalPlanKey };
  features: string[];
  icon: typeof Zap;
  badge: string;
}> = {
  premium: {
    name: "Premium",
    description: "For growing businesses that need the full suite.",
    monthly: { price: "$12/mo", planKey: "premium_monthly" },
    annual: { price: "$99/yr", planKey: "premium_yearly" },
    features: ["5 users", "All 17 modules", "AI CFO Assistant", "Multi-currency", "Fleet & maintenance", "Email support"],
    icon: Zap,
    badge: "Most popular",
  },
  enterprise: {
    name: "Enterprise",
    description: "Unlimited scale with white-labeling and reseller tools.",
    monthly: { price: "$29/mo", planKey: "enterprise_monthly" },
    annual: { price: "$249/yr", planKey: "enterprise_yearly" },
    features: ["Unlimited users", "All 17 modules", "White-label branding", "Reseller portal", "API access", "Priority support"],
    icon: Shield,
    badge: "Full power",
  },
};

export default function Billing() {
  const { tenant, profile, refreshProfile } = useAuth();
  const { startCheckout, syncSubscription, loading } = usePaypalCheckout();
  const [activeSubscription, setActiveSubscription] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaypalPlanKey | null>(null);

  const currentTier = useMemo(() => tenant?.subscription_tier ?? "starter", [tenant?.subscription_tier]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionId = params.get("subscription_id") || params.get("ba_token");
    const success = params.get("paypal") === "success" || Boolean(subscriptionId);
    if (!success || !subscriptionId) return;

    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        try {
          const result = await syncSubscription(subscriptionId);
          if (result?.status === "active") {
            setActiveSubscription(subscriptionId);
            await refreshProfile?.();
            toast.success("PayPal subscription is live");
            window.history.replaceState({}, "", "/billing");
            return;
          }
        } catch (err: any) {
          if (attempt === 7) toast.error(err.message || "PayPal subscription sync is still pending");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    })();

    return () => { cancelled = true; };
  }, [refreshProfile, syncSubscription]);

  const handleSubscribe = async (planKey: PaypalPlanKey) => {
    setSelectedPlan(planKey);
    try {
      await startCheckout({ planKey, tenantId: tenant?.id, customerEmail: profile?.email });
    } catch (err: any) {
      toast.error(err.message || "Unable to start PayPal checkout");
    } finally {
      setSelectedPlan(null);
    }
  };

  return (
    <AppLayout title="Billing & Subscription" subtitle="Upgrade your plan with live PayPal billing">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="rounded-lg border border-border bg-card px-5 py-4 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Current plan: <span className="capitalize">{currentTier}</span></p>
            <p className="text-xs text-muted-foreground">PayPal live checkout is used for all paid upgrades.</p>
          </div>
          {activeSubscription && <Badge variant="secondary" className="w-fit">Subscription active</Badge>}
        </div>

        <Tabs defaultValue="premium" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="premium">Premium</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
          </TabsList>

          {Object.entries(PLANS).map(([key, plan]) => {
            const Icon = plan.icon;
            return (
              <TabsContent key={key} value={key}>
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-0.5">{plan.badge}</Badge>
                      </div>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Monthly", option: plan.monthly, note: "Billed monthly · cancel anytime" },
                        { label: "Annual", option: plan.annual, note: "Best value · billed annually" },
                      ].map(({ label, option, note }) => {
                        const isLoading = loading && selectedPlan === option.planKey;
                        return (
                          <div key={option.planKey} className="rounded-xl border border-border p-4 space-y-3">
                            <div>
                              <p className="font-semibold text-lg">{option.price}</p>
                              <p className="text-xs text-muted-foreground">{note}</p>
                            </div>
                            <Button className="w-full gap-2" onClick={() => handleSubscribe(option.planKey)} disabled={loading}>
                              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                              {currentTier === key ? `Switch to ${label}` : `Upgrade to ${plan.name} ${label}`}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Payments and subscriptions are securely processed by PayPal Live.
        </p>
      </div>
    </AppLayout>
  );
}
