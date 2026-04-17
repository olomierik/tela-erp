-- Add Stripe billing fields to tenants table

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'year')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Set trial_ends_at for existing tenants that are on starter (no active subscription)
-- so they get a fresh 14-day trial window
UPDATE public.tenants
SET trial_ends_at = now() + INTERVAL '14 days'
WHERE subscription_tier = 'starter'
  AND trial_ends_at IS NULL;

-- Paid tenants have no trial needed
UPDATE public.tenants
SET trial_ends_at = NULL
WHERE subscription_tier IN ('premium', 'enterprise');

COMMENT ON COLUMN public.tenants.stripe_price_id IS 'Stripe price ID for the active subscription plan';
COMMENT ON COLUMN public.tenants.billing_interval IS 'Billing cycle: month or year';
COMMENT ON COLUMN public.tenants.trial_ends_at IS '14-day trial end date; NULL means trial is over or not applicable';
COMMENT ON COLUMN public.tenants.subscription_ends_at IS 'Current subscription period end from Stripe; NULL for active subscriptions';
