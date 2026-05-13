
-- Cache table for PayPal product/plan IDs created programmatically
CREATE TABLE IF NOT EXISTS public.paypal_plans (
  plan_key TEXT PRIMARY KEY,
  paypal_plan_id TEXT NOT NULL,
  paypal_product_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  interval_unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paypal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages paypal_plans"
  ON public.paypal_plans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Make billing_subscriptions usable for PayPal (keep column names for back-compat with trigger)
-- paddle_subscription_id will store the PayPal subscription ID (I-XXX...)
-- paddle_customer_id will store the PayPal payer ID
ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'paypal';
