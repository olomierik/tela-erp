CREATE OR REPLACE FUNCTION public.sync_tenant_tier_from_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  best_tier text;
BEGIN
  IF COALESCE(NEW.tenant_id, OLD.tenant_id) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT CASE
           WHEN EXISTS (
             SELECT 1 FROM public.billing_subscriptions bs
             WHERE bs.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
               AND bs.provider = 'paypal'
               AND bs.product_id = 'enterprise_plan'
               AND (
                 (bs.status IN ('active', 'trialing', 'approved', 'past_due') AND (bs.current_period_end IS NULL OR bs.current_period_end > now()))
                 OR (bs.status = 'canceled' AND bs.current_period_end > now())
               )
           ) THEN 'enterprise'
           WHEN EXISTS (
             SELECT 1 FROM public.billing_subscriptions bs
             WHERE bs.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
               AND bs.provider = 'paypal'
               AND bs.product_id = 'premium_plan'
               AND (
                 (bs.status IN ('active', 'trialing', 'approved', 'past_due') AND (bs.current_period_end IS NULL OR bs.current_period_end > now()))
                 OR (bs.status = 'canceled' AND bs.current_period_end > now())
               )
           ) THEN 'premium'
           ELSE 'starter'
         END INTO best_tier;

  UPDATE public.tenants
  SET subscription_tier = best_tier,
      updated_at = now()
  WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_tenant_tier_trigger ON public.billing_subscriptions;
CREATE TRIGGER sync_tenant_tier_trigger
AFTER INSERT OR UPDATE OF status, current_period_end, product_id, tenant_id OR DELETE
ON public.billing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_tier_from_billing();

UPDATE public.billing_subscriptions
SET updated_at = now()
WHERE provider = 'paypal';