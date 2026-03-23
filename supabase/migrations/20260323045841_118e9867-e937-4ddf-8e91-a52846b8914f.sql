
-- 1. Add image_url and description columns to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 2. Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images bucket
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

-- 3. Update storefront trigger to also create customer records
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
  _customer_id UUID;
BEGIN
  -- Auto-create or find customer from checkout details
  IF NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
    SELECT id INTO _customer_id FROM customers
      WHERE tenant_id = NEW.tenant_id AND email = NEW.customer_email LIMIT 1;
  END IF;

  IF _customer_id IS NULL THEN
    INSERT INTO customers (tenant_id, name, email, phone, address)
    VALUES (
      NEW.tenant_id,
      NEW.customer_name,
      COALESCE(NEW.customer_email, ''),
      COALESCE(NEW.customer_phone, ''),
      COALESCE(NEW.shipping_address, '')
    )
    RETURNING id INTO _customer_id;
  ELSE
    -- Update existing customer with latest details
    UPDATE customers SET
      phone = COALESCE(NULLIF(NEW.customer_phone, ''), phone),
      address = COALESCE(NULLIF(NEW.shipping_address, ''), address)
    WHERE id = _customer_id;
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    _order_number := 'SF-' || LEFT(NEW.id::TEXT, 8) || '-' || LEFT((_item->>'id')::TEXT, 4);
    _qty := COALESCE((_item->>'quantity')::INT, 1);
    _price := COALESCE((_item->>'price')::NUMERIC, 0);
    _item_id := (_item->>'id')::UUID;

    INSERT INTO sales_orders (
      tenant_id, order_number, customer_name, customer_email,
      item_id, quantity, total_amount, status, store_id, customer_id
    ) VALUES (
      NEW.tenant_id, _order_number, NEW.customer_name, COALESCE(NEW.customer_email, ''),
      _item_id, _qty, _price * _qty, 'pending', NULL, _customer_id
    )
    RETURNING id INTO _sales_order_id;

    UPDATE sales_orders SET status = 'delivered' WHERE id = _sales_order_id;
  END LOOP;

  IF _sales_order_id IS NOT NULL THEN
    UPDATE storefront_orders SET sales_order_id = _sales_order_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
