
-- 1. Trigger: When PO status → 'received', auto-update inventory + create AP journal entry
CREATE OR REPLACE FUNCTION public.trg_purchase_order_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _line RECORD;
  _item RECORD;
BEGIN
  IF NEW.status = 'received' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'received') THEN
    -- Process line items from purchase_order_lines table
    FOR _line IN 
      SELECT * FROM purchase_order_lines 
      WHERE purchase_order_id = NEW.id AND item_id IS NOT NULL
    LOOP
      SELECT * INTO _item FROM inventory_items WHERE id = _line.item_id AND tenant_id = NEW.tenant_id;
      IF _item.id IS NOT NULL THEN
        UPDATE inventory_items SET quantity = quantity + _line.quantity WHERE id = _item.id;
        
        INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference_id, notes)
        VALUES (NEW.tenant_id, _item.id, 'procurement_in', _line.quantity, NEW.po_number,
                'Auto: PO ' || NEW.po_number || ' received — +' || _line.quantity || ' ' || _item.name);
      END IF;
    END LOOP;

    -- AP journal entry
    INSERT INTO transactions (tenant_id, type, category, amount, description, reference_number, date, custom_fields)
    VALUES (NEW.tenant_id, 'expense', 'Accounts Payable', NEW.total_amount,
            'PO ' || NEW.po_number || ' received from ' || NEW.supplier_name,
            NEW.po_number, CURRENT_DATE,
            '{"journal":"debit_InventoryAsset_credit_AP","auto":true}'::jsonb);

    INSERT INTO audit_log (tenant_id, action, module, reference_id, details)
    VALUES (NEW.tenant_id, 'po_received', 'procurement', NEW.po_number,
            jsonb_build_object('amount', NEW.total_amount, 'supplier', NEW.supplier_name));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_order_received ON purchase_orders;
CREATE TRIGGER trg_purchase_order_received
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_purchase_order_received();

-- 2. Trigger: When sales order is delivered/shipped, auto-generate invoice
CREATE OR REPLACE FUNCTION public.trg_sales_order_auto_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _inv_number TEXT;
  _invoice_id UUID;
  _customer_id UUID;
BEGIN
  IF NEW.status IN ('delivered', 'shipped') AND (OLD IS NULL OR OLD.status NOT IN ('delivered', 'shipped')) THEN
    _inv_number := 'INV-' || UPPER(SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8));
    
    -- Find customer_id
    _customer_id := NEW.customer_id;
    IF _customer_id IS NULL AND NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
      SELECT id INTO _customer_id FROM customers 
      WHERE tenant_id = NEW.tenant_id AND email = NEW.customer_email LIMIT 1;
    END IF;

    -- Check if invoice already exists for this order
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

      -- Create invoice line
      IF _invoice_id IS NOT NULL THEN
        INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, line_total)
        VALUES (_invoice_id, 
                COALESCE(NEW.product_name, 'Sales Order ' || NEW.order_number),
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
$$;

DROP TRIGGER IF EXISTS trg_sales_order_auto_invoice ON sales_orders;
CREATE TRIGGER trg_sales_order_auto_invoice
  AFTER UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_sales_order_auto_invoice();

-- 3. Trigger: Payroll run → auto accounting entries
-- Create payroll_runs table to track payroll processing
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  run_month INT NOT NULL,
  run_year INT NOT NULL,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  total_paye NUMERIC NOT NULL DEFAULT 0,
  total_nssf NUMERIC NOT NULL DEFAULT 0,
  total_sdl NUMERIC NOT NULL DEFAULT 0,
  total_wcf NUMERIC NOT NULL DEFAULT 0,
  employee_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  store_id UUID REFERENCES stores(id)
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for payroll_runs" ON payroll_runs
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Enable realtime for invoices table
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_runs;
