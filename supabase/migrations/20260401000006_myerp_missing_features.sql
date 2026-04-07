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
