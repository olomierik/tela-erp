-- ============================================================================
-- Extend existing payroll_runs to support monthly posting + auto cron
-- ============================================================================

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS period TEXT,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS posted_by UUID,
  ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS employee_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paye NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_nssf_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_nssf_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sdl NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_wcf NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_employer_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill period from month/year on existing rows
UPDATE public.payroll_runs
   SET period = LPAD(year::text, 4, '0') || '-' || LPAD(month::text, 2, '0')
 WHERE period IS NULL AND month IS NOT NULL AND year IS NOT NULL;

-- Make period NOT NULL going forward (default to current month for any orphan)
UPDATE public.payroll_runs SET period = TO_CHAR(now(), 'YYYY-MM') WHERE period IS NULL;
ALTER TABLE public.payroll_runs ALTER COLUMN period SET NOT NULL;

-- One run per (tenant, period)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_tenant_period
  ON public.payroll_runs (tenant_id, period);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_period_desc
  ON public.payroll_runs (tenant_id, period DESC);

-- Extend payroll_lines with snapshot fields
ALTER TABLE public.payroll_lines
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS employee_name TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS basic NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paye_band TEXT,
  ADD COLUMN IF NOT EXISTS wcf NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON public.payroll_lines(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_tenant ON public.payroll_lines(tenant_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant can view payroll runs" ON public.payroll_runs;
CREATE POLICY "Tenant can view payroll runs" ON public.payroll_runs FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Tenant can insert payroll runs" ON public.payroll_runs;
CREATE POLICY "Tenant can insert payroll runs" ON public.payroll_runs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete payroll runs" ON public.payroll_runs;
CREATE POLICY "Admins can delete payroll runs" ON public.payroll_runs FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller')));

DROP POLICY IF EXISTS "Tenant can view payroll lines" ON public.payroll_lines;
CREATE POLICY "Tenant can view payroll lines" ON public.payroll_lines FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         OR EXISTS (SELECT 1 FROM public.payroll_runs r
                     WHERE r.id = payroll_lines.payroll_run_id
                       AND r.tenant_id = public.get_user_tenant_id(auth.uid())));

DROP POLICY IF EXISTS "Tenant can insert payroll lines" ON public.payroll_lines;
CREATE POLICY "Tenant can insert payroll lines" ON public.payroll_lines FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
              OR EXISTS (SELECT 1 FROM public.payroll_runs r
                          WHERE r.id = payroll_lines.payroll_run_id
                            AND r.tenant_id = public.get_user_tenant_id(auth.uid())));

