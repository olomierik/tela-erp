-- ═══════════════════════════════════════════════════════════════════════════════
-- Integration Gap Fixes
-- 1. Drop DB triggers that conflict with React hooks (double-counting)
-- 2. Add sales_order_lines and purchase_order_lines proper tables
-- 3. Ensure journal_entries has INSERT policy (already exists, safety check)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Drop conflicting DB triggers ───────────────────────────────────────────
-- These triggers fired on production completion and sales fulfillment, causing
-- double inventory updates alongside the React cross-module hooks.

-- All variants of the production trigger
DROP TRIGGER IF EXISTS production_completed_trigger ON public.production_orders;
DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
DROP TRIGGER IF EXISTS production_completed_insert_trigger ON public.production_orders;

-- All variants of the sales fulfillment trigger
DROP TRIGGER IF EXISTS sales_order_fulfilled_trigger ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_sales_fulfilled ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_sales_order_fulfilled ON public.sales_orders;

-- ── 2. Add sales_order_lines table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_order_lines (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sales_order_id UUID      NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id     UUID         REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description TEXT         NOT NULL DEFAULT '',
  quantity    INTEGER      NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales_order_lines' AND policyname='sol_select') THEN
    CREATE POLICY sol_select ON public.sales_order_lines FOR SELECT TO authenticated
      USING (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales_order_lines' AND policyname='sol_insert') THEN
    CREATE POLICY sol_insert ON public.sales_order_lines FOR INSERT TO authenticated
      WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales_order_lines' AND policyname='sol_delete') THEN
    CREATE POLICY sol_delete ON public.sales_order_lines FOR DELETE TO authenticated
      USING (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sol_order ON public.sales_order_lines (tenant_id, sales_order_id);

-- ── 3. Add purchase_order_lines table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purchase_order_id UUID         NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id           UUID         REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description       TEXT         NOT NULL DEFAULT '',
  quantity          INTEGER      NOT NULL DEFAULT 1,
  unit_cost         NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_order_lines' AND policyname='pol_select') THEN
    CREATE POLICY pol_select ON public.purchase_order_lines FOR SELECT TO authenticated
      USING (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_order_lines' AND policyname='pol_insert') THEN
    CREATE POLICY pol_insert ON public.purchase_order_lines FOR INSERT TO authenticated
      WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_order_lines' AND policyname='pol_delete') THEN
    CREATE POLICY pol_delete ON public.purchase_order_lines FOR DELETE TO authenticated
      USING (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pol_order ON public.purchase_order_lines (tenant_id, purchase_order_id);

-- ── 4. Enable realtime for the new tables ─────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_order_lines;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_order_lines;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
