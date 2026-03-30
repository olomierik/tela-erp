-- ═══════════════════════════════════════════════════════════════════════════════
-- Module Integration Migration
-- Extends inventory_transactions type enum, adds audit_log INSERT policy,
-- adds custom_fields columns for line item storage, and adds transfer-related
-- inventory transaction types.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Extend inventory_transactions.type CHECK constraint to include transfer
--    and production_out types needed for full cross-module integration.
ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_type_check
  CHECK (type IN (
    'production_in',
    'production_out',
    'sales_out',
    'adjustment',
    'procurement_in',
    'transfer_in',
    'transfer_out'
  ));

-- 2. Allow authenticated users to insert into audit_log (used by cross-module
--    automation hooks to record every transaction event).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log' AND policyname = 'Users can insert audit_log'
  ) THEN
    CREATE POLICY "Users can insert audit_log" ON public.audit_log
      FOR INSERT TO authenticated
      WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
END $$;

-- 3. Ensure custom_fields JSONB column exists on purchase_orders so that
--    line item details can be stored alongside the PO header.
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- 4. Ensure custom_fields JSONB column exists on sales_orders so that
--    individual line items can be persisted for downstream COGS calculation.
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- 5. Ensure inventory_transactions has an UPDATE policy so the cross-module
--    hook can mark transactions (not currently used but future-proof).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_transactions' AND policyname = 'Users can update own tenant inventory_transactions'
  ) THEN
    CREATE POLICY "Users can update own tenant inventory_transactions"
      ON public.inventory_transactions
      FOR UPDATE TO authenticated
      USING (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
END $$;

-- 6. Add index on inventory_items (tenant_id, sku) for fast SKU lookups during
--    stock transfers (finding the same product at a different store).
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_sku
  ON public.inventory_items (tenant_id, sku);

-- 7. Add index on inventory_items (tenant_id, store_id) for store-scoped queries.
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_store
  ON public.inventory_items (tenant_id, store_id);

-- 8. Add index on audit_log (tenant_id, module) for fast audit trail queries.
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_module
  ON public.audit_log (tenant_id, module);

-- 9. Add index on inventory_transactions (tenant_id, item_id) for item history.
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item
  ON public.inventory_transactions (tenant_id, item_id);
