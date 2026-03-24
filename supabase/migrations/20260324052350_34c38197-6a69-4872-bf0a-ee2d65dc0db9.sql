-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- Update handle_new_user to store phone
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
  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'user');
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  _phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');

  IF _tenant_id IS NULL THEN
    _base_slug := LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'company-' || LEFT(NEW.id::TEXT, 8)), ' ', '-'));
    _slug := _base_slug;
    
    LOOP
      BEGIN
        INSERT INTO public.tenants (name, slug)
        VALUES (
          COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'),
          _slug
        )
        RETURNING id INTO _tenant_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        _counter := _counter + 1;
        _slug := _base_slug || '-' || _counter;
        IF _counter > 100 THEN
          RAISE EXCEPTION 'Could not generate unique slug for tenant';
        END IF;
      END;
    END LOOP;
  END IF;

  INSERT INTO public.profiles (user_id, tenant_id, email, full_name, phone)
  VALUES (NEW.id, _tenant_id, NEW.email, _full_name, _phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  _store_id := (NEW.raw_user_meta_data ->> 'store_id')::UUID;
  IF _store_id IS NOT NULL THEN
    IF _role = 'admin' THEN
      _store_role := 'store_admin';
    ELSE
      _store_role := 'user';
    END IF;
    
    INSERT INTO public.user_store_assignments (user_id, store_id, tenant_id, role)
    VALUES (NEW.id, _store_id, _tenant_id, _store_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;