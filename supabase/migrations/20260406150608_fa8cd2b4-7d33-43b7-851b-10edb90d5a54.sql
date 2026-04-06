
-- ============================================================
-- 1. Create tenant_secrets table for sensitive credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenant_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  anthropic_api_key TEXT,
  ai_model TEXT DEFAULT 'claude-sonnet-4-6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_secrets ENABLE ROW LEVEL SECURITY;

-- No client-side access at all — only service_role can read/write
-- (RLS enabled + no policies = deny all for authenticated/anon)

-- Migrate existing data from tenants
INSERT INTO public.tenant_secrets (tenant_id, anthropic_api_key, ai_model)
SELECT id, anthropic_api_key, ai_model
FROM public.tenants
WHERE anthropic_api_key IS NOT NULL OR ai_model IS NOT NULL
ON CONFLICT (tenant_id) DO NOTHING;

-- Remove the sensitive column from tenants
ALTER TABLE public.tenants DROP COLUMN IF EXISTS anthropic_api_key;

-- Create a security definer function for edge functions to retrieve secrets
CREATE OR REPLACE FUNCTION public.get_tenant_secret(_tenant_id UUID)
RETURNS TABLE(anthropic_api_key TEXT, ai_model TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts.anthropic_api_key, ts.ai_model
  FROM public.tenant_secrets ts
  WHERE ts.tenant_id = _tenant_id
  LIMIT 1;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_tenant_secrets_updated_at
  BEFORE UPDATE ON public.tenant_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Lock down password_reset_otps — explicit deny-all
-- ============================================================
-- RLS is already enabled; add explicit restrictive policies
-- so no authenticated or anon user can access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'password_reset_otps' AND schemaname = 'public'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny all access to password_reset_otps" ON public.password_reset_otps FOR ALL TO authenticated USING (false) WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "Deny anon access to password_reset_otps" ON public.password_reset_otps FOR ALL TO anon USING (false) WITH CHECK (false)';
  END IF;
END $$;

-- ============================================================
-- 3. Fix team_invites anon read policy
-- ============================================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "public_read_invite_by_token" ON public.team_invites;

-- Replace with a policy that requires filtering by specific invite ID
-- This prevents bulk enumeration while still allowing invite acceptance flows
CREATE POLICY "anon_read_single_invite_by_id"
  ON public.team_invites
  FOR SELECT
  TO anon
  USING (
    status = 'pending'
    AND expires_at > now()
    AND id::text = current_setting('request.headers', true)::json->>'x-invite-id'
  );
