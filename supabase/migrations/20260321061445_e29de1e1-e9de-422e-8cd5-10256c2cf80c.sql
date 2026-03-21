
-- Fix handle_new_user to handle duplicate slugs and support tenant_id in metadata (for invited users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id UUID;
  _role app_role;
  _full_name TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _counter INT := 0;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'user');
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');

  -- If no tenant_id provided, create a new tenant
  IF _tenant_id IS NULL THEN
    _base_slug := LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'company-' || LEFT(NEW.id::TEXT, 8)), ' ', '-'));
    _slug := _base_slug;
    
    -- Handle duplicate slugs by appending a counter
    LOOP
      BEGIN
        INSERT INTO public.tenants (name, slug)
        VALUES (
          COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'),
          _slug
        )
        RETURNING id INTO _tenant_id;
        EXIT; -- success, exit loop
      EXCEPTION WHEN unique_violation THEN
        _counter := _counter + 1;
        _slug := _base_slug || '-' || _counter;
        IF _counter > 100 THEN
          RAISE EXCEPTION 'Could not generate unique slug for tenant';
        END IF;
      END;
    END LOOP;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
  VALUES (NEW.id, _tenant_id, NEW.email, _full_name);

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;