-- ============================================================================
-- RPC: post_payroll_run — idempotent monthly snapshot
-- ============================================================================
CREATE OR REPLACE FUNCTION public.post_payroll_run(
  _tenant_id UUID,
  _period    TEXT,
  _is_auto   BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run_id      UUID;
  _existing_id UUID;
  _emp_count   INT;
  _sdl_liable  BOOLEAN;
  _y INT; _m INT;
  _emp RECORD;
  _basic NUMERIC; _allow NUMERIC; _gross NUMERIC;
  _paye NUMERIC; _band TEXT;
  _nssf_e NUMERIC; _nssf_r NUMERIC;
  _sdl NUMERIC; _wcf NUMERIC; _net NUMERIC;
  _t_gross NUMERIC := 0; _t_paye NUMERIC := 0;
  _t_nssfe NUMERIC := 0; _t_nssfr NUMERIC := 0;
  _t_sdl NUMERIC := 0; _t_wcf NUMERIC := 0; _t_net NUMERIC := 0;
BEGIN
  IF _period !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid period format, expected YYYY-MM, got %', _period;
  END IF;
  _y := SPLIT_PART(_period, '-', 1)::INT;
  _m := SPLIT_PART(_period, '-', 2)::INT;

  SELECT id INTO _existing_id FROM public.payroll_runs
   WHERE tenant_id = _tenant_id AND period = _period LIMIT 1;
  IF _existing_id IS NOT NULL THEN RETURN _existing_id; END IF;

  SELECT COUNT(*) INTO _emp_count FROM public.employees
    WHERE tenant_id = _tenant_id AND status = 'active';
  _sdl_liable := _emp_count >= 10;

  INSERT INTO public.payroll_runs(tenant_id, period, month, year, status,
        posted_at, posted_by, is_auto, employee_count)
    VALUES (_tenant_id, _period, _m, _y, 'posted',
        now(), auth.uid(), _is_auto, _emp_count)
    RETURNING id INTO _run_id;

  FOR _emp IN
    SELECT id, full_name, position, department, salary, allowances
      FROM public.employees
     WHERE tenant_id = _tenant_id AND status = 'active'
  LOOP
    _basic := COALESCE(_emp.salary, 0);
    _allow := COALESCE(_emp.allowances, 0);
    _gross := _basic + _allow;

    IF    _gross <= 270000  THEN _paye := 0;                                _band := '0%';
    ELSIF _gross <= 520000  THEN _paye := (_gross - 270000) * 0.08;         _band := '8%';
    ELSIF _gross <= 760000  THEN _paye := 20000  + (_gross - 520000)*0.20;  _band := '20%';
    ELSIF _gross <= 1000000 THEN _paye := 68000  + (_gross - 760000)*0.25;  _band := '25%';
    ELSE                         _paye := 128000 + (_gross - 1000000)*0.30; _band := '30%';
    END IF;

    _nssf_e := _basic * 0.10;
    _nssf_r := _basic * 0.10;
    _sdl    := CASE WHEN _sdl_liable THEN _gross * 0.035 ELSE 0 END;
    _wcf    := _gross * 0.005;
    _net    := _gross - _paye - _nssf_e;

    INSERT INTO public.payroll_lines(payroll_run_id, tenant_id, employee_id,
        employee_name, position, department,
        basic, allowances, gross_salary, paye, paye_band,
        nssf_employee, nssf_employer, sdl, wcf, net_salary)
    VALUES (_run_id, _tenant_id, _emp.id,
        _emp.full_name, _emp.position, _emp.department,
        _basic, _allow, _gross, _paye, _band,
        _nssf_e, _nssf_r, _sdl, _wcf, _net);

    _t_gross := _t_gross + _gross;
    _t_paye  := _t_paye  + _paye;
    _t_nssfe := _t_nssfe + _nssf_e;
    _t_nssfr := _t_nssfr + _nssf_r;
    _t_sdl   := _t_sdl   + _sdl;
    _t_wcf   := _t_wcf   + _wcf;
    _t_net   := _t_net   + _net;
  END LOOP;

  UPDATE public.payroll_runs SET
    total_gross = _t_gross,
    total_deductions = _t_paye + _t_nssfe,
    total_net = _t_net,
    total_paye = _t_paye,
    total_nssf_employee = _t_nssfe,
    total_nssf_employer = _t_nssfr,
    total_sdl = _t_sdl,
    total_wcf = _t_wcf,
    total_employer_cost = _t_gross + _t_nssfr + _t_sdl + _t_wcf
  WHERE id = _run_id;

  INSERT INTO public.audit_log(tenant_id, action, module, reference_id, details)
  VALUES (_tenant_id, CASE WHEN _is_auto THEN 'payroll_auto_posted' ELSE 'payroll_posted' END,
          'hr', _run_id::text,
          jsonb_build_object('period', _period, 'employees', _emp_count,
                             'gross', _t_gross, 'net', _t_net, 'auto', _is_auto));

  RETURN _run_id;
END $$;

GRANT EXECUTE ON FUNCTION public.post_payroll_run(UUID, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- Cron entrypoint: post previous-month payroll for all active tenants
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cron_post_monthly_payroll()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _t RECORD; _period TEXT; _count INT := 0;
BEGIN
  _period := TO_CHAR((CURRENT_DATE - INTERVAL '1 month')::date, 'YYYY-MM');
  FOR _t IN SELECT id FROM public.tenants WHERE is_active = true LOOP
    BEGIN
      PERFORM public.post_payroll_run(_t.id, _period, true);
      _count := _count + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.audit_log(tenant_id, action, module, reference_id, details)
      VALUES (_t.id, 'payroll_auto_failed', 'hr', _period,
              jsonb_build_object('error', SQLERRM));
    END;
  END LOOP;
  RETURN _count;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('post-monthly-payroll');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'post-monthly-payroll',
  '0 2 1 * *',
  $$ SELECT public.cron_post_monthly_payroll(); $$
);
