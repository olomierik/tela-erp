
-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: TALLY-INSPIRED ACCOUNTING ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Vouchers (transaction headers)
CREATE TABLE public.accounting_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  voucher_type TEXT NOT NULL DEFAULT 'journal'
    CHECK (voucher_type IN ('sale','purchase','payment','receipt','journal','contra','credit_note','debit_note')),
  voucher_number TEXT NOT NULL,
  reference TEXT,
  narration TEXT NOT NULL DEFAULT '',
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','posted','cancelled')),
  is_auto BOOLEAN NOT NULL DEFAULT false,
  source_module TEXT,
  source_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, voucher_number)
);

-- 2. Voucher entries (double-entry lines)
CREATE TABLE public.accounting_voucher_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.accounting_vouchers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  description TEXT NOT NULL DEFAULT '',
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Ledger balances cache (for ultra-fast reads)
CREATE TABLE public.accounting_ledger_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  total_debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  last_voucher_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, account_id)
);

-- 4. Indexes for performance
CREATE INDEX idx_vouchers_tenant_date ON public.accounting_vouchers(tenant_id, voucher_date DESC);
CREATE INDEX idx_vouchers_tenant_type ON public.accounting_vouchers(tenant_id, voucher_type);
CREATE INDEX idx_voucher_entries_voucher ON public.accounting_voucher_entries(voucher_id);
CREATE INDEX idx_voucher_entries_account ON public.accounting_voucher_entries(tenant_id, account_id);
CREATE INDEX idx_ledger_balances_tenant ON public.accounting_ledger_balances(tenant_id, account_id);

-- 5. RLS
ALTER TABLE public.accounting_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_voucher_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ledger_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.accounting_vouchers
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant isolation" ON public.accounting_voucher_entries
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant isolation" ON public.accounting_ledger_balances
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 6. Trigger: update ledger balances when voucher posted
CREATE OR REPLACE FUNCTION public.trg_update_ledger_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _entry RECORD;
BEGIN
  -- Only process when status changes to 'posted'
  IF NEW.status = 'posted' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'posted') THEN
    FOR _entry IN
      SELECT account_id, debit, credit FROM accounting_voucher_entries WHERE voucher_id = NEW.id
    LOOP
      INSERT INTO accounting_ledger_balances (tenant_id, account_id, total_debit, total_credit, running_balance, last_voucher_date)
      VALUES (NEW.tenant_id, _entry.account_id, _entry.debit, _entry.credit, _entry.debit - _entry.credit, NEW.voucher_date)
      ON CONFLICT (tenant_id, account_id) DO UPDATE SET
        total_debit = accounting_ledger_balances.total_debit + _entry.debit,
        total_credit = accounting_ledger_balances.total_credit + _entry.credit,
        running_balance = accounting_ledger_balances.running_balance + _entry.debit - _entry.credit,
        last_voucher_date = GREATEST(accounting_ledger_balances.last_voucher_date, NEW.voucher_date),
        updated_at = now();
    END LOOP;
  END IF;

  -- Handle cancellation: reverse the balances
  IF NEW.status = 'cancelled' AND OLD.status = 'posted' THEN
    FOR _entry IN
      SELECT account_id, debit, credit FROM accounting_voucher_entries WHERE voucher_id = NEW.id
    LOOP
      UPDATE accounting_ledger_balances SET
        total_debit = total_debit - _entry.debit,
        total_credit = total_credit - _entry.credit,
        running_balance = running_balance - (_entry.debit - _entry.credit),
        updated_at = now()
      WHERE tenant_id = NEW.tenant_id AND account_id = _entry.account_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_voucher_ledger_update
  AFTER UPDATE ON public.accounting_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_ledger_balances();

-- 7. Auto-update updated_at
CREATE TRIGGER set_updated_at_vouchers
  BEFORE UPDATE ON public.accounting_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Views for financial reports
CREATE OR REPLACE VIEW public.trial_balance_view AS
SELECT
  lb.tenant_id,
  lb.account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,
  lb.total_debit,
  lb.total_credit,
  lb.running_balance
FROM accounting_ledger_balances lb
JOIN chart_of_accounts a ON a.id = lb.account_id;

CREATE OR REPLACE VIEW public.profit_loss_view AS
SELECT
  lb.tenant_id,
  a.account_type,
  a.code AS account_code,
  a.name AS account_name,
  lb.total_debit,
  lb.total_credit,
  lb.running_balance
FROM accounting_ledger_balances lb
JOIN chart_of_accounts a ON a.id = lb.account_id
WHERE a.account_type IN ('revenue', 'expense', 'income');

CREATE OR REPLACE VIEW public.balance_sheet_view AS
SELECT
  lb.tenant_id,
  a.account_type,
  a.code AS account_code,
  a.name AS account_name,
  lb.total_debit,
  lb.total_credit,
  lb.running_balance
FROM accounting_ledger_balances lb
JOIN chart_of_accounts a ON a.id = lb.account_id
WHERE a.account_type IN ('asset', 'liability', 'equity');

-- 9. Enable realtime on vouchers
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounting_vouchers;

-- 10. Voucher number sequence function
CREATE OR REPLACE FUNCTION public.next_voucher_number(_tenant_id UUID, _type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prefix TEXT;
  _year TEXT;
  _count INT;
BEGIN
  _prefix := UPPER(LEFT(_type, 3));
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count
  FROM accounting_vouchers
  WHERE tenant_id = _tenant_id AND voucher_type = _type
    AND EXTRACT(YEAR FROM voucher_date) = EXTRACT(YEAR FROM NOW());
  RETURN _prefix || '-' || _year || '-' || LPAD(_count::TEXT, 5, '0');
END;
$$;
