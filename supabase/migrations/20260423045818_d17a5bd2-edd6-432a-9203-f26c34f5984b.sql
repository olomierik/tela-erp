
-- Rebuild financial report views to aggregate directly from posted voucher entries (real-time)
-- This guarantees every posted voucher (manual + auto from sales/purchase/production triggers) reflects immediately

DROP VIEW IF EXISTS public.trial_balance_view CASCADE;
DROP VIEW IF EXISTS public.profit_loss_view CASCADE;
DROP VIEW IF EXISTS public.balance_sheet_view CASCADE;

CREATE OR REPLACE VIEW public.trial_balance_view
WITH (security_invoker = on) AS
SELECT
  coa.tenant_id,
  coa.id          AS account_id,
  coa.code        AS account_code,
  coa.name        AS account_name,
  coa.account_type,
  COALESCE(SUM(ve.debit), 0)::numeric  AS total_debit,
  COALESCE(SUM(ve.credit), 0)::numeric AS total_credit,
  (COALESCE(SUM(ve.debit), 0) - COALESCE(SUM(ve.credit), 0))::numeric AS running_balance
FROM public.chart_of_accounts coa
LEFT JOIN public.accounting_voucher_entries ve ON ve.account_id = coa.id
LEFT JOIN public.accounting_vouchers v
       ON v.id = ve.voucher_id
      AND v.status = 'posted'
      AND v.tenant_id = coa.tenant_id
GROUP BY coa.tenant_id, coa.id, coa.code, coa.name, coa.account_type
HAVING COALESCE(SUM(ve.debit), 0) <> 0 OR COALESCE(SUM(ve.credit), 0) <> 0;

CREATE OR REPLACE VIEW public.profit_loss_view
WITH (security_invoker = on) AS
SELECT *
FROM public.trial_balance_view
WHERE account_type IN ('revenue', 'income', 'expense');

CREATE OR REPLACE VIEW public.balance_sheet_view
WITH (security_invoker = on) AS
SELECT *
FROM public.trial_balance_view
WHERE account_type IN ('asset', 'liability', 'equity');

-- Fix the trigger so auto-posted vouchers (INSERT with status='posted') also update ledger balances
DROP TRIGGER IF EXISTS trg_voucher_ledger_update ON public.accounting_vouchers;
DROP TRIGGER IF EXISTS trg_voucher_ledger_insert ON public.accounting_vouchers;

CREATE TRIGGER trg_voucher_ledger_insert
  AFTER INSERT ON public.accounting_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_ledger_balances();

CREATE TRIGGER trg_voucher_ledger_update
  AFTER UPDATE OF status ON public.accounting_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_ledger_balances();
