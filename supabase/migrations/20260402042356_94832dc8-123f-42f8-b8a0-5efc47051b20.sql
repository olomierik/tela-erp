
-- Fix trg_sales_order_auto_invoice: replace NEW.product_name with item name lookup
CREATE OR REPLACE FUNCTION public.trg_sales_order_auto_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _inv_number TEXT;
  _invoice_id UUID;
  _customer_id UUID;
  _product_name TEXT;
BEGIN
  IF NEW.status IN ('delivered', 'shipped') AND (OLD IS NULL OR OLD.status NOT IN ('delivered', 'shipped')) THEN
    _inv_number := 'INV-' || UPPER(SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8));
    
    _customer_id := NEW.customer_id;
    IF _customer_id IS NULL AND NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
      SELECT id INTO _customer_id FROM customers 
      WHERE tenant_id = NEW.tenant_id AND email = NEW.customer_email LIMIT 1;
    END IF;

    -- Get product name from inventory item if linked
    IF NEW.item_id IS NOT NULL THEN
      SELECT name INTO _product_name FROM inventory_items WHERE id = NEW.item_id LIMIT 1;
    END IF;
    _product_name := COALESCE(_product_name, 'Sales Order ' || NEW.order_number);

    IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = NEW.tenant_id AND notes LIKE '%' || NEW.order_number || '%') THEN
      INSERT INTO invoices (
        tenant_id, invoice_number, customer_name, customer_id,
        issue_date, due_date, status, subtotal, tax_rate, tax_amount, 
        total_amount, notes
      ) VALUES (
        NEW.tenant_id, _inv_number, NEW.customer_name, _customer_id,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'sent',
        NEW.total_amount, 0, 0, NEW.total_amount,
        'Auto-generated from Sales Order ' || NEW.order_number
      )
      RETURNING id INTO _invoice_id;

      IF _invoice_id IS NOT NULL THEN
        INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, line_total)
        VALUES (_invoice_id, 
                _product_name,
                COALESCE(NEW.quantity, 1),
                CASE WHEN COALESCE(NEW.quantity, 1) > 0 THEN NEW.total_amount / COALESCE(NEW.quantity, 1) ELSE NEW.total_amount END,
                NEW.total_amount);
      END IF;

      INSERT INTO audit_log (tenant_id, action, module, reference_id, details)
      VALUES (NEW.tenant_id, 'invoice_auto_generated', 'sales', NEW.order_number,
              jsonb_build_object('invoice_number', _inv_number, 'amount', NEW.total_amount, 'customer', NEW.customer_name));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
