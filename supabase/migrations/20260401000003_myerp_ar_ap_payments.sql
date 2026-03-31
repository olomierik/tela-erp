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
