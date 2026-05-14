-- Ensure PayPal billing records can drive tenant subscription tiers reliably
ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'paypal';

CREATE INDEX IF NOT EXISTS idx_billing_subs_provider_status
  ON public.billing_subscriptions(provider, status);

CREATE INDEX IF NOT EXISTS idx_billing_subs_user_created
  ON public.billing_subscriptions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_subs_tenant_created
  ON public.billing_subscriptions(tenant_id, created_at DESC);

-- Keep tenant tier synced from live billing status
CREATE OR REPLACE FUNCTION public.sync_tenant_tier_from_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tier text;
  is_active boolean;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  is_active := (NEW.status IN ('active', 'trialing', 'approved', 'past_due')
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

DROP TRIGGER IF EXISTS sync_tenant_tier_trigger ON public.billing_subscriptions;
CREATE TRIGGER sync_tenant_tier_trigger
AFTER INSERT OR UPDATE OF status, current_period_end, product_id, tenant_id
ON public.billing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_tier_from_billing();

-- Refresh any existing PayPal billing rows through the restored trigger
UPDATE public.billing_subscriptions
SET updated_at = now()
WHERE provider = 'paypal';

CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.billing_subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND provider = 'paypal'
      AND (
        (status IN ('active', 'trialing', 'approved', 'past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;