
-- Fix: recreate views with security_invoker = true
DROP VIEW IF EXISTS public.trial_balance_view;
DROP VIEW IF EXISTS public.profit_loss_view;
DROP VIEW IF EXISTS public.balance_sheet_view;

CREATE VIEW public.trial_balance_view
WITH (security_invoker = true)
AS
SELECT
  lb.tenant_id,
  lb.account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,
  lb.total_debit,
  lb.total_credit,
  lb.running_balance
FROM public.accounting_ledger_balances lb
JOIN public.chart_of_accounts a ON a.id = lb.account_id;

CREATE VIEW public.profit_loss_view
WITH (security_invoker = true)
AS
SELECT
  lb.tenant_id,
  a.account_type,
  a.code AS account_code,
  a.name AS account_name,
  lb.total_debit,
  lb.total_credit,
  lb.running_balance
FROM public.accounting_ledger_balances lb
JOIN public.chart_of_accounts a ON a.id = lb.account_id
WHERE a.account_type IN ('revenue', 'expense', 'income');

CREATE VIEW public.balance_sheet_view
WITH (security_invoker = true)
AS
SELECT
  lb.tenant_id,
  a.account_type,
  a.code AS account_code,
  a.name AS account_name,
  lb.total_debit,
  lb.total_credit,
  lb.running_balance
FROM public.accounting_ledger_balances lb
JOIN public.chart_of_accounts a ON a.id = lb.account_id
WHERE a.account_type IN ('asset', 'liability', 'equity');
