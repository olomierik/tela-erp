-- ============================================================
-- myERP COMPLETE SETUP — single file, safe to run once
-- Supabase SQL Editor → New Query → paste → Run
-- ============================================================

-- Drop all existing myerp policies to avoid "already exists" errors
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE tablename LIKE 'myerp_%' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- myERP user profiles table
-- Stores per-user ERP profile data (full name, company name)
-- Linked 1:1 to auth.users via trigger on signup

CREATE TABLE IF NOT EXISTS public.myerp_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text,
  company_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "myerp: users can read own profile"
  ON public.myerp_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "myerp: users can update own profile"
  ON public.myerp_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "myerp: users can insert own profile"
  ON public.myerp_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION public.handle_myerp_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.myerp_profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists to allow re-running the migration
DROP TRIGGER IF EXISTS on_myerp_auth_user_created ON auth.users;

CREATE TRIGGER on_myerp_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_myerp_new_user();

-- Updated_at auto-touch
CREATE OR REPLACE FUNCTION public.touch_myerp_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS myerp_profiles_updated_at ON public.myerp_profiles;

CREATE TRIGGER myerp_profiles_updated_at
  BEFORE UPDATE ON public.myerp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_myerp_profile_updated_at();
-- myERP module tables — all scoped by user_id (auth.users.id)
-- Every row belongs to the authenticated user who created it.

-- ─── HELPERS ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ─── FINANCE: CHART OF ACCOUNTS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  parent_id   uuid REFERENCES public.myerp_accounts(id) ON DELETE SET NULL,
  currency    text NOT NULL DEFAULT 'USD',
  balance     numeric(15,2) NOT NULL DEFAULT 0,
  is_header   boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);
ALTER TABLE public.myerp_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_accounts_owner" ON public.myerp_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_accounts_updated BEFORE UPDATE ON public.myerp_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── FINANCE: JOURNAL ENTRIES ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_journal_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference   text NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_je_owner" ON public.myerp_journal_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_je_updated BEFORE UPDATE ON public.myerp_journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_journal_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     uuid NOT NULL REFERENCES public.myerp_journal_entries(id) ON DELETE CASCADE,
  account_id   uuid REFERENCES public.myerp_accounts(id) ON DELETE SET NULL,
  account_code text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  description  text NOT NULL DEFAULT '',
  debit        numeric(15,2) NOT NULL DEFAULT 0,
  credit       numeric(15,2) NOT NULL DEFAULT 0,
  department   text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_jl_owner" ON public.myerp_journal_lines FOR ALL TO authenticated
  USING (entry_id IN (SELECT id FROM public.myerp_journal_entries WHERE user_id = auth.uid()))
  WITH CHECK (entry_id IN (SELECT id FROM public.myerp_journal_entries WHERE user_id = auth.uid()));

