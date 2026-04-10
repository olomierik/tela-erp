-- ============================================================
-- AI Tax Consultant, Business Process Automation Engine,
-- and TRA E-Filing Integration — all shared tables
-- ============================================================

-- ===========================
-- AI / TAX CONSULTANT TABLES
-- ===========================

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_type TEXT DEFAULT 'tax_consultant' CHECK (session_type IN ('tax_consultant','general')),
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.computed_tax_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('paye','sdl','vat','corporate_tax')),
  period TEXT NOT NULL,         -- e.g. "2025-08" or "Q3-2025"
  amount NUMERIC NOT NULL DEFAULT 0,
  employee_count INTEGER,       -- for paye/sdl
  computed_at TIMESTAMPTZ DEFAULT now(),
  computation_source TEXT DEFAULT 'auto' CHECK (computation_source IN ('auto','manual','ai'))
);

CREATE TABLE IF NOT EXISTS public.ai_tax_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('anomaly','deadline','overdue','optimization')),
  message TEXT NOT NULL,
  period TEXT,
  amount NUMERIC,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_optimization_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  finding TEXT NOT NULL,
  potential_saving_tzs NUMERIC DEFAULT 0,
  regulation TEXT,
  actioned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =================================
-- TRA E-FILING TABLES
-- =================================

CREATE TABLE IF NOT EXISTS public.tra_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tin_number VARCHAR(20) NOT NULL,
  tra_username VARCHAR(100) NOT NULL,
  session_token TEXT,            -- AES-256 encrypted in application layer
  session_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  disconnected_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tra_filing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  return_type TEXT NOT NULL CHECK (return_type IN ('paye','sdl','vat','corporate_tax')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tra_reference TEXT,            -- TRA acknowledgement number
  filed_at TIMESTAMPTZ,
  filed_by_user_id UUID,
  status TEXT DEFAULT 'unfiled' CHECK (status IN ('unfiled','filed','rejected','pending'))
);

-- IMMUTABLE audit log — no UPDATE or DELETE allowed
CREATE TABLE IF NOT EXISTS public.tra_filing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'login','scan','classify','file_attempt','file_success',
    'file_failure','overdue_blocked','logout'
  )),
  return_type TEXT,
  period TEXT,
  tra_reference TEXT,
  performed_by_user_id UUID,
  performed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Prevent any UPDATE or DELETE on the audit log (immutability enforced at DB level)
CREATE OR REPLACE RULE tra_audit_no_update AS ON UPDATE TO public.tra_filing_audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE tra_audit_no_delete AS ON DELETE TO public.tra_filing_audit_log DO INSTEAD NOTHING;

-- =================================
-- AUTOMATION / AI TABLES
-- =================================

CREATE TABLE IF NOT EXISTS public.automation_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  trigger_type TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success','failed','skipped')),
  output JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.ai_anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_id TEXT,
  transaction_date DATE,
  amount NUMERIC,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('large_amount','duplicate','unusual_pattern','missing_po','fraud_pattern')),
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  suggested_action TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'daily_cash','daily_receivables','weekly_invoices','weekly_payables',
    'monthly_pl','monthly_balance_sheet','monthly_payroll',
    'monthly_tax','quarterly_vat','quarterly_sdl','quarterly_management'
  )),
  period TEXT NOT NULL,
  ai_summary TEXT,
  file_path TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  emailed_at TIMESTAMPTZ,
  email_recipients JSONB DEFAULT '[]'
);

-- =================================
-- RLS POLICIES
-- =================================

-- ai_chat_sessions
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_chatsess" ON public.ai_chat_sessions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_chatsess" ON public.ai_chat_sessions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_chatsess" ON public.ai_chat_sessions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_chatsess" ON public.ai_chat_sessions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- computed_tax_liabilities
ALTER TABLE public.computed_tax_liabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_taxliab" ON public.computed_tax_liabilities FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_taxliab" ON public.computed_tax_liabilities FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_taxliab" ON public.computed_tax_liabilities FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_taxliab" ON public.computed_tax_liabilities FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ai_tax_alerts
ALTER TABLE public.ai_tax_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_taxalert" ON public.ai_tax_alerts FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_taxalert" ON public.ai_tax_alerts FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_taxalert" ON public.ai_tax_alerts FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_taxalert" ON public.ai_tax_alerts FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- tax_optimization_findings
ALTER TABLE public.tax_optimization_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_taxopt" ON public.tax_optimization_findings FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_taxopt" ON public.tax_optimization_findings FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_taxopt" ON public.tax_optimization_findings FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_taxopt" ON public.tax_optimization_findings FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- tra_sessions
ALTER TABLE public.tra_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_trasess" ON public.tra_sessions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_trasess" ON public.tra_sessions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_trasess" ON public.tra_sessions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_trasess" ON public.tra_sessions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- tra_filing_records
ALTER TABLE public.tra_filing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_trafile" ON public.tra_filing_records FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_trafile" ON public.tra_filing_records FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_trafile" ON public.tra_filing_records FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_trafile" ON public.tra_filing_records FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- tra_filing_audit_log (insert only — no select for non-admin is fine, allow select for tenant)
ALTER TABLE public.tra_filing_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_traaudit" ON public.tra_filing_audit_log FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_traaudit" ON public.tra_filing_audit_log FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- No UPDATE or DELETE policies — covered by the immutability rules above

-- automation_execution_log
ALTER TABLE public.automation_execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_autoexec" ON public.automation_execution_log FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_autoexec" ON public.automation_execution_log FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_autoexec" ON public.automation_execution_log FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_autoexec" ON public.automation_execution_log FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ai_anomaly_alerts
ALTER TABLE public.ai_anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_anomaly" ON public.ai_anomaly_alerts FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_anomaly" ON public.ai_anomaly_alerts FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_anomaly" ON public.ai_anomaly_alerts FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_anomaly" ON public.ai_anomaly_alerts FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- generated_reports
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_sel_genrep" ON public.generated_reports FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_ins_genrep" ON public.generated_reports FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_upd_genrep" ON public.generated_reports FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "t_del_genrep" ON public.generated_reports FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- =================================
-- PERFORMANCE INDEXES
-- =================================

CREATE INDEX IF NOT EXISTS idx_ai_chat_tenant ON public.ai_chat_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_liab_tenant_period ON public.computed_tax_liabilities(tenant_id, type, period);
CREATE INDEX IF NOT EXISTS idx_ai_tax_alerts_tenant ON public.ai_tax_alerts(tenant_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_opt_tenant ON public.tax_optimization_findings(tenant_id, actioned);
CREATE INDEX IF NOT EXISTS idx_tra_sess_tenant ON public.tra_sessions(tenant_id, disconnected_at);
CREATE INDEX IF NOT EXISTS idx_tra_file_tenant ON public.tra_filing_records(tenant_id, return_type, period_start);
CREATE INDEX IF NOT EXISTS idx_tra_audit_tenant ON public.tra_filing_audit_log(tenant_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_exec_tenant ON public.automation_execution_log(tenant_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_tenant ON public.ai_anomaly_alerts(tenant_id, resolved, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_genrep_tenant ON public.generated_reports(tenant_id, report_type, generated_at DESC);
