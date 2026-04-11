
-- Add business fields to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'trading',
  ADD COLUMN IF NOT EXISTS tin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS vrn text DEFAULT '',
  ADD COLUMN IF NOT EXISTS financial_year_start date DEFAULT '2025-01-01';

-- Function to seed Chart of Accounts for a new company based on business type
CREATE OR REPLACE FUNCTION public.seed_company_coa(
  _tenant_id uuid,
  _business_type text DEFAULT 'trading'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Common accounts for ALL business types
  INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
  VALUES
    -- Assets
    (_tenant_id, '1000', 'Cash', 'asset', true, 0),
    (_tenant_id, '1010', 'Bank', 'asset', true, 0),
    (_tenant_id, '1100', 'Accounts Receivable', 'asset', true, 0),
    (_tenant_id, '1200', 'Prepaid Expenses', 'asset', false, 0),
    -- Liabilities
    (_tenant_id, '2000', 'Accounts Payable', 'liability', true, 0),
    (_tenant_id, '2100', 'VAT Output (18%)', 'liability', true, 0),
    (_tenant_id, '2200', 'Accrued Expenses', 'liability', false, 0),
    (_tenant_id, '2300', 'Short-term Loans', 'liability', false, 0),
    -- Equity
    (_tenant_id, '3000', 'Capital', 'equity', true, 0),
    (_tenant_id, '3100', 'Retained Earnings', 'equity', false, 0),
    (_tenant_id, '3200', 'Owner Drawings', 'equity', false, 0),
    -- Revenue
    (_tenant_id, '4000', 'Sales Revenue', 'revenue', true, 0),
    (_tenant_id, '4100', 'Service Revenue', 'revenue', false, 0),
    (_tenant_id, '4200', 'Other Income', 'revenue', false, 0),
    -- Expenses
    (_tenant_id, '5000', 'Cost of Goods Sold', 'expense', true, 0),
    (_tenant_id, '5100', 'Salaries & Wages', 'expense', false, 0),
    (_tenant_id, '5200', 'Rent Expense', 'expense', false, 0),
    (_tenant_id, '5300', 'Utilities', 'expense', false, 0),
    (_tenant_id, '5400', 'Office Supplies', 'expense', false, 0),
    (_tenant_id, '5500', 'Depreciation Expense', 'expense', false, 0),
    (_tenant_id, '5600', 'Insurance Expense', 'expense', false, 0),
    (_tenant_id, '5700', 'Marketing Expense', 'expense', false, 0),
    (_tenant_id, '5800', 'Transport & Logistics', 'expense', false, 0),
    -- Tax
    (_tenant_id, '1300', 'VAT Input (18%)', 'asset', true, 0)
  ON CONFLICT DO NOTHING;

  -- Business-type-specific accounts
  IF _business_type = 'manufacturing' THEN
    INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
    VALUES
      (_tenant_id, '1400', 'Raw Materials Inventory', 'asset', false, 0),
      (_tenant_id, '1410', 'Work in Progress', 'asset', false, 0),
      (_tenant_id, '1420', 'Finished Goods Inventory', 'asset', false, 0),
      (_tenant_id, '5010', 'Direct Materials Cost', 'expense', false, 0),
      (_tenant_id, '5020', 'Direct Labor Cost', 'expense', false, 0),
      (_tenant_id, '5030', 'Manufacturing Overhead', 'expense', false, 0)
    ON CONFLICT DO NOTHING;
  ELSIF _business_type = 'construction' THEN
    INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
    VALUES
      (_tenant_id, '1400', 'Construction WIP', 'asset', false, 0),
      (_tenant_id, '1410', 'Materials on Site', 'asset', false, 0),
      (_tenant_id, '5010', 'Subcontractor Costs', 'expense', false, 0),
      (_tenant_id, '5020', 'Equipment Hire', 'expense', false, 0),
      (_tenant_id, '5030', 'Project Labor', 'expense', false, 0)
    ON CONFLICT DO NOTHING;
  ELSIF _business_type = 'service' THEN
    INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
    VALUES
      (_tenant_id, '4110', 'Consulting Revenue', 'revenue', false, 0),
      (_tenant_id, '4120', 'Retainer Revenue', 'revenue', false, 0),
      (_tenant_id, '5010', 'Professional Services Cost', 'expense', false, 0),
      (_tenant_id, '5020', 'Contractor Payments', 'expense', false, 0)
    ON CONFLICT DO NOTHING;
  ELSIF _business_type = 'retail' THEN
    INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
    VALUES
      (_tenant_id, '1400', 'Merchandise Inventory', 'asset', false, 0),
      (_tenant_id, '4110', 'POS Sales', 'revenue', false, 0),
      (_tenant_id, '5010', 'Purchase Returns', 'expense', false, 0),
      (_tenant_id, '5020', 'Shrinkage & Loss', 'expense', false, 0)
    ON CONFLICT DO NOTHING;
  ELSIF _business_type = 'logistics' THEN
    INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
    VALUES
      (_tenant_id, '1400', 'Fleet Assets', 'asset', false, 0),
      (_tenant_id, '4110', 'Freight Revenue', 'revenue', false, 0),
      (_tenant_id, '5010', 'Fuel Costs', 'expense', false, 0),
      (_tenant_id, '5020', 'Vehicle Maintenance', 'expense', false, 0),
      (_tenant_id, '5030', 'Driver Wages', 'expense', false, 0)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Trading (default) - add inventory account
    INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, is_system, balance)
    VALUES
      (_tenant_id, '1400', 'Inventory', 'asset', false, 0),
      (_tenant_id, '5010', 'Purchase Discounts', 'expense', false, 0),
      (_tenant_id, '4110', 'Sales Discounts', 'revenue', false, 0)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Seed default account mappings
  INSERT INTO account_mappings (tenant_id, module, transaction_type, description, is_active)
  SELECT _tenant_id, module, transaction_type, description, true
  FROM (VALUES
    ('sales', 'invoice_created', 'Debit Receivable, Credit Revenue'),
    ('sales', 'payment_received', 'Debit Cash/Bank, Credit Receivable'),
    ('purchases', 'bill_recorded', 'Debit Expense/Inventory, Credit Payable'),
    ('purchases', 'payment_made', 'Debit Payable, Credit Cash/Bank'),
    ('inventory', 'stock_received', 'Debit Inventory, Credit Payable'),
    ('production', 'goods_produced', 'Debit Finished Goods, Credit WIP')
  ) AS t(module, transaction_type, description)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to create a new company for an existing user
