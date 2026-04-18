-- Migration: extend offline sync to all app tables.
-- Adds _version + updated_at (for delta pull) and tombstone triggers to the
-- 32 new offline-capable tables. Uses IF EXISTS guards on every table so the
-- migration is safe to run even if some tables don't exist in a given deploy.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'production_orders', 'campaigns', 'purchase_orders', 'inventory_reservations',
    'audit_log', 'categories', 'stock_transfers', 'bom_templates', 'bom_lines',
    'chart_of_accounts', 'journal_entries', 'stores', 'projects', 'project_tasks',
    'notifications', 'employees', 'departments', 'attendance_logs', 'leave_requests',
    'payroll_runs', 'payroll_lines', 'crm_deals', 'crm_activities', 'scanned_documents',
    'fixed_assets', 'expense_claims', 'expense_items', 'budgets', 'budget_lines',
    'automation_rules', 'tax_rates', 'team_invites',
    -- Also cover the renamed table (pos_order_items → pos_order_lines)
    'pos_order_lines'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS _version INTEGER NOT NULL DEFAULT 0', t
      );
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()', t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_tenant_updated ON public.%I(tenant_id, updated_at)', t, t
      );
      -- Tombstone trigger so offline clients learn about server-side deletes
      EXECUTE format(
        'DROP TRIGGER IF EXISTS %I_tombstone ON public.%I', t, t
      );
      EXECUTE format(
        'CREATE TRIGGER %I_tombstone
           AFTER DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.write_sync_tombstone()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
