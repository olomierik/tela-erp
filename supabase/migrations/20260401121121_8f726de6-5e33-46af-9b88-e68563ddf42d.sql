
CREATE OR REPLACE FUNCTION public.trg_production_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item_id UUID;
  _normalized_product_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    _normalized_product_name := NULLIF(BTRIM(REGEXP_REPLACE(COALESCE(NEW.product_name, ''), '\s+', ' ', 'g')), '');

    IF NEW.item_id IS NOT NULL THEN
      SELECT id INTO _item_id
      FROM public.inventory_items
      WHERE id = NEW.item_id AND tenant_id = NEW.tenant_id;
    END IF;

    IF _item_id IS NULL AND _normalized_product_name IS NOT NULL THEN
      SELECT id INTO _item_id
      FROM public.inventory_items
      WHERE tenant_id = NEW.tenant_id
        AND LOWER(BTRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))) = LOWER(_normalized_product_name)
      LIMIT 1;
    END IF;

    IF _item_id IS NULL AND _normalized_product_name IS NOT NULL THEN
      INSERT INTO public.inventory_items (
        tenant_id, name, sku, category, quantity, unit_cost, reorder_level, status
      ) VALUES (
        NEW.tenant_id,
        _normalized_product_name,
        'PROD-' || UPPER(SUBSTR(MD5(NEW.id::text), 1, 8)),
        'Finished Goods',
        0, 0, 0, 'good'
      )
      RETURNING id INTO _item_id;
    END IF;

    IF _item_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity = quantity + COALESCE(NEW.quantity, 0)
      WHERE id = _item_id;

      INSERT INTO public.inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
      VALUES (
        NEW.tenant_id,
        _item_id,
        'production_in',
        COALESCE(NEW.quantity, 0),
        NEW.id::text,
        'Auto: Production ' || COALESCE(NEW.order_number, NEW.id::text) || ' completed'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
