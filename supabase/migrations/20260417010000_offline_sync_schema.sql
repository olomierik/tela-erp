-- Schema additions for offline-first sync.

-- 1. Idempotency cache: prevents duplicate writes on retry.
CREATE TABLE IF NOT EXISTS public.sync_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_idempotency_tenant ON public.sync_idempotency(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_idempotency_created ON public.sync_idempotency(created_at);

-- 2. Tombstone table: server-side record of deletes so the pull endpoint can
--    inform offline clients which rows to remove from their local cache.
CREATE TABLE IF NOT EXISTS public.sync_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  UNIQUE (table_name, row_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_tombstones_tenant_table ON public.sync_tombstones(tenant_id, table_name, deleted_at);

-- 3. Add _version column to offline-capable tables for optimistic concurrency.
--    Using DO block so it's idempotent and tolerant of missing tables.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'sales_orders', 'inventory_items', 'invoices', 'invoice_lines',
    'customers', 'suppliers', 'transactions', 'pos_orders',
    'pos_order_items', 'inventory_transactions', 'inventory_adjustments', 'payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS _version INTEGER NOT NULL DEFAULT 0', t);
      -- Guarantee updated_at exists for delta pulls
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_updated ON public.%I(tenant_id, updated_at)', t, t);
    END IF;
  END LOOP;
END $$;

-- 4. Trigger: on DELETE, write a tombstone so offline clients learn about it.
CREATE OR REPLACE FUNCTION public.write_sync_tombstone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sync_tombstones(tenant_id, table_name, row_id, deleted_by)
  VALUES (OLD.tenant_id, TG_TABLE_NAME, OLD.id, auth.uid())
  ON CONFLICT (table_name, row_id) DO UPDATE
    SET deleted_at = now(), deleted_by = EXCLUDED.deleted_by;
  RETURN OLD;
END;
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'sales_orders', 'inventory_items', 'invoices', 'invoice_lines',
    'customers', 'suppliers', 'transactions', 'pos_orders',
    'pos_order_items', 'inventory_transactions', 'inventory_adjustments', 'payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I_tombstone ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER %I_tombstone AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_sync_tombstone()', t, t);
    END IF;
  END LOOP;
END $$;

-- 5. RLS for the sync housekeeping tables.
ALTER TABLE public.sync_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_tombstones  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_idempotency_tenant_read" ON public.sync_idempotency;
CREATE POLICY "sync_idempotency_tenant_read" ON public.sync_idempotency
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "sync_tombstones_tenant_read" ON public.sync_tombstones;
CREATE POLICY "sync_tombstones_tenant_read" ON public.sync_tombstones
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 6. Cleanup job: drop idempotency keys older than 7 days (run via pg_cron if configured).
COMMENT ON TABLE public.sync_idempotency IS
  'Dedupes sync-push retries. Rows older than 7 days can be safely purged.';
