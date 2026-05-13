import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Zap, Shield } from "lucide-react";
import PayPalSubscribeButton from "@/components/billing/PayPalSubscribeButton";

const PLANS = {
  growth: {
    name: "Growth",
    description: "For growing businesses that need the full suite.",
    monthly: { price: "$29/mo", planId: import.meta.env.VITE_PAYPAL_PLAN_GROWTH_MONTHLY as string },
    annual:  { price: "$23/mo · billed $276/yr", planId: import.meta.env.VITE_PAYPAL_PLAN_GROWTH_ANNUAL as string },
    features: ["25 users", "All 15 modules", "5 warehouses", "AI CFO Assistant", "Multi-currency", "API access"],
    icon: Zap,
    badge: "Most popular",
  },
  enterprise: {
    name: "Enterprise",
    description: "Unlimited scale with white-labeling and reseller tools.",
    monthly: { price: "$99/mo", planId: import.meta.env.VITE_PAYPAL_PLAN_ENTERPRISE_MONTHLY as string },
    annual:  { price: "$79/mo · billed $948/yr", planId: import.meta.env.VITE_PAYPAL_PLAN_ENTERPRISE_ANNUAL as string },
    features: ["Unlimited users", "All 15 modules", "Unlimited warehouses", "White-label branding", "Priority support (4h SLA)", "Reseller portal"],
    icon: Shield,
    badge: "Full power",
  },
};

export default function Billing() {
  const [activeSubscription, setActiveSubscription] = useState<string | null>(null);

  return (
    <AppLayout title="Billing & Subscription" subtitle="Upgrade your plan to unlock more features">
      <div className="max-w-4xl mx-auto space-y-8">

        {activeSubscription && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 text-green-800 text-sm">
            ✅ <strong>Subscription active!</strong> ID: <code className="font-mono text-xs">{activeSubscription}</code>
            <p className="mt-1 text-green-700 text-xs">Your plan has been activated. Refresh to see updated access.</p>
          </div>
        )}

        <Tabs defaultValue="growth" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
          </TabsList>

          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => {
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
                    <ul className="grid grid-cols-2 gap-1.5 mt-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Monthly */}
                      <div className="rounded-xl border p-4 space-y-3">
                        <div>
                          <p className="font-semibold text-lg">{plan.monthly.price}</p>
                          <p className="text-xs text-muted-foreground">Billed monthly · cancel anytime</p>
                        </div>
                        <PayPalSubscribeButton
                          planId={plan.monthly.planId}
                          planName={`${plan.name} Monthly`}
                          onSuccess={setActiveSubscription}
                        />
                      </div>
                      {/* Annual */}
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{plan.annual.price}</p>
                            <Badge className="text-xs bg-green-600 text-white">Save ~20%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Billed annually</p>
                        </div>
                        <PayPalSubscribeButton
                          planId={plan.annual.planId}
                          planName={`${plan.name} Annual`}
                          onSuccess={setActiveSubscription}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Payments are securely processed by PayPal. You can cancel at any time from your PayPal account.
        </p>
      </div>
    </AppLayout>
  );
}
