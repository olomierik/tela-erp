
CREATE OR REPLACE FUNCTION public.create_company(_user_id uuid, _company_name text, _business_type text DEFAULT 'trading'::text, _tin text DEFAULT ''::text, _vrn text DEFAULT ''::text, _currency text DEFAULT 'TZS'::text, _financial_year_start date DEFAULT '2025-01-01'::date, _email text DEFAULT ''::text, _phone text DEFAULT ''::text, _address text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_id uuid;
  _slug text;
  _user_email text;
  _user_name text;
  _user_phone text;
BEGIN
  _slug := lower(regexp_replace(_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  _slug := _slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  SELECT full_name, phone INTO _user_name, _user_phone FROM profiles WHERE user_id = _user_id LIMIT 1;

  INSERT INTO tenants (name, slug, business_type, tin, vrn, default_currency, financial_year_start, contact_email, phone, address, is_active)
  VALUES (_company_name, _slug, _business_type, _tin, _vrn, _currency, _financial_year_start, _email, _phone, _address, true)
  RETURNING id INTO _tenant_id;

  -- Use ON CONFLICT to handle existing profile for this user
  INSERT INTO profiles (user_id, tenant_id, email, full_name, phone, is_active)
  VALUES (_user_id, _tenant_id, COALESCE(_user_email, ''), COALESCE(_user_name, 'Admin'), COALESCE(_user_phone, ''), true)
  ON CONFLICT (user_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM seed_company_coa(_tenant_id, _business_type);

  RETURN _tenant_id;
END;
$function$;
