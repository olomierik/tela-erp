
-- ────────────────────────────────────────────────────────────────────────
-- 1. SUBSCRIPTION INVOICES TABLE
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  period          TEXT NOT NULL,                  -- YYYY-MM
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'pending'  -- pending | paid | overdue | cancelled
                  CHECK (status IN ('pending','paid','overdue','cancelled')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period)
);

CREATE INDEX IF NOT EXISTS idx_subinv_tenant_period   ON public.subscription_invoices (tenant_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_subinv_status          ON public.subscription_invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subinv_subscription    ON public.subscription_invoices (subscription_id);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subinv_select ON public.subscription_invoices;
CREATE POLICY subinv_select ON public.subscription_invoices
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS subinv_insert ON public.subscription_invoices;
CREATE POLICY subinv_insert ON public.subscription_invoices
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS subinv_update ON public.subscription_invoices;
CREATE POLICY subinv_update ON public.subscription_invoices
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS subinv_delete ON public.subscription_invoices;
CREATE POLICY subinv_delete ON public.subscription_invoices
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'reseller')));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_subinv_updated_at ON public.subscription_invoices;
CREATE TRIGGER trg_subinv_updated_at
BEFORE UPDATE ON public.subscription_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────
-- 2. GENERATE 12 MONTHLY INVOICES PER SUBSCRIPTION (idempotent)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_subscription_invoices(_subscription_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sub RECORD;
  _i INT;
  _start DATE;
  _end   DATE;
  _period TEXT;
  _due DATE;
  _amount NUMERIC;
  _inv_no TEXT;
  _created INT := 0;
BEGIN
  SELECT * INTO _sub FROM public.subscriptions WHERE id = _subscription_id;
  IF _sub IS NULL THEN RETURN 0; END IF;

  -- Monthly equivalent amount
  _amount := CASE _sub.billing_period
               WHEN 'monthly'   THEN _sub.price
               WHEN 'yearly'    THEN _sub.price / 12
               WHEN 'quarterly' THEN _sub.price / 3
               WHEN 'weekly'    THEN _sub.price * 4
               ELSE _sub.price
             END;

  FOR _i IN 0..11 LOOP
    _start  := (date_trunc('month', _sub.start_date) + (_i || ' month')::interval)::date;
    _end    := (_start + interval '1 month - 1 day')::date;
    _due    := _start + 7;  -- due 7 days into the period
    _period := to_char(_start, 'YYYY-MM');
    _inv_no := 'SI-' || upper(substr(_subscription_id::text, 1, 8)) || '-' || _period;

    INSERT INTO public.subscription_invoices(
      tenant_id, subscription_id, invoice_number, period,
      period_start, period_end, due_date, amount, currency, status
    ) VALUES (
      _sub.tenant_id, _subscription_id, _inv_no, _period,
      _start, _end, _due, _amount, _sub.currency,
      CASE WHEN _due < CURRENT_DATE THEN 'overdue' ELSE 'pending' END
    )
    ON CONFLICT (subscription_id, period) DO NOTHING;

    IF FOUND THEN _created := _created + 1; END IF;
  END LOOP;

  RETURN _created;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- 3. MARK A SUBSCRIPTION INVOICE PAID / UNPAID
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_subscription_invoice_status(_invoice_id UUID, _status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _status NOT IN ('pending','paid','overdue','cancelled') THEN
    RAISE EXCEPTION 'invalid status %', _status;
  END IF;
  UPDATE public.subscription_invoices
     SET status   = _status,
         paid_at  = CASE WHEN _status = 'paid' THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id = _invoice_id
     AND tenant_id = public.get_user_tenant_id(auth.uid());
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- 4. AUTO-MARK OVERDUE (run regularly)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_subscription_invoice_overdue()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n INT;
BEGIN
  UPDATE public.subscription_invoices
     SET status = 'overdue', updated_at = now()
   WHERE status = 'pending' AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- 5. PAYROLL LINES — allow tenant updates (edit salaries, recompute on save)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenant can update payroll lines" ON public.payroll_lines;
CREATE POLICY "Tenant can update payroll lines"
  ON public.payroll_lines
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.payroll_runs r
               WHERE r.id = payroll_lines.payroll_run_id
                 AND r.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.payroll_runs r
               WHERE r.id = payroll_lines.payroll_run_id
                 AND r.tenant_id = public.get_user_tenant_id(auth.uid()))
  );

-- ────────────────────────────────────────────────────────────────────────
-- 6. PAYROLL RUN — recompute totals from lines (after edits)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_payroll_run_totals(_run_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _t UUID;
BEGIN
  SELECT tenant_id INTO _t FROM public.payroll_runs WHERE id = _run_id;
  IF _t IS NULL OR _t <> public.get_user_tenant_id(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.payroll_runs r
     SET total_gross         = COALESCE(s.gross,0),
         total_paye          = COALESCE(s.paye,0),
         total_nssf_employee = COALESCE(s.nssfe,0),
         total_nssf_employer = COALESCE(s.nssfr,0),
         total_sdl           = COALESCE(s.sdl,0),
         total_wcf           = COALESCE(s.wcf,0),
         total_net           = COALESCE(s.net,0),
         total_deductions    = COALESCE(s.paye,0) + COALESCE(s.nssfe,0),
         total_employer_cost = COALESCE(s.gross,0) + COALESCE(s.nssfr,0)
                              + COALESCE(s.sdl,0) + COALESCE(s.wcf,0),
         employee_count      = COALESCE(s.cnt,0)
    FROM (
      SELECT SUM(gross_salary) gross, SUM(paye) paye,
             SUM(nssf_employee) nssfe, SUM(nssf_employer) nssfr,
             SUM(sdl) sdl, SUM(wcf) wcf, SUM(net_salary) net,
             COUNT(*) cnt
        FROM public.payroll_lines WHERE payroll_run_id = _run_id
    ) s
   WHERE r.id = _run_id;
END $$;
