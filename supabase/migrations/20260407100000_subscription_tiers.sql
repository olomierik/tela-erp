-- Update subscription_tier values: rename 'pro' to 'premium'
-- Safe to run multiple times (idempotent)

-- 1. Migrate existing 'pro' tenants to 'premium'
UPDATE public.tenants
SET subscription_tier = 'premium'
WHERE subscription_tier = 'pro';

-- 2. Set default tier for tenants with no tier
UPDATE public.tenants
SET subscription_tier = 'starter'
WHERE subscription_tier IS NULL;

-- 3. Add a CHECK constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_subscription_tier_check'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_subscription_tier_check
      CHECK (subscription_tier IN ('starter', 'premium', 'enterprise'));
  ELSE
    -- Drop and recreate to update allowed values
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_subscription_tier_check;
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_subscription_tier_check
      CHECK (subscription_tier IN ('starter', 'premium', 'enterprise'));
  END IF;
END $$;

-- 4. New tenants default to 'starter'
ALTER TABLE public.tenants
  ALTER COLUMN subscription_tier SET DEFAULT 'starter';
