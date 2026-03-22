
-- Add item_id to production_orders for direct inventory linking
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.inventory_items(id);

-- Drop and recreate the production trigger to use item_id directly
CREATE OR REPLACE FUNCTION public.trg_production_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _item RECORD;
  _new_avg_cost NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    -- Use item_id if set, otherwise fallback to name matching
    IF NEW.item_id IS NOT NULL THEN
      SELECT * INTO _item FROM inventory_items WHERE id = NEW.item_id AND tenant_id = NEW.tenant_id;
    ELSE
      SELECT * INTO _item FROM inventory_items
        WHERE tenant_id = NEW.tenant_id
        AND LOWER(name) = LOWER(TRIM(SPLIT_PART(NEW.product_name, ',', 1)))
        LIMIT 1;
    END IF;

    IF _item.id IS NOT NULL THEN
      _new_avg_cost := ((_item.quantity * _item.unit_cost) + (NEW.quantity * _item.unit_cost))
                       / NULLIF(_item.quantity + NEW.quantity, 0);

      UPDATE inventory_items
        SET quantity = quantity + NEW.quantity,
            unit_cost = COALESCE(_new_avg_cost, _item.unit_cost)
        WHERE id = _item.id;

      INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
      VALUES (NEW.tenant_id, _item.id, 'production_in', NEW.quantity, NEW.order_number,
              'Auto: Production ' || NEW.order_number || ' completed — +' || NEW.quantity || ' units');

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
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_production_completed ON production_orders;
CREATE TRIGGER trg_production_completed
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_production_completed();
