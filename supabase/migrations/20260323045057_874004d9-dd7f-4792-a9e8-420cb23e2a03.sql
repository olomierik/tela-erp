
-- Trigger function: when a storefront_order is inserted, create sales_orders for each item
CREATE OR REPLACE FUNCTION public.trg_storefront_order_to_sales()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item JSONB;
  _order_number TEXT;
  _sales_order_id UUID;
  _qty INT;
  _price NUMERIC;
  _item_id UUID;
BEGIN
  -- Loop through each item in the storefront order
  FOR _item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    _order_number := 'SF-' || LEFT(NEW.id::TEXT, 8) || '-' || LEFT((_item->>'id')::TEXT, 4);
    _qty := COALESCE((_item->>'quantity')::INT, 1);
    _price := COALESCE((_item->>'price')::NUMERIC, 0);
    _item_id := (_item->>'id')::UUID;

    INSERT INTO sales_orders (
      tenant_id, order_number, customer_name, customer_email,
      item_id, quantity, total_amount, status, store_id
    ) VALUES (
      NEW.tenant_id, _order_number, NEW.customer_name, COALESCE(NEW.customer_email, ''),
      _item_id, _qty, _price * _qty, 'confirmed', NULL
    )
    RETURNING id INTO _sales_order_id;
  END LOOP;

  -- Link the first sales order back (for reference)
  IF _sales_order_id IS NOT NULL THEN
    UPDATE storefront_orders SET sales_order_id = _sales_order_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_storefront_order_created ON storefront_orders;
CREATE TRIGGER on_storefront_order_created
  AFTER INSERT ON storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_storefront_order_to_sales();
