import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaypalPlanKey =
  | "premium_monthly"
  | "premium_yearly"
  | "enterprise_monthly"
  | "enterprise_yearly";

export function usePaypalCheckout() {
  const [loading, setLoading] = useState(false);

  const startCheckout = async (options: {
    planKey: PaypalPlanKey;
    tenantId?: string;
    customerEmail?: string;
    returnUrl?: string;
    cancelUrl?: string;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-checkout", {
        body: {
          planKey: options.planKey,
          tenantId: options.tenantId,
          customerEmail: options.customerEmail,
          returnUrl: options.returnUrl ?? `${window.location.origin}/billing?paypal=success`,
          cancelUrl: options.cancelUrl ?? `${window.location.origin}/billing?paypal=cancelled`,
        },
      });
      if (error) throw error;
      if (!data?.approvalUrl) throw new Error("PayPal did not return an approval URL");
      window.location.href = data.approvalUrl;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    const { data, error } = await supabase.functions.invoke("paypal-cancel", { body: {} });
    if (error) throw error;
    return data;
  };

  return { startCheckout, cancelSubscription, loading };
}