-- ─── FINANCE: INVOICES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_invoices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number      text NOT NULL,
  customer    text NOT NULL DEFAULT '',
  issue_date  date NOT NULL DEFAULT CURRENT_DATE,
  due_date    date NOT NULL DEFAULT CURRENT_DATE,
  amount      numeric(15,2) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  items_count integer NOT NULL DEFAULT 0,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_invoices_owner" ON public.myerp_invoices FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_invoices_updated BEFORE UPDATE ON public.myerp_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── FINANCE: BILLS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_bills (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number    text NOT NULL,
  vendor    text NOT NULL DEFAULT '',
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date  date NOT NULL DEFAULT CURRENT_DATE,
  amount    numeric(15,2) NOT NULL DEFAULT 0,
  status    text NOT NULL DEFAULT 'received' CHECK (status IN ('received','approved','paid','overdue')),
  category  text NOT NULL DEFAULT 'General',
  notes     text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_bills_owner" ON public.myerp_bills FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_bills_updated BEFORE UPDATE ON public.myerp_bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── FINANCE: PAYMENTS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_payments (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  type      text NOT NULL CHECK (type IN ('incoming','outgoing')),
  party     text NOT NULL DEFAULT '',
  date      date NOT NULL DEFAULT CURRENT_DATE,
  amount    numeric(15,2) NOT NULL DEFAULT 0,
  method    text NOT NULL DEFAULT 'bank' CHECK (method IN ('bank','cash','card','cheque')),
  status    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cleared','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_payments_owner" ON public.myerp_payments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_payments_updated BEFORE UPDATE ON public.myerp_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SALES: CUSTOMERS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  company       text NOT NULL DEFAULT '',
  industry      text NOT NULL DEFAULT '',
  country       text NOT NULL DEFAULT '',
  total_orders  integer NOT NULL DEFAULT 0,
  total_revenue numeric(15,2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_customers_owner" ON public.myerp_customers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_customers_updated BEFORE UPDATE ON public.myerp_customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SALES: LEADS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  company     text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  source      text NOT NULL DEFAULT 'website' CHECK (source IN ('website','referral','linkedin','cold_call','event')),
  stage       text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','proposal','won','lost')),
  value       numeric(15,2) NOT NULL DEFAULT 0,
  assigned_to text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_leads_owner" ON public.myerp_leads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_leads_updated BEFORE UPDATE ON public.myerp_leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SALES: QUOTES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_quotes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  customer     text NOT NULL DEFAULT '',
  date         date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date  date,
  amount       numeric(15,2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_quotes_owner" ON public.myerp_quotes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_quotes_updated BEFORE UPDATE ON public.myerp_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SALES: ORDERS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_sales_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number   text NOT NULL,
  customer       text NOT NULL DEFAULT '',
  date           date NOT NULL DEFAULT CURRENT_DATE,
  items_count    integer NOT NULL DEFAULT 0,
  total          numeric(15,2) NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','processing','shipped','delivered','cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  notes          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_sales_orders_owner" ON public.myerp_sales_orders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_so_updated BEFORE UPDATE ON public.myerp_sales_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROCUREMENT: VENDORS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_vendors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  phone          text NOT NULL DEFAULT '',
  country        text NOT NULL DEFAULT '',
  category       text NOT NULL DEFAULT '',
  payment_terms  text NOT NULL DEFAULT 'Net 30',
  rating         integer NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_vendors_owner" ON public.myerp_vendors FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_vendors_updated BEFORE UPDATE ON public.myerp_vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROCUREMENT: PURCHASE ORDERS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_purchase_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  po_number     text NOT NULL,
  vendor        text NOT NULL DEFAULT '',
  order_date    date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  total         numeric(15,2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','received','cancelled')),
  items_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_po_owner" ON public.myerp_purchase_orders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_po_updated BEFORE UPDATE ON public.myerp_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROCUREMENT: GOODS RECEIPTS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_goods_receipts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  po_number      text NOT NULL DEFAULT '',
  vendor         text NOT NULL DEFAULT '',
  received_date  date NOT NULL DEFAULT CURRENT_DATE,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','complete')),
  notes          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_gr_owner" ON public.myerp_goods_receipts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_gr_updated BEFORE UPDATE ON public.myerp_goods_receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── INVENTORY: PRODUCTS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku           text NOT NULL,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT '',
  unit          text NOT NULL DEFAULT 'pcs',
  unit_cost     numeric(15,4) NOT NULL DEFAULT 0,
  selling_price numeric(15,4) NOT NULL DEFAULT 0,
  stock_qty     numeric(15,4) NOT NULL DEFAULT 0,
  reorder_level numeric(15,4) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','discontinued')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku)
);
ALTER TABLE public.myerp_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_products_owner" ON public.myerp_products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_products_updated BEFORE UPDATE ON public.myerp_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── INVENTORY: WAREHOUSES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_warehouses (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name     text NOT NULL,
  location text NOT NULL DEFAULT '',
  manager  text NOT NULL DEFAULT '',
  status   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_warehouses_owner" ON public.myerp_warehouses FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_warehouses_updated BEFORE UPDATE ON public.myerp_warehouses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── INVENTORY: STOCK LEVELS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_stock_levels (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES public.myerp_products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.myerp_warehouses(id) ON DELETE CASCADE,
  on_hand      numeric(15,4) NOT NULL DEFAULT 0,
  reserved     numeric(15,4) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);
ALTER TABLE public.myerp_stock_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_stock_owner" ON public.myerp_stock_levels FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_stock_updated BEFORE UPDATE ON public.myerp_stock_levels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── INVENTORY: STOCK ADJUSTMENTS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_stock_adjustments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES public.myerp_products(id) ON DELETE SET NULL,
  warehouse_id     uuid REFERENCES public.myerp_warehouses(id) ON DELETE SET NULL,
  adjustment_type  text NOT NULL CHECK (adjustment_type IN ('add','remove','count')),
  quantity         numeric(15,4) NOT NULL,
  reason           text NOT NULL DEFAULT '',
  date             date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_adj_owner" ON public.myerp_stock_adjustments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── HR: EMPLOYEES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_employees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  employee_id text NOT NULL,
  department  text NOT NULL DEFAULT '',
  position    text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  hire_date   date,
  salary      numeric(15,2) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_leave','terminated')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, employee_id)
);
ALTER TABLE public.myerp_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_employees_owner" ON public.myerp_employees FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_employees_updated BEFORE UPDATE ON public.myerp_employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── HR: LEAVE REQUESTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_leave_requests (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee  text NOT NULL DEFAULT '',
  type      text NOT NULL CHECK (type IN ('annual','sick','maternity','unpaid')),
  from_date date NOT NULL DEFAULT CURRENT_DATE,
  to_date   date NOT NULL DEFAULT CURRENT_DATE,
  days      integer NOT NULL DEFAULT 1,
  status    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_leave_owner" ON public.myerp_leave_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_leave_updated BEFORE UPDATE ON public.myerp_leave_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── HR: PAYROLL ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_payroll_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee   text NOT NULL DEFAULT '',
  period     text NOT NULL DEFAULT '',
  basic      numeric(15,2) NOT NULL DEFAULT 0,
  allowances numeric(15,2) NOT NULL DEFAULT 0,
  gross      numeric(15,2) NOT NULL DEFAULT 0,
  deductions numeric(15,2) NOT NULL DEFAULT 0,
  net        numeric(15,2) NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processed','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_payroll_owner" ON public.myerp_payroll_runs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_payroll_updated BEFORE UPDATE ON public.myerp_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── HR: RECRUITMENT ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_job_postings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL,
  department       text NOT NULL DEFAULT '',
  location         text NOT NULL DEFAULT '',
  type             text NOT NULL DEFAULT 'full_time' CHECK (type IN ('full_time','part_time','contract','internship')),
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  applicants_count integer NOT NULL DEFAULT 0,
  posted_date      date,
  closing_date     date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_jobs_owner" ON public.myerp_job_postings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_jobs_updated BEFORE UPDATE ON public.myerp_job_postings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  client     text NOT NULL DEFAULT '',
  manager    text NOT NULL DEFAULT '',
  start_date date,
  end_date   date,
  budget     numeric(15,2) NOT NULL DEFAULT 0,
  spent      numeric(15,2) NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','on_hold','completed')),
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_projects_owner" ON public.myerp_projects FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_projects_updated BEFORE UPDATE ON public.myerp_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROJECTS: TASKS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  project     text NOT NULL DEFAULT '',
  assigned_to text NOT NULL DEFAULT '',
  due_date    date,
  priority    text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status      text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_tasks_owner" ON public.myerp_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_tasks_updated BEFORE UPDATE ON public.myerp_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROJECTS: TIMESHEETS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_timesheets (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee text NOT NULL DEFAULT '',
  project  text NOT NULL DEFAULT '',
  task     text NOT NULL DEFAULT '',
  date     date NOT NULL DEFAULT CURRENT_DATE,
  hours    numeric(5,2) NOT NULL DEFAULT 0,
  notes    text NOT NULL DEFAULT '',
  status   text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_timesheets_owner" ON public.myerp_timesheets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_timesheets_updated BEFORE UPDATE ON public.myerp_timesheets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ASSETS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_number  text NOT NULL,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT '',
  purchase_date date,
  purchase_cost numeric(15,2) NOT NULL DEFAULT 0,
  current_value numeric(15,2) NOT NULL DEFAULT 0,
  location      text NOT NULL DEFAULT '',
  condition     text NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent','good','fair','poor')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disposed','under_maintenance')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_number)
);
ALTER TABLE public.myerp_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_assets_owner" ON public.myerp_assets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_assets_updated BEFORE UPDATE ON public.myerp_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ASSETS: DEPRECIATION ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_depreciation (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id   uuid NOT NULL REFERENCES public.myerp_assets(id) ON DELETE CASCADE,
  asset_name text NOT NULL DEFAULT '',
  period     text NOT NULL DEFAULT '',
  amount     numeric(15,2) NOT NULL DEFAULT 0,
  book_value numeric(15,2) NOT NULL DEFAULT 0,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_depreciation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_depreciation_owner" ON public.myerp_depreciation FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── MANUFACTURING: PRODUCTS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_mfg_products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sku        text NOT NULL DEFAULT '',
  category   text NOT NULL DEFAULT '',
  unit       text NOT NULL DEFAULT 'pcs',
  unit_cost  numeric(15,4) NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','discontinued')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_mfg_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_mfg_prod_owner" ON public.myerp_mfg_products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_mfg_prod_updated BEFORE UPDATE ON public.myerp_mfg_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MANUFACTURING: BOMs ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_boms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  version      text NOT NULL DEFAULT 'v1.0',
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','obsolete')),
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_boms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_boms_owner" ON public.myerp_boms FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_boms_updated BEFORE UPDATE ON public.myerp_boms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MANUFACTURING: PRODUCTION ORDERS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.myerp_production_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  product      text NOT NULL DEFAULT '',
  quantity     numeric(15,4) NOT NULL DEFAULT 1,
  start_date   date,
  end_date     date,
  status       text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','on_hold')),
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_prod_orders_owner" ON public.myerp_production_orders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER myerp_prod_orders_updated BEFORE UPDATE ON public.myerp_production_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Add product_name and quantity_received columns to myerp_goods_receipts
-- These fields enable inventory updates when a goods receipt is marked complete.