CREATE OR REPLACE FUNCTION public.create_company(
  _user_id uuid,
  _company_name text,
  _business_type text DEFAULT 'trading',
  _tin text DEFAULT '',
  _vrn text DEFAULT '',
  _currency text DEFAULT 'TZS',
  _financial_year_start date DEFAULT '2025-01-01',
  _email text DEFAULT '',
  _phone text DEFAULT '',
  _address text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _slug text;
  _user_email text;
  _user_name text;
BEGIN
  -- Generate slug
  _slug := lower(regexp_replace(_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  _slug := _slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Get user info
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id LIMIT 1;

  -- Create tenant
  INSERT INTO tenants (name, slug, business_type, tin, vrn, default_currency, financial_year_start, contact_email, phone, address, is_active)
  VALUES (_company_name, _slug, _business_type, _tin, _vrn, _currency, _financial_year_start, _email, _phone, _address, true)
  RETURNING id INTO _tenant_id;

  -- Create profile for user in new tenant
  INSERT INTO profiles (user_id, tenant_id, email, full_name, phone, is_active)
  VALUES (_user_id, _tenant_id, COALESCE(_user_email, ''), COALESCE(_user_name, 'Admin'), '', true);

  -- Assign admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Seed Chart of Accounts
  PERFORM seed_company_coa(_tenant_id, _business_type);

  RETURN _tenant_id;
END;
$$;
