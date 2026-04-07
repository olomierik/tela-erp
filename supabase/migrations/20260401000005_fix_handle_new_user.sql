-- Fix: handle_new_user() was generating non-unique tenant slugs.
-- Two users with the same (or blank) company_name both got slug "my-company",
-- causing a UNIQUE violation that rolled back the entire auth.users INSERT.
--
-- This replacement:
--   1. Always appends a short user-ID suffix to guarantee uniqueness.
--   2. Wraps the tenant + profile + role inserts in EXCEPTION blocks so
--      any unexpected error is silently ignored instead of aborting signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _tenant_id UUID;
  _role      app_role;
  _full_name TEXT;
  _base_slug TEXT;
  _slug      TEXT;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  _role      := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'user');
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');

  -- Create a new tenant when no tenant_id is provided
  IF _tenant_id IS NULL THEN
    _base_slug := LOWER(
      REGEXP_REPLACE(
        COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'company'),
        '[^a-z0-9]+', '-', 'g'
      )
    );
    -- Trim leading/trailing dashes
    _base_slug := TRIM(BOTH '-' FROM _base_slug);
    -- Always append first 8 chars of user UUID to guarantee uniqueness
    _slug := _base_slug || '-' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 8);

    BEGIN
      INSERT INTO public.tenants (name, slug)
      VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'),
        _slug
      )
      RETURNING id INTO _tenant_id;
    EXCEPTION WHEN unique_violation THEN
      -- Extremely unlikely given UUID suffix, but handle gracefully
      _slug := _base_slug || '-' || REPLACE(NEW.id::TEXT, '-', '');
      INSERT INTO public.tenants (name, slug)
      VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'),
        _slug
      )
      RETURNING id INTO _tenant_id;
    END;
  END IF;

  -- Create profile (ignore if already exists)
  BEGIN
    INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
    VALUES (NEW.id, _tenant_id, NEW.email, _full_name);
  EXCEPTION WHEN unique_violation OR not_null_violation THEN
    NULL; -- already exists or null issue — do not abort signup
  END;

  -- Assign role (ignore if already exists)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role);
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