ALTER TABLE public.myerp_goods_receipts
  ADD COLUMN IF NOT EXISTS product_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quantity_received numeric(15,4) NOT NULL DEFAULT 0;
-- Migration: AR/AP payments enhancements
-- Adds subtotals, discount/tax/paid amounts, terms, line-item tables,
-- and fixes status/method check constraints.

-- ============================================================
-- 1. ALTER myerp_invoices
-- ============================================================

ALTER TABLE public.myerp_invoices
  ADD COLUMN IF NOT EXISTS subtotal        numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount      numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount     numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms           text          NOT NULL DEFAULT 'net_30';

ALTER TABLE public.myerp_invoices DROP CONSTRAINT IF EXISTS myerp_invoices_status_check;
ALTER TABLE public.myerp_invoices ADD CONSTRAINT myerp_invoices_status_check
  CHECK (status IN ('draft','sent','partially_paid','paid','overdue','cancelled'));

-- ============================================================
-- 2. ALTER myerp_bills
-- ============================================================

ALTER TABLE public.myerp_bills
  ADD COLUMN IF NOT EXISTS subtotal        numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount      numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount     numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms           text          NOT NULL DEFAULT 'net_30';

ALTER TABLE public.myerp_bills DROP CONSTRAINT IF EXISTS myerp_bills_status_check;
ALTER TABLE public.myerp_bills ADD CONSTRAINT myerp_bills_status_check
  CHECK (status IN ('draft','received','approved','partially_paid','paid','overdue','cancelled'));

