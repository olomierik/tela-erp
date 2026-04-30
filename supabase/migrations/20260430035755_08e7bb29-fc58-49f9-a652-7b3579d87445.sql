
-- Allow 'premium' tier
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_subscription_tier_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_subscription_tier_check
  CHECK (subscription_tier = ANY (ARRAY['starter'::text, 'pro'::text, 'premium'::text, 'enterprise'::text]));

-- Billing subscriptions table (Paddle-tracked)
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  paddle_subscription_id text NOT NULL UNIQUE,
  paddle_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_subs_user_id ON public.billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_tenant_id ON public.billing_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_paddle_id ON public.billing_subscriptions(paddle_subscription_id);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own billing subscription"
  ON public.billing_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages billing subscriptions"
  ON public.billing_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Active subscription helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.billing_subscriptions
    WHERE user_id = user_uuid
    AND environment = check_env
    AND (
      (status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())
    )
  );
$$;

-- Tier sync trigger
CREATE OR REPLACE FUNCTION public.sync_tenant_tier_from_billing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tier text;
  is_active boolean;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  is_active := (NEW.status IN ('active', 'trialing', 'past_due')
                AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()))
            OR (NEW.status = 'canceled' AND NEW.current_period_end > now());

  IF is_active THEN
    new_tier := CASE
      WHEN NEW.product_id = 'enterprise_plan' THEN 'enterprise'
      WHEN NEW.product_id = 'premium_plan' THEN 'premium'
      ELSE 'starter'
    END;
  ELSE
    new_tier := 'starter';
  END IF;

  UPDATE public.tenants
  SET subscription_tier = new_tier,
      updated_at = now()
  WHERE id = NEW.tenant_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_tenant_tier_trigger
AFTER INSERT OR UPDATE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_tier_from_billing();
