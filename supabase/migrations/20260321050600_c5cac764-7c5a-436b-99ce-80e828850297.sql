
-- 1. Categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant categories" ON public.categories FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant categories" ON public.categories FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant categories" ON public.categories FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2. Add category_id to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- 3. Create inventory status enum and add to inventory_items
DO $$ BEGIN
  CREATE TYPE public.inventory_status AS ENUM ('good', 'damaged', 'expired', 'not_sellable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS status public.inventory_status NOT NULL DEFAULT 'good';

-- 4. Inventory adjustments table
CREATE TABLE public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  type text NOT NULL DEFAULT 'deduction',
  reason text NOT NULL DEFAULT 'other',
  notes text DEFAULT '',
  adjusted_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant adjustments" ON public.inventory_adjustments FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant adjustments" ON public.inventory_adjustments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- 5. Audit log for adjustments
INSERT INTO public.audit_log SELECT WHERE FALSE; -- no-op, just ensuring table exists

-- 6. Update sales trigger to only sell 'good' status inventory
CREATE OR REPLACE FUNCTION public.trg_sales_order_fulfilled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _item RECORD;
  _cogs NUMERIC;
BEGIN
  IF NEW.status IN ('delivered', 'shipped') AND (OLD IS NULL OR OLD.status NOT IN ('delivered', 'shipped')) THEN
    IF NEW.item_id IS NOT NULL THEN
      SELECT * INTO _item FROM inventory_items WHERE id = NEW.item_id AND tenant_id = NEW.tenant_id;

      -- Only sell from 'good' status inventory
      IF _item.id IS NOT NULL AND _item.status = 'good' AND _item.quantity >= COALESCE(NEW.quantity, 1) THEN
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
      ELSIF _item.id IS NOT NULL AND (_item.status != 'good' OR _item.quantity < COALESCE(NEW.quantity, 1)) THEN
        RAISE EXCEPTION 'Cannot fulfill: item "%" has status "%" with % units (need %)',
          _item.name, _item.status, _item.quantity, COALESCE(NEW.quantity, 1);
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
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_sales_fulfilled ON public.sales_orders;
CREATE TRIGGER trg_sales_fulfilled BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_order_fulfilled();

-- Ensure production trigger exists
DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
CREATE TRIGGER trg_production_completed BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_production_completed();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_adjustments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
