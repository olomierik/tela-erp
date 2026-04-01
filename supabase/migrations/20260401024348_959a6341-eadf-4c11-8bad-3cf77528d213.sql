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
  _invite_id UUID;
BEGIN
  _tenant_id := NULLIF(NEW.raw_user_meta_data ->> 'tenant_id', '')::UUID;
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  _phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
  _invite_id := NULLIF(NEW.raw_user_meta_data ->> 'invite_id', '')::UUID;

  BEGIN
    _role := NULLIF(NEW.raw_user_meta_data ->> 'role', '')::app_role;
  EXCEPTION WHEN OTHERS THEN
    _role := NULL;
  END;
  IF _role IS NULL THEN
    _role := 'user';
  END IF;

  IF _tenant_id IS NULL THEN
    _base_slug := LOWER(REGEXP_REPLACE(
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''), 'company-' || LEFT(NEW.id::TEXT, 8)),
      '[^a-z0-9]+', '-', 'g'
    ));
    _base_slug := TRIM(BOTH '-' FROM _base_slug);
    IF _base_slug = '' THEN
      _base_slug := 'company-' || LEFT(NEW.id::TEXT, 8);
    END IF;

    _slug := _base_slug;
    LOOP
      BEGIN
        INSERT INTO public.tenants (name, slug)
        VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''), 'My Company'), _slug)
        RETURNING id INTO _tenant_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        _counter := _counter + 1;
        _slug := _base_slug || '-' || _counter;
        IF _counter > 100 THEN
          RAISE EXCEPTION 'Could not generate unique slug';
        END IF;
      END;
    END LOOP;
  END IF;

  INSERT INTO public.profiles (user_id, tenant_id, email, full_name, phone)
  VALUES (NEW.id, _tenant_id, COALESCE(NEW.email, ''), _full_name, _phone)
  ON CONFLICT (user_id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
        updated_at = now();

  DELETE FROM public.user_roles
  WHERE user_id = NEW.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  _store_id := NULLIF(NEW.raw_user_meta_data ->> 'store_id', '')::UUID;
  IF _store_id IS NOT NULL THEN
    BEGIN
      _store_role := NULLIF(NEW.raw_user_meta_data ->> 'store_role', '')::store_role;
    EXCEPTION WHEN OTHERS THEN
      _store_role := NULL;
    END;

    IF _store_role IS NULL THEN
      IF _role = 'admin' THEN
        _store_role := 'store_admin';
      ELSE
        _store_role := 'user';
      END IF;
    END IF;

    INSERT INTO public.user_store_assignments (user_id, store_id, tenant_id, role)
    VALUES (NEW.id, _store_id, _tenant_id, _store_role)
    ON CONFLICT DO NOTHING;
  END IF;

  IF _invite_id IS NOT NULL THEN
    UPDATE public.team_invites
      SET status = 'accepted'
    WHERE id = _invite_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$function$;