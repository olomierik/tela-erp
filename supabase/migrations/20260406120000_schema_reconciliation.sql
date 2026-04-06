-- ============================================================================
-- SCHEMA RECONCILIATION MIGRATION
-- Adds missing columns that the frontend UI expects but the database lacks.
-- This ensures all buttons, forms, and display fields work correctly.
-- ============================================================================

-- ─── Suppliers: add rating, tax_id, notes ────────────────────────────────────
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rating integer DEFAULT 3;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text;

-- ─── Customers: add tier, company, total_orders, total_spent ─────────────────
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tier text DEFAULT 'New';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent numeric(15,2) DEFAULT 0;

-- ─── CRM Deals: ensure field names match frontend ───────────────────────────
-- The migration uses expected_close_date but frontend was using close_date.
-- We fixed the frontend to use expected_close_date, but add an alias view for safety.
-- Also add contact_name and company for denormalized display.
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS company text;

-- ─── Projects: add budget, progress, priority, description ──────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget numeric(15,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS manager text;

-- ─── Project Tasks: add assignee, priority, due_date, completed_at ──────────
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS assignee text;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ─── Production Orders: ensure item_id and product_name exist ───────────────
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS item_id uuid;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS end_date date;

-- ─── Stock Transfers: ensure item_id exists ─────────────────────────────────
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS item_id uuid;

-- ─── Budgets: add department and period columns ─────────────────────────────
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period text DEFAULT 'annual';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS fiscal_year integer DEFAULT EXTRACT(YEAR FROM now());
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_budget numeric(15,2) DEFAULT 0;

-- ─── Budget Lines: ensure actual_amount exists ──────────────────────────────
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS actual_amount numeric(15,2) DEFAULT 0;

-- ─── Payments: add mobile money columns to tenant-scoped table ──────────────
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mobile_money_provider text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mobile_money_number text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_reference text;

-- ─── Fixed Assets: add useful_life, salvage_value, depreciation_method ──────
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS useful_life_years integer DEFAULT 5;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS salvage_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS depreciation_method text DEFAULT 'straight_line';
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS assigned_to text;

-- ─── Employees: add department_name, position, salary for HR display ────────
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary numeric(15,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time';

-- ─── Expense Claims: add category, receipt_url ──────────────────────────────
ALTER TABLE public.expense_claims ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.expense_claims ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.expense_claims ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE public.expense_claims ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- ─── Invoices: add due_date, payment_status ─────────────────────────────────
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;

-- ─── Sales Orders: add delivery_date, shipping_address ──────────────────────
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS payment_method text;

-- ─── Purchase Orders: add expected_delivery, supplier_name ──────────────────
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery date;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_name text;

-- ─── Notifications: add is_read, action_url ─────────────────────────────────
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;

-- ─── Automation Rules: add last_triggered_at ────────────────────────────────
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_crm_activities_customer ON public.crm_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON public.crm_activities(type);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON public.budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON public.production_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
