
-- 1. Add plan_id reference to subscriptions if missing
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- 2. Replace mirror trigger function to also write an invoice_lines row pointing to the service
CREATE OR REPLACE FUNCTION public.trg_subinv_to_invoices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _customer_id   UUID;
  _customer_name TEXT;
  _existing_id   UUID;
  _mapped_status TEXT;
  _plan_id       UUID;
  _plan_name     TEXT;
BEGIN
  SELECT s.customer_name, s.plan_id, s.plan_name
    INTO _customer_name, _plan_id, _plan_name
    FROM public.subscriptions s WHERE s.id = NEW.subscription_id;

  -- Resolve service item by id, then by name in inventory if id is null
  IF _plan_id IS NULL AND _plan_name IS NOT NULL THEN
    SELECT id INTO _plan_id
      FROM public.inventory_items
     WHERE tenant_id = NEW.tenant_id
       AND lower(name) = lower(_plan_name)
     LIMIT 1;
  END IF;

  SELECT c.id INTO _customer_id
    FROM public.customers c
    JOIN public.subscriptions s ON s.id = NEW.subscription_id
   WHERE c.tenant_id = NEW.tenant_id
     AND (
          (s.customer_email IS NOT NULL AND s.customer_email <> '' AND lower(c.email) = lower(s.customer_email))
       OR (lower(c.name) = lower(s.customer_name))
     )
   LIMIT 1;

  _mapped_status := CASE NEW.status
                      WHEN 'paid'      THEN 'paid'
                      WHEN 'overdue'   THEN 'overdue'
                      WHEN 'cancelled' THEN 'cancelled'
                      ELSE 'sent'
                    END;

  SELECT id INTO _existing_id
    FROM public.invoices
   WHERE tenant_id = NEW.tenant_id AND invoice_number = NEW.invoice_number
   LIMIT 1;

  IF _existing_id IS NULL THEN
    INSERT INTO public.invoices(
      tenant_id, invoice_number, customer_id, customer_name,
      issue_date, due_date, status,
      subtotal, tax_rate, tax_amount, total_amount,
      notes
    ) VALUES (
      NEW.tenant_id, NEW.invoice_number, _customer_id, COALESCE(_customer_name, 'Subscriber'),
      NEW.period_start, NEW.due_date, _mapped_status,
      NEW.amount, 0, 0, NEW.amount,
      'Subscription billing — period ' || NEW.period
    )
    RETURNING id INTO _existing_id;
  ELSE
    UPDATE public.invoices
       SET status      = _mapped_status,
           due_date    = NEW.due_date,
           total_amount = NEW.amount,
           subtotal    = NEW.amount,
           updated_at  = now()
     WHERE id = _existing_id;
  END IF;

  -- Add (or update) the line item pointing to the service catalog entry
  IF NOT EXISTS (SELECT 1 FROM public.invoice_lines WHERE invoice_id = _existing_id) THEN
    INSERT INTO public.invoice_lines(
      invoice_id, item_id, description, quantity, unit_price, line_total
    ) VALUES (
      _existing_id,
      _plan_id,
      COALESCE(_plan_name, 'Subscription service') || ' — ' || NEW.period,
      1,
      NEW.amount,
      NEW.amount
    );
  ELSE
    UPDATE public.invoice_lines
       SET item_id     = COALESCE(_plan_id, item_id),
           description = COALESCE(_plan_name, 'Subscription service') || ' — ' || NEW.period,
           unit_price  = NEW.amount,
           line_total  = NEW.amount
     WHERE invoice_id  = _existing_id;
  END IF;

  RETURN NEW;
END $function$;

-- 3. Backfill: ensure every subscription-mirrored invoice has at least one line
INSERT INTO public.invoice_lines(invoice_id, item_id, description, quantity, unit_price, line_total)
SELECT i.id,
       s.plan_id,
       COALESCE(s.plan_name, 'Subscription service') || ' — ' || si.period,
       1,
       si.amount,
       si.amount
  FROM public.subscription_invoices si
  JOIN public.invoices i ON i.tenant_id = si.tenant_id AND i.invoice_number = si.invoice_number
  JOIN public.subscriptions s ON s.id = si.subscription_id
 WHERE NOT EXISTS (SELECT 1 FROM public.invoice_lines il WHERE il.invoice_id = i.id);
