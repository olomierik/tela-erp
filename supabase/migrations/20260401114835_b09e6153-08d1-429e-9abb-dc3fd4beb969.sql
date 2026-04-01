CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NULL REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase order lines in their tenant" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can create purchase order lines in their tenant" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can update purchase order lines in their tenant" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can delete purchase order lines in their tenant" ON public.purchase_order_lines;

CREATE POLICY "Users can view purchase order lines in their tenant"
ON public.purchase_order_lines
FOR SELECT
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create purchase order lines in their tenant"
ON public.purchase_order_lines
FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update purchase order lines in their tenant"
ON public.purchase_order_lines
FOR UPDATE
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete purchase order lines in their tenant"
ON public.purchase_order_lines
FOR DELETE
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_purchase_order_id ON public.purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_tenant_id ON public.purchase_order_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_item_id ON public.purchase_order_lines(item_id);

DROP TRIGGER IF EXISTS update_purchase_order_lines_updated_at ON public.purchase_order_lines;
CREATE TRIGGER update_purchase_order_lines_updated_at
BEFORE UPDATE ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.trg_purchase_order_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _line RECORD;
  _item RECORD;
  _json_line JSONB;
  _added_qty NUMERIC;
  _processed_count INTEGER := 0;
BEGIN
  IF NEW.status = 'received' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'received') THEN
    FOR _line IN
      SELECT * FROM public.purchase_order_lines
      WHERE purchase_order_id = NEW.id
    LOOP
      IF _line.item_id IS NOT NULL THEN
        SELECT * INTO _item
        FROM public.inventory_items
        WHERE id = _line.item_id AND tenant_id = NEW.tenant_id;

        IF _item.id IS NOT NULL THEN
          _added_qty := GREATEST(COALESCE(_line.quantity, 0) - COALESCE(_line.received_quantity, 0), 0);

          IF _added_qty > 0 THEN
            UPDATE public.inventory_items
            SET quantity = quantity + _added_qty
            WHERE id = _item.id;

            INSERT INTO public.inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
            VALUES (
              NEW.tenant_id,
              _item.id,
              'procurement_in',
              _added_qty,
              NEW.id::text,
              'Auto: PO ' || NEW.po_number || ' received'
            );

            UPDATE public.purchase_order_lines
            SET received_quantity = COALESCE(quantity, 0)
            WHERE id = _line.id;
          END IF;

          _processed_count := _processed_count + 1;
        END IF;
      END IF;
    END LOOP;

    IF _processed_count = 0 THEN
      FOR _json_line IN
        SELECT * FROM jsonb_array_elements(COALESCE(NEW.custom_fields->'line_items', '[]'::jsonb))
      LOOP
        IF COALESCE(_json_line->>'item_id', '') <> '' THEN
          SELECT * INTO _item
          FROM public.inventory_items
          WHERE id = (_json_line->>'item_id')::uuid
            AND tenant_id = NEW.tenant_id;

          IF _item.id IS NOT NULL THEN
            _added_qty := COALESCE((_json_line->>'quantity')::numeric, 0);

            IF _added_qty > 0 THEN
              UPDATE public.inventory_items
              SET quantity = quantity + _added_qty
              WHERE id = _item.id;

              INSERT INTO public.inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
              VALUES (
                NEW.tenant_id,
                _item.id,
                'procurement_in',
                _added_qty,
                NEW.id::text,
                'Auto: PO ' || NEW.po_number || ' received from embedded line items'
              );
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_production_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item RECORD;
  _normalized_product_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    _normalized_product_name := NULLIF(BTRIM(REGEXP_REPLACE(COALESCE(NEW.product_name, ''), '\s+', ' ', 'g')), '');

    IF NEW.item_id IS NOT NULL THEN
      SELECT * INTO _item
      FROM public.inventory_items
      WHERE id = NEW.item_id AND tenant_id = NEW.tenant_id;
    END IF;

    IF _item.id IS NULL AND _normalized_product_name IS NOT NULL THEN
      SELECT * INTO _item
      FROM public.inventory_items
      WHERE tenant_id = NEW.tenant_id
        AND LOWER(BTRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))) = LOWER(_normalized_product_name)
      LIMIT 1;
    END IF;

    IF _item.id IS NULL AND _normalized_product_name IS NOT NULL THEN
      INSERT INTO public.inventory_items (
        tenant_id, name, sku, category, quantity, unit_cost, reorder_level, status
      ) VALUES (
        NEW.tenant_id,
        _normalized_product_name,
        'PROD-' || UPPER(SUBSTR(MD5(NEW.id::text), 1, 8)),
        'Finished Goods',
        0,
        0,
        0,
        'good'
      )
      RETURNING * INTO _item;
    END IF;

    IF _item.id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity = quantity + COALESCE(NEW.quantity, 0)
      WHERE id = _item.id;

      INSERT INTO public.inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
      VALUES (
        NEW.tenant_id,
        _item.id,
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

DROP TRIGGER IF EXISTS production_completed_trigger ON public.production_orders;
DROP TRIGGER IF EXISTS sales_order_fulfilled_trigger ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
DROP TRIGGER IF EXISTS trg_purchase_order_received ON public.purchase_orders;

CREATE TRIGGER trg_production_completed
AFTER UPDATE ON public.production_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_production_completed();

CREATE TRIGGER trg_purchase_order_received
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_purchase_order_received();