-- =============================================================
-- Trigger: auto-setup profile, role, and store assignment for
-- users who accept a Supabase invite link.
-- Invite metadata is passed via auth.users.raw_user_meta_data:
--   tenant_id, app_role, store_id, store_role, full_name
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_invited_user_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id  TEXT;
  v_app_role   TEXT;
  v_store_id   TEXT;
  v_store_role TEXT;
  v_full_name  TEXT;
BEGIN
  -- Only fire when the user confirms their email (confirmed_at goes from NULL to a value)
  IF OLD.confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read metadata set by the invite edge function
  v_tenant_id  := NEW.raw_user_meta_data->>'tenant_id';
  v_app_role   := COALESCE(NEW.raw_user_meta_data->>'app_role', 'user');
  v_store_id   := NEW.raw_user_meta_data->>'store_id';
  v_store_role := COALESCE(NEW.raw_user_meta_data->>'store_role', 'user');
  v_full_name  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Skip if no tenant_id in metadata (normal signup, not an invite)
  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Create profile (idempotent)
  INSERT INTO public.profiles (user_id, tenant_id, email, full_name, is_active, created_at)
  VALUES (NEW.id, v_tenant_id, NEW.email, v_full_name, TRUE, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET tenant_id  = EXCLUDED.tenant_id,
        full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
        is_active  = TRUE;

  -- 2. Set app-level role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_app_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 3. Assign to store if provided (idempotent)
  IF v_store_id IS NOT NULL AND v_store_id <> '' THEN
    INSERT INTO public.user_store_assignments (user_id, store_id, tenant_id, role)
    VALUES (NEW.id, v_store_id, v_tenant_id, v_store_role)
    ON CONFLICT (user_id, store_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then re-create
DROP TRIGGER IF EXISTS on_invited_user_confirmed ON auth.users;

CREATE TRIGGER on_invited_user_confirmed
  AFTER UPDATE OF confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invited_user_setup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.profiles TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.user_roles TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.user_store_assignments TO supabase_auth_admin;
