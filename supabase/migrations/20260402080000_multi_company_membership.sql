-- Multi-company membership table
-- The profiles table has a UNIQUE constraint on user_id (one row per user),
-- which prevents tracking membership in multiple tenants.
-- This table is the source of truth for "which companies does this user belong to?".

CREATE TABLE IF NOT EXISTS public.user_companies (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'admin',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "Users can view own company memberships" ON public.user_companies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own memberships (create_company runs as SECURITY DEFINER so this is safe)
CREATE POLICY "Users can insert own company memberships" ON public.user_companies
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Backfill: for every existing profile, ensure there's a user_companies row
INSERT INTO public.user_companies (user_id, tenant_id, role, is_active, created_at)
SELECT user_id, tenant_id, 'admin', is_active, created_at
FROM   public.profiles
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Fix create_company: stop overwriting the profiles row; insert into user_companies instead
CREATE OR REPLACE FUNCTION public.create_company(
  _user_id              uuid,
  _company_name         text,
  _business_type        text    DEFAULT 'trading',
  _tin                  text    DEFAULT '',
  _vrn                  text    DEFAULT '',
  _currency             text    DEFAULT 'TZS',
  _financial_year_start date    DEFAULT '2025-01-01',
  _email                text    DEFAULT '',
  _phone                text    DEFAULT '',
  _address              text    DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id  uuid;
  _slug       text;
  _user_email text;
  _user_name  text;
  _user_phone text;
BEGIN
  _slug := lower(regexp_replace(_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  _slug := _slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  SELECT full_name, phone INTO _user_name, _user_phone FROM profiles WHERE user_id = _user_id LIMIT 1;

  -- Create the tenant
  INSERT INTO tenants (name, slug, business_type, tin, vrn, default_currency, financial_year_start,
                       contact_email, phone, address, is_active)
  VALUES (_company_name, _slug, _business_type, _tin, _vrn, _currency, _financial_year_start,
          _email, _phone, _address, true)
  RETURNING id INTO _tenant_id;

  -- Record membership in user_companies (safe for multi-company users)
  INSERT INTO user_companies (user_id, tenant_id, role, is_active)
  VALUES (_user_id, _tenant_id, 'admin', true)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- Keep profiles pointing to the user's original/first company (don't overwrite)
  -- Only insert a profile if the user has none yet
  INSERT INTO profiles (user_id, tenant_id, email, full_name, phone, is_active)
  VALUES (_user_id, _tenant_id,
          COALESCE(_user_email, ''),
          COALESCE(_user_name, 'Admin'),
          COALESCE(_user_phone, ''),
          true)
  ON CONFLICT (user_id) DO NOTHING;  -- never overwrite existing profile

  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM seed_company_coa(_tenant_id, _business_type);

  RETURN _tenant_id;
END;
$$;