-- ============================================================
-- 3. ALTER myerp_payments
-- ============================================================

ALTER TABLE public.myerp_payments
  ADD COLUMN IF NOT EXISTS payment_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_id     uuid REFERENCES public.myerp_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bill_id        uuid REFERENCES public.myerp_bills(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bill_number    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS party_type     text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS notes          text NOT NULL DEFAULT '';

ALTER TABLE public.myerp_payments DROP CONSTRAINT IF EXISTS myerp_payments_method_check;
ALTER TABLE public.myerp_payments ADD CONSTRAINT myerp_payments_method_check
  CHECK (method IN ('bank_transfer','bank','cash','cheque','mobile_money','card'));

-- ============================================================
-- 4. CREATE myerp_invoice_lines
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_invoice_lines (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid        NOT NULL REFERENCES public.myerp_invoices(id) ON DELETE CASCADE,
  description  text        NOT NULL DEFAULT '',
  quantity     numeric(15,4) NOT NULL DEFAULT 1,
  unit_price   numeric(15,4) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2)  NOT NULL DEFAULT 0,
  tax_pct      numeric(5,2)  NOT NULL DEFAULT 0,
  line_total   numeric(15,2) NOT NULL DEFAULT 0,
  sort_order   integer       NOT NULL DEFAULT 0,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_invoice_lines_owner" ON public.myerp_invoice_lines
  FOR ALL TO authenticated
  USING (invoice_id IN (SELECT id FROM public.myerp_invoices WHERE user_id = auth.uid()))
  WITH CHECK (invoice_id IN (SELECT id FROM public.myerp_invoices WHERE user_id = auth.uid()));

-- ============================================================
-- 5. CREATE myerp_bill_lines
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_bill_lines (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id      uuid        NOT NULL REFERENCES public.myerp_bills(id) ON DELETE CASCADE,
  description  text        NOT NULL DEFAULT '',
  quantity     numeric(15,4) NOT NULL DEFAULT 1,
  unit_price   numeric(15,4) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2)  NOT NULL DEFAULT 0,
  tax_pct      numeric(5,2)  NOT NULL DEFAULT 0,
  line_total   numeric(15,2) NOT NULL DEFAULT 0,
  sort_order   integer       NOT NULL DEFAULT 0,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_bill_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_bill_lines_owner" ON public.myerp_bill_lines
  FOR ALL TO authenticated
  USING (bill_id IN (SELECT id FROM public.myerp_bills WHERE user_id = auth.uid()))
  WITH CHECK (bill_id IN (SELECT id FROM public.myerp_bills WHERE user_id = auth.uid()));
-- Add Anthropic API key to myerp_profiles so each user can store their own key.
-- The key is only readable/writable by the owner (existing RLS policies cover this).

ALTER TABLE public.myerp_profiles
  ADD COLUMN IF NOT EXISTS anthropic_api_key text,
  ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'claude-opus-4-6';
-- Migration: myerp missing features
-- Adds tables for: Expenses, Helpdesk, HR Attendance, HR Contracts,
-- Budgets, Tax Rates, Inventory Reorder Rules, Internal Transfers,
-- Manufacturing Work Centers, Quality Checks

-- ============================================================
-- 1. EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_expense_categories_owner"
  ON public.myerp_expense_categories
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No updated_at on myerp_expense_categories, so no trigger needed.

CREATE TABLE IF NOT EXISTS public.myerp_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_number text NOT NULL DEFAULT '',
  employee_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','paid')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_expenses_owner"
  ON public.myerp_expenses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_expenses
  BEFORE UPDATE ON public.myerp_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. HELPDESK
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  category text NOT NULL DEFAULT 'General',
  assigned_to text NOT NULL DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_tickets_owner"
  ON public.myerp_tickets
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_tickets
  BEFORE UPDATE ON public.myerp_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. HR ATTENDANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name text NOT NULL DEFAULT '',
  employee_id text NOT NULL DEFAULT '',
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  work_hours numeric(8,2),
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_attendance_owner"
  ON public.myerp_attendance
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_attendance
  BEFORE UPDATE ON public.myerp_attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. HR CONTRACTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_number text NOT NULL DEFAULT '',
  employee_name text NOT NULL DEFAULT '',
  job_title text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  contract_type text NOT NULL DEFAULT 'full_time' CHECK (contract_type IN ('full_time','part_time','contract','internship')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  salary numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','expired','terminated')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_contracts_owner"
  ON public.myerp_contracts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_contracts
  BEFORE UPDATE ON public.myerp_contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. BUDGETS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date NOT NULL DEFAULT CURRENT_DATE,
  department text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_budgets_owner"
  ON public.myerp_budgets
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_budgets
  BEFORE UPDATE ON public.myerp_budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.myerp_budgets(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT '',
  planned_amount numeric(15,2) NOT NULL DEFAULT 0,
  actual_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_budget_lines_owner"
  ON public.myerp_budget_lines
  FOR ALL TO authenticated
  USING (budget_id IN (SELECT id FROM public.myerp_budgets WHERE user_id = auth.uid()))
  WITH CHECK (budget_id IN (SELECT id FROM public.myerp_budgets WHERE user_id = auth.uid()));

-- No updated_at on myerp_budget_lines, so no trigger needed.

-- ============================================================
-- 6. TAX RATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  rate numeric(6,4) NOT NULL DEFAULT 0,
  tax_type text NOT NULL DEFAULT 'sales' CHECK (tax_type IN ('sales','purchase','both')),
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_tax_rates_owner"
  ON public.myerp_tax_rates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_tax_rates
  BEFORE UPDATE ON public.myerp_tax_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. INVENTORY REORDER RULES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_reorder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.myerp_products(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  product_sku text NOT NULL DEFAULT '',
  min_qty numeric(15,4) NOT NULL DEFAULT 0,
  max_qty numeric(15,4) NOT NULL DEFAULT 0,
  reorder_qty numeric(15,4) NOT NULL DEFAULT 0,
  vendor text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_reorder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_reorder_rules_owner"
  ON public.myerp_reorder_rules
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_reorder_rules
  BEFORE UPDATE ON public.myerp_reorder_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8. INVENTORY INTERNAL TRANSFERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transfer_number text NOT NULL DEFAULT '',
  from_location text NOT NULL DEFAULT '',
  to_location text NOT NULL DEFAULT '',
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','done','cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_transfers_owner"
  ON public.myerp_transfers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_transfers
  BEFORE UPDATE ON public.myerp_transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.myerp_transfers(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  product_sku text NOT NULL DEFAULT '',
  quantity numeric(15,4) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_transfer_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_transfer_lines_owner"
  ON public.myerp_transfer_lines
  FOR ALL TO authenticated
  USING (transfer_id IN (SELECT id FROM public.myerp_transfers WHERE user_id = auth.uid()))
  WITH CHECK (transfer_id IN (SELECT id FROM public.myerp_transfers WHERE user_id = auth.uid()));

-- No updated_at on myerp_transfer_lines, so no trigger needed.

-- ============================================================
-- 9. MANUFACTURING WORK CENTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  capacity numeric(8,2) NOT NULL DEFAULT 1,
  cost_per_hour numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_work_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_work_centers_owner"
  ON public.myerp_work_centers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_work_centers
  BEFORE UPDATE ON public.myerp_work_centers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 10. QUALITY CHECKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_number text NOT NULL DEFAULT '',
  production_order_id uuid REFERENCES public.myerp_production_orders(id) ON DELETE SET NULL,
  production_order_number text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  inspector text NOT NULL DEFAULT '',
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','pass','fail','rework')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_quality_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myerp_quality_checks_owner"
  ON public.myerp_quality_checks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_myerp_quality_checks
  BEFORE UPDATE ON public.myerp_quality_checks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Migration: Odoo parity batch 2
-- Adds: Fleet, Maintenance, Email Marketing, Subscriptions, Point of Sale

-- ============================================================
-- 1. FLEET MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  license_plate text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  year int,
  vin text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  fuel_type text NOT NULL DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline','diesel','electric','hybrid','lpg')),
  acquisition_date date,
  acquisition_cost numeric(15,2) NOT NULL DEFAULT 0,
  current_mileage numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_repair','inactive','sold')),
  driver_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_vehicles_owner" ON public.myerp_vehicles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_vehicles
  BEFORE UPDATE ON public.myerp_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_vehicle_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.myerp_vehicles(id) ON DELETE SET NULL,
  vehicle_name text NOT NULL DEFAULT '',
  service_type text NOT NULL DEFAULT 'maintenance' CHECK (service_type IN ('maintenance','repair','inspection','tires','oil_change','other')),
  description text NOT NULL DEFAULT '',
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(15,2) NOT NULL DEFAULT 0,
  vendor text NOT NULL DEFAULT '',
  next_service_date date,
  next_service_mileage numeric(12,2),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_vehicle_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_vehicle_services_owner" ON public.myerp_vehicle_services
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_vehicle_services
  BEFORE UPDATE ON public.myerp_vehicle_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.myerp_vehicles(id) ON DELETE SET NULL,
  vehicle_name text NOT NULL DEFAULT '',
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage numeric(12,2) NOT NULL DEFAULT 0,
  fuel_qty numeric(10,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'liters' CHECK (unit IN ('liters','gallons')),
  price_per_unit numeric(10,4) NOT NULL DEFAULT 0,
  total_cost numeric(15,2) NOT NULL DEFAULT 0,
  station text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_fuel_logs_owner" ON public.myerp_fuel_logs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_fuel_logs
  BEFORE UPDATE ON public.myerp_fuel_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. MAINTENANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  technician text NOT NULL DEFAULT '',
  acquisition_date date,
  acquisition_cost numeric(15,2) NOT NULL DEFAULT 0,
  serial_number text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  warranty_expiry date,
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','needs_repair','under_maintenance','scrapped')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_equipment_owner" ON public.myerp_equipment
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_equipment
  BEFORE UPDATE ON public.myerp_equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_number text NOT NULL DEFAULT '',
  equipment_id uuid REFERENCES public.myerp_equipment(id) ON DELETE SET NULL,
  equipment_name text NOT NULL DEFAULT '',
  maintenance_type text NOT NULL DEFAULT 'corrective' CHECK (maintenance_type IN ('corrective','preventive','electrical','mechanical','other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','very_high')),
  description text NOT NULL DEFAULT '',
  requested_by text NOT NULL DEFAULT '',
  assigned_to text NOT NULL DEFAULT '',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date date,
  completion_date date,
  duration_hours numeric(8,2),
  cost numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done','cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_maintenance_requests_owner" ON public.myerp_maintenance_requests
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_maintenance_requests
  BEFORE UPDATE ON public.myerp_maintenance_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. EMAIL MARKETING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_mailing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_mailing_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_mailing_lists_owner" ON public.myerp_mailing_lists
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_mailing_lists
  BEFORE UPDATE ON public.myerp_mailing_lists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_mailing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.myerp_mailing_lists(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  is_unsubscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_mailing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_mailing_contacts_owner" ON public.myerp_mailing_contacts
  FOR ALL TO authenticated
  USING (list_id IN (SELECT id FROM public.myerp_mailing_lists WHERE user_id = auth.uid()))
  WITH CHECK (list_id IN (SELECT id FROM public.myerp_mailing_lists WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.myerp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  preview_text text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  mailing_list_id uuid REFERENCES public.myerp_mailing_lists(id) ON DELETE SET NULL,
  mailing_list_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_queue','sending','sent','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  total_sent int NOT NULL DEFAULT 0,
  total_opened int NOT NULL DEFAULT 0,
  total_clicked int NOT NULL DEFAULT 0,
  total_bounced int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_campaigns_owner" ON public.myerp_campaigns
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_campaigns
  BEFORE UPDATE ON public.myerp_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('weekly','monthly','quarterly','yearly')),
  trial_days int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  features text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_subscription_plans_owner" ON public.myerp_subscription_plans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_subscription_plans
  BEFORE UPDATE ON public.myerp_subscription_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_number text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES public.myerp_subscription_plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL DEFAULT '',
  price numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  next_billing_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trial','active','paused','cancelled','expired')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_subscriptions_owner" ON public.myerp_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_subscriptions
  BEFORE UPDATE ON public.myerp_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. POINT OF SALE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_number text NOT NULL DEFAULT '',
  cashier text NOT NULL DEFAULT '',
  opening_cash numeric(15,2) NOT NULL DEFAULT 0,
  closing_cash numeric(15,2),
  total_sales numeric(15,2) NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closing','closed')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_pos_sessions_owner" ON public.myerp_pos_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_pos_sessions
  BEFORE UPDATE ON public.myerp_pos_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL DEFAULT '',
  session_id uuid REFERENCES public.myerp_pos_sessions(id) ON DELETE SET NULL,
  session_number text NOT NULL DEFAULT '',
  cashier text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card','mobile_money','split')),
  amount_tendered numeric(15,2) NOT NULL DEFAULT 0,
  change_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft','paid','refunded','voided')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_pos_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_pos_orders_owner" ON public.myerp_pos_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_pos_orders
  BEFORE UPDATE ON public.myerp_pos_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_pos_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.myerp_pos_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  product_sku text NOT NULL DEFAULT '',
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_pos_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_pos_order_lines_owner" ON public.myerp_pos_order_lines
  FOR ALL TO authenticated
  USING (order_id IN (SELECT id FROM public.myerp_pos_orders WHERE user_id = auth.uid()))
  WITH CHECK (order_id IN (SELECT id FROM public.myerp_pos_orders WHERE user_id = auth.uid()));
-- Migration: Industry-based module activation
-- Adds industry, active_modules, and onboarding_completed to myerp_profiles

ALTER TABLE public.myerp_profiles
  ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS active_modules jsonb NOT NULL DEFAULT '["finance","sales","procurement","inventory","hr","manufacturing","projects","assets","expenses","helpdesk","fleet","maintenance","marketing","subscriptions","pos"]'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_size text NOT NULL DEFAULT 'small' CHECK (business_size IN ('solo','small','medium','large'));

-- Industry module presets lookup table (reference only, not user-scoped)
CREATE TABLE IF NOT EXISTS public.myerp_industry_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key text NOT NULL UNIQUE,
  industry_label text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'building',
  default_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed industry presets
INSERT INTO public.myerp_industry_presets (industry_key, industry_label, description, icon, default_modules) VALUES
(
  'retail',
  'Retail & Commerce',
  'Physical or online stores selling products directly to consumers',
  'shopping-bag',
  '["finance","sales","inventory","procurement","pos","hr","expenses"]'::jsonb
),
(
  'manufacturing',
  'Manufacturing',
  'Companies that produce goods from raw materials or components',
  'factory',
  '["finance","manufacturing","inventory","procurement","hr","expenses","assets","maintenance"]'::jsonb
),
(
  'services',
  'Professional Services',
  'Consulting, legal, accounting, agencies, and other service businesses',
  'briefcase',
  '["finance","sales","projects","hr","helpdesk","expenses","marketing"]'::jsonb
),
(
  'hospitality',
  'Hospitality & Restaurant',
  'Hotels, restaurants, cafes, bars, and food service businesses',
  'utensils',
  '["finance","pos","inventory","hr","expenses","procurement"]'::jsonb
),
(
  'healthcare',
  'Healthcare & Medical',
  'Clinics, hospitals, pharmacies, and health service providers',
  'heart-pulse',
  '["finance","hr","inventory","helpdesk","expenses","assets"]'::jsonb
),
(
  'construction',
  'Construction & Engineering',
  'Contractors, builders, civil engineering, and infrastructure firms',
  'hard-hat',
  '["finance","projects","assets","hr","procurement","inventory","expenses","maintenance"]'::jsonb
),
(
  'logistics',
  'Logistics & Transportation',
  'Freight, delivery, warehousing, and supply chain companies',
  'truck',
  '["finance","fleet","hr","inventory","procurement","expenses"]'::jsonb
),
(
  'ecommerce',
  'E-Commerce & Online Business',
  'Online stores, marketplaces, dropshipping, and digital products',
  'globe',
  '["finance","sales","inventory","marketing","subscriptions","helpdesk","expenses"]'::jsonb
),
(
  'nonprofit',
  'Non-Profit & NGO',
  'Charities, foundations, religious organisations, and social enterprises',
  'heart',
  '["finance","hr","projects","expenses","marketing"]'::jsonb
),
(
  'agriculture',
  'Agriculture & Farming',
  'Farms, agribusinesses, food processing, and agri-supply companies',
  'sprout',
  '["finance","inventory","procurement","manufacturing","hr","expenses","assets"]'::jsonb
),
(
  'realestate',
  'Real Estate & Property',
  'Property developers, agents, landlords, and property managers',
  'building',
  '["finance","assets","sales","hr","expenses","maintenance"]'::jsonb
),
(
  'technology',
  'Technology & SaaS',
  'Software companies, tech startups, IT services, and digital agencies',
  'cpu',
  '["finance","subscriptions","projects","helpdesk","hr","expenses","marketing","sales"]'::jsonb
),
(
  'general',
  'General Business',
  'All modules activated — suitable for businesses with diverse needs',
  'layout-grid',
  '["finance","sales","procurement","inventory","hr","manufacturing","projects","assets","expenses","helpdesk","fleet","maintenance","marketing","subscriptions","pos"]'::jsonb
)
ON CONFLICT (industry_key) DO UPDATE SET
  industry_label = EXCLUDED.industry_label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  default_modules = EXCLUDED.default_modules;

-- Make presets readable by all authenticated users (no user_id scoping needed)
ALTER TABLE public.myerp_industry_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_industry_presets_read"
  ON public.myerp_industry_presets
  FOR SELECT TO authenticated
  USING (true);
