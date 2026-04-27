-- Add unique constraints required by payroll upsert (onConflict)
-- 1) payroll_runs: one run per (tenant, period)
ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_tenant_period_key UNIQUE (tenant_id, period);

-- 2) payroll_lines: one line per (run, employee) — used by upsert
ALTER TABLE public.payroll_lines
  ADD CONSTRAINT payroll_lines_run_employee_key UNIQUE (payroll_run_id, employee_id);