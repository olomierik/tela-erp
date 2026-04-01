-- ============================================================
-- Enterprise Features Migration
-- Adds: team_invites, role_permissions, scanned_documents,
--       fixed_assets, expense_claims, budgets,
--       automation_rules, tax_rates, recurring_templates
-- ============================================================

-- ─── Team Invites ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  store_role TEXT DEFAULT 'user',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_team_invites" ON public.team_invites
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Role Permissions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_role_permissions" ON public.role_permissions
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Scanned Documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scanned_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_name TEXT,
  file_url TEXT,
  document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'receipt', 'purchase_order', 'contract', 'other')),
  extracted_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error', 'linked')),
  linked_record_type TEXT,
  linked_record_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_scanned_documents" ON public.scanned_documents
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Fixed Assets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'equipment' CHECK (category IN ('equipment', 'furniture', 'vehicle', 'property', 'software', 'intangible', 'other')),
  purchase_date DATE,
  purchase_cost NUMERIC(14, 2) DEFAULT 0,
  current_value NUMERIC(14, 2) DEFAULT 0,
  salvage_value NUMERIC(14, 2) DEFAULT 0,
  useful_life_years INTEGER DEFAULT 5,
  depreciation_method TEXT DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'none')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'under_maintenance', 'fully_depreciated')),
  location TEXT,
  serial_number TEXT,
  accumulated_depreciation NUMERIC(14, 2) DEFAULT 0,
  gl_account TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_depreciation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  depreciation_amount NUMERIC(14, 2),
  book_value_after NUMERIC(14, 2),
  journal_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  maintenance_type TEXT DEFAULT 'scheduled' CHECK (maintenance_type IN ('scheduled', 'repair', 'inspection', 'upgrade')),
  performed_date DATE,
  cost NUMERIC(10, 2) DEFAULT 0,
  description TEXT,
  next_maintenance_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_depreciation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_fixed_assets" ON public.fixed_assets
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation_asset_depreciation" ON public.asset_depreciation_entries
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation_asset_maintenance" ON public.asset_maintenance_logs
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Expense Management ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  employee_name TEXT,
  employee_id UUID,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  amount NUMERIC(10, 2) DEFAULT 0,
  expense_date DATE,
  receipt_url TEXT,
  merchant TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_expense_claims" ON public.expense_claims
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation_expense_items" ON public.expense_items
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Budget Management ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  period TEXT DEFAULT 'annual' CHECK (period IN ('monthly', 'quarterly', 'annual')),
  department TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  total_budget NUMERIC(14, 2) DEFAULT 0,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  budgeted_amount NUMERIC(12, 2) DEFAULT 0,
  actual_amount NUMERIC(12, 2) DEFAULT 0,
  period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_budgets" ON public.budgets
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation_budget_lines" ON public.budget_lines
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Automation Rules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  actions_executed JSONB DEFAULT '[]',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_automation_rules" ON public.automation_rules
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation_automation_logs" ON public.automation_logs
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Tax Rates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
  tax_type TEXT DEFAULT 'vat' CHECK (tax_type IN ('vat', 'gst', 'sales_tax', 'withholding', 'customs', 'other')),
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'goods', 'services')),
  gl_account TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_tax_rates" ON public.tax_rates
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Recurring Templates ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'invoice' CHECK (template_type IN ('invoice', 'expense', 'purchase_order', 'transaction')),
  template_data JSONB NOT NULL DEFAULT '{}',
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
  start_date DATE,
  end_date DATE,
  next_run_date DATE,
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_recurring_templates" ON public.recurring_templates
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_invites_tenant ON public.team_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant ON public.fixed_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant ON public.expense_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON public.budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON public.automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant ON public.tax_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_tenant ON public.recurring_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_tenant ON public.scanned_documents(tenant_id);
