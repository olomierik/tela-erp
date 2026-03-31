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
