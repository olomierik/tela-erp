
-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  reference_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own tenant audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Inventory reservations table
CREATE TABLE public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant reservations" ON public.inventory_reservations
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own tenant reservations" ON public.inventory_reservations
  FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own tenant reservations" ON public.inventory_reservations
  FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete own tenant reservations" ON public.inventory_reservations
  FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add item_id and quantity columns to sales_orders for inventory linking
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.inventory_items(id);
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_reservations;

-- Trigger: Production completed → inventory + accounting + audit
CREATE OR REPLACE FUNCTION public.trg_production_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _item RECORD;
  _new_avg_cost NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT * INTO _item FROM inventory_items
      WHERE tenant_id = NEW.tenant_id
      AND LOWER(name) LIKE '%' || LOWER(SPLIT_PART(NEW.product_name, ',', 1)) || '%'
      LIMIT 1;

    IF _item.id IS NOT NULL THEN
      _new_avg_cost := ((_item.quantity * _item.unit_cost) + (NEW.quantity * _item.unit_cost))
                       / NULLIF(_item.quantity + NEW.quantity, 0);

      UPDATE inventory_items
        SET quantity = quantity + NEW.quantity,
            unit_cost = COALESCE(_new_avg_cost, _item.unit_cost)
        WHERE id = _item.id;

      INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
      VALUES (NEW.tenant_id, _item.id, 'production_in', NEW.quantity, NEW.order_number,
              'Auto: Production ' || NEW.order_number || ' completed');

      INSERT INTO transactions (tenant_id, type, category, amount, description, reference_number, date, custom_fields)
      VALUES (NEW.tenant_id, 'expense', 'Manufacturing Cost',
              NEW.quantity * _item.unit_cost,
              'Manufacturing cost for ' || NEW.order_number,
              NEW.order_number, CURRENT_DATE,
              '{"journal":"debit_WIP_credit_Manufacturing","auto":true}'::jsonb);

      INSERT INTO audit_log (tenant_id, action, module, reference_id, details)
      VALUES (NEW.tenant_id, 'production_completed', 'production', NEW.order_number,
              jsonb_build_object('quantity', NEW.quantity, 'item_id', _item.id, 'product', NEW.product_name));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS production_completed_trigger ON public.production_orders;
CREATE TRIGGER production_completed_trigger
  AFTER UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_production_completed();

DROP TRIGGER IF EXISTS production_completed_insert_trigger ON public.production_orders;
CREATE TRIGGER production_completed_insert_trigger
  AFTER INSERT ON public.production_orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.trg_production_completed();

-- Trigger: Sales order fulfilled → deduct inventory + COGS + AR/Revenue + audit
CREATE OR REPLACE FUNCTION public.trg_sales_order_fulfilled()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _item RECORD;
  _cogs NUMERIC;
BEGIN
  IF NEW.status IN ('delivered', 'shipped') AND (OLD IS NULL OR OLD.status NOT IN ('delivered', 'shipped')) THEN
    IF NEW.item_id IS NOT NULL THEN
      SELECT * INTO _item FROM inventory_items WHERE id = NEW.item_id AND tenant_id = NEW.tenant_id;

      IF _item.id IS NOT NULL AND _item.quantity >= COALESCE(NEW.quantity, 1) THEN
        UPDATE inventory_items SET quantity = quantity - COALESCE(NEW.quantity, 1) WHERE id = _item.id;

        INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
        VALUES (NEW.tenant_id, _item.id, 'sales_out', -COALESCE(NEW.quantity, 1), NEW.order_number,
                'Auto: Sales ' || NEW.order_number || ' fulfilled');

        _cogs := COALESCE(NEW.quantity, 1) * _item.unit_cost;
        INSERT INTO transactions (tenant_id, type, category, amount, description, reference_number, date, custom_fields)
        VALUES (NEW.tenant_id, 'expense', 'Cost of Goods Sold', _cogs,
                'COGS for ' || NEW.order_number, NEW.order_number, CURRENT_DATE,
                '{"journal":"debit_COGS_credit_Inventory","auto":true}'::jsonb);

        UPDATE inventory_reservations SET status = 'fulfilled'
          WHERE sales_order_id = NEW.id AND item_id = _item.id;
      END IF;
    END IF;

    INSERT INTO transactions (tenant_id, type, category, amount, description, reference_number, date, custom_fields)
    VALUES (NEW.tenant_id, 'income', 'Sales Revenue', NEW.total_amount,
            'Invoice for ' || NEW.order_number || ' — ' || NEW.customer_name,
            NEW.order_number, CURRENT_DATE,
            '{"journal":"debit_AR_credit_Revenue","auto":true}'::jsonb);

    INSERT INTO audit_log (tenant_id, action, module, reference_id, details)
    VALUES (NEW.tenant_id, 'sales_fulfilled', 'sales', NEW.order_number,
            jsonb_build_object('amount', NEW.total_amount, 'customer', NEW.customer_name, 'item_id', NEW.item_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_order_fulfilled_trigger ON public.sales_orders;
CREATE TRIGGER sales_order_fulfilled_trigger
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_order_fulfilled();
