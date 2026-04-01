
-- Fix 1: Recreate the signup trigger to ensure it works correctly
-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_id UUID;
  _role app_role;
  _full_name TEXT;
  _phone TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _counter INT := 0;
  _store_id UUID;
  _store_role store_role;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  _phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');

  -- Safely cast role with fallback
  BEGIN
    _role := (NEW.raw_user_meta_data ->> 'role')::app_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'user';
  END;
  IF _role IS NULL THEN
    _role := 'user';
  END IF;

  -- Create tenant if not provided
  IF _tenant_id IS NULL THEN
    _base_slug := LOWER(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'company-' || LEFT(NEW.id::TEXT, 8)),
      '[^a-z0-9]+', '-', 'g'
    ));
    _slug := _base_slug;
    LOOP
      BEGIN
        INSERT INTO public.tenants (name, slug)
        VALUES (COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'), _slug)
        RETURNING id INTO _tenant_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        _counter := _counter + 1;
        _slug := _base_slug || '-' || _counter;
        IF _counter > 100 THEN RAISE EXCEPTION 'Could not generate unique slug'; END IF;
      END;
    END LOOP;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, email, full_name, phone)
  VALUES (NEW.id, _tenant_id, COALESCE(NEW.email, ''), _full_name, _phone)
  ON CONFLICT (user_id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone);

  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Handle store assignment if provided
  _store_id := (NEW.raw_user_meta_data ->> 'store_id')::UUID;
  IF _store_id IS NOT NULL THEN
    BEGIN
      _store_role := (NEW.raw_user_meta_data ->> 'store_role')::store_role;
    EXCEPTION WHEN OTHERS THEN
      IF _role = 'admin' THEN _store_role := 'store_admin';
      ELSE _store_role := 'user';
      END IF;
    END;
    INSERT INTO public.user_store_assignments (user_id, store_id, tenant_id, role)
    VALUES (NEW.id, _store_id, _tenant_id, _store_role)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Handle invite acceptance
  UPDATE public.team_invites
    SET status = 'accepted'
    WHERE id = (NEW.raw_user_meta_data ->> 'invite_id')::UUID
      AND status = 'pending';

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
