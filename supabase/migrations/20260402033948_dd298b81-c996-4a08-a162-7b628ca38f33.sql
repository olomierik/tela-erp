
-- =============================================================
-- 1. ACCOUNT MAPPINGS TABLE — flexible per-tenant mapping
-- =============================================================
CREATE TABLE IF NOT EXISTS public.account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL,          -- sales, purchase, payment, receipt, inventory, production
  transaction_type TEXT NOT NULL, -- invoice_created, bill_recorded, payment_made, receipt_received, stock_movement, production_completed
  debit_account_id UUID REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module, transaction_type)
);

ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view own mappings"
  ON public.account_mappings FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can manage own mappings"
  ON public.account_mappings FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Add unique constraint to ledger_balances if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounting_ledger_balances_tenant_account_unique'
  ) THEN
    ALTER TABLE public.accounting_ledger_balances
    ADD CONSTRAINT accounting_ledger_balances_tenant_account_unique
    UNIQUE (tenant_id, account_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 2. FUNCTION: auto_create_voucher — reusable voucher creator
-- =============================================================
CREATE OR REPLACE FUNCTION public.auto_create_voucher(
  _tenant_id UUID,
  _voucher_type TEXT,
  _source_module TEXT,
  _source_id TEXT,
  _narration TEXT,
  _voucher_date DATE,
  _entries JSONB  -- array of {account_name, account_type, debit, credit, description}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _voucher_id UUID;
  _voucher_number TEXT;
  _entry JSONB;
  _account_id UUID;
BEGIN
  -- Get voucher number
  SELECT next_voucher_number(_tenant_id, _voucher_type) INTO _voucher_number;

  -- Create voucher header
  INSERT INTO accounting_vouchers (
    tenant_id, voucher_type, voucher_number, narration,
    voucher_date, status, is_auto, source_module, source_id
  ) VALUES (
    _tenant_id, _voucher_type, _voucher_number, _narration,
    _voucher_date, 'posted', true, _source_module, _source_id
  )
  RETURNING id INTO _voucher_id;

  -- Create entries
  FOR _entry IN SELECT * FROM jsonb_array_elements(_entries)
  LOOP
    -- Find or create account
    SELECT id INTO _account_id
    FROM chart_of_accounts
    WHERE tenant_id = _tenant_id
      AND LOWER(name) = LOWER(_entry->>'account_name')
    LIMIT 1;

    IF _account_id IS NULL THEN
      INSERT INTO chart_of_accounts (
        tenant_id, name, account_type, code, is_system
      ) VALUES (
        _tenant_id,
        _entry->>'account_name',
        COALESCE(_entry->>'account_type', 'expense'),
        'AUTO-' || UPPER(SUBSTR(MD5((_entry->>'account_name') || _tenant_id::text), 1, 6)),
        true
      )
      RETURNING id INTO _account_id;
    END IF;

    INSERT INTO accounting_voucher_entries (
      voucher_id, tenant_id, account_id, description, debit, credit
    ) VALUES (
      _voucher_id,
      _tenant_id,
      _account_id,
      COALESCE(_entry->>'description', _narration),
      COALESCE((_entry->>'debit')::numeric, 0),
      COALESCE((_entry->>'credit')::numeric, 0)
    );
  END LOOP;

  RETURN _voucher_id;
END;
$$;

-- =============================================================
-- 3. TRIGGER: Auto-voucher on SALES ORDER fulfilled
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_sales_auto_voucher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _voucher_id UUID;
  _vat_amount NUMERIC;
  _net_amount NUMERIC;
BEGIN
  IF NEW.status IN ('delivered', 'shipped') AND (OLD IS NULL OR OLD.status NOT IN ('delivered', 'shipped')) THEN
    _vat_amount := ROUND(NEW.total_amount * 18 / 118, 2);  -- Extract VAT from inclusive price
    _net_amount := NEW.total_amount - _vat_amount;

    PERFORM auto_create_voucher(
      NEW.tenant_id,
      'sale',
      'sales',
      NEW.id::text,
      'Sales: ' || NEW.order_number || ' — ' || COALESCE(NEW.customer_name, 'Customer'),
      CURRENT_DATE,
      jsonb_build_array(
        jsonb_build_object('account_name', 'Accounts Receivable', 'account_type', 'asset', 'debit', NEW.total_amount, 'credit', 0, 'description', 'Customer: ' || COALESCE(NEW.customer_name, '')),
        jsonb_build_object('account_name', 'Sales Revenue', 'account_type', 'revenue', 'debit', 0, 'credit', _net_amount, 'description', 'Revenue: ' || NEW.order_number),
        jsonb_build_object('account_name', 'VAT Output (18%)', 'account_type', 'liability', 'debit', 0, 'credit', _vat_amount, 'description', 'VAT on sales')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_auto_voucher ON public.sales_orders;
CREATE TRIGGER trg_sales_auto_voucher
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sales_auto_voucher();

-- =============================================================
-- 4. TRIGGER: Auto-voucher on PURCHASE ORDER received
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_purchase_auto_voucher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total NUMERIC;
  _vat_amount NUMERIC;
  _net_amount NUMERIC;
BEGIN
  IF NEW.status = 'received' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'received') THEN
    _total := COALESCE(NEW.total_amount, 0);
    _vat_amount := ROUND(_total * 18 / 118, 2);
    _net_amount := _total - _vat_amount;

    PERFORM auto_create_voucher(
      NEW.tenant_id,
      'purchase',
      'procurement',
      NEW.id::text,
      'Purchase: ' || NEW.po_number || ' — ' || COALESCE(NEW.supplier_name, 'Supplier'),
      CURRENT_DATE,
      jsonb_build_array(
        jsonb_build_object('account_name', 'Inventory / Stock', 'account_type', 'asset', 'debit', _net_amount, 'credit', 0, 'description', 'Stock received: ' || NEW.po_number),
        jsonb_build_object('account_name', 'VAT Input (18%)', 'account_type', 'asset', 'debit', _vat_amount, 'credit', 0, 'description', 'VAT on purchases'),
        jsonb_build_object('account_name', 'Accounts Payable', 'account_type', 'liability', 'debit', 0, 'credit', _total, 'description', 'Payable: ' || COALESCE(NEW.supplier_name, ''))
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_auto_voucher ON public.purchase_orders;
CREATE TRIGGER trg_purchase_auto_voucher
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_auto_voucher();

-- =============================================================
-- 5. TRIGGER: Auto-voucher on PRODUCTION completed
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_production_auto_voucher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM auto_create_voucher(
      NEW.tenant_id,
      'journal',
      'production',
      NEW.id::text,
      'Production: ' || COALESCE(NEW.order_number, NEW.id::text) || ' — ' || COALESCE(NEW.product_name, 'Product'),
      CURRENT_DATE,
      jsonb_build_array(
        jsonb_build_object('account_name', 'Finished Goods', 'account_type', 'asset', 'debit', COALESCE(NEW.total_cost, 0), 'credit', 0, 'description', 'FG: ' || COALESCE(NEW.product_name, '')),
        jsonb_build_object('account_name', 'Work In Progress', 'account_type', 'asset', 'debit', 0, 'credit', COALESCE(NEW.total_cost, 0), 'description', 'WIP transfer')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_production_auto_voucher ON public.production_orders;
CREATE TRIGGER trg_production_auto_voucher
  AFTER UPDATE ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_production_auto_voucher();

-- =============================================================
-- 6. INDEXES for performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_voucher_entries_voucher_id ON accounting_voucher_entries(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_entries_account_id ON accounting_voucher_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant_date ON accounting_vouchers(tenant_id, voucher_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_source ON accounting_vouchers(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_tenant ON account_mappings(tenant_id, module);
CREATE INDEX IF NOT EXISTS idx_ledger_balances_tenant ON accounting_ledger_balances(tenant_id, account_id);
