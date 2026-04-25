
-- Mirror subscription_invoices into the main invoices table so they show up in
-- unified financial reports (AR aging, revenue, dashboards). Keeps the two in
-- sync via INSERT/UPDATE triggers, idempotent on invoice_number.

CREATE OR REPLACE FUNCTION public.trg_subinv_to_invoices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_id UUID;
  _customer_name TEXT;
  _existing_id UUID;
  _mapped_status TEXT;
BEGIN
  -- Resolve customer (try email match first, then by name on the parent subscription)
  SELECT s.customer_name INTO _customer_name
    FROM public.subscriptions s WHERE s.id = NEW.subscription_id;

  SELECT c.id INTO _customer_id
    FROM public.customers c
    JOIN public.subscriptions s ON s.id = NEW.subscription_id
   WHERE c.tenant_id = NEW.tenant_id
     AND (
          (s.customer_email IS NOT NULL AND s.customer_email <> '' AND lower(c.email) = lower(s.customer_email))
       OR (lower(c.name) = lower(s.customer_name))
     )
   LIMIT 1;

  -- Map subscription invoice statuses to the invoices table vocabulary
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
    );
  ELSE
    UPDATE public.invoices
       SET status      = _mapped_status,
           due_date    = NEW.due_date,
           total_amount = NEW.amount,
           subtotal    = NEW.amount,
           updated_at  = now()
     WHERE id = _existing_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS subinv_mirror_to_invoices ON public.subscription_invoices;
CREATE TRIGGER subinv_mirror_to_invoices
AFTER INSERT OR UPDATE ON public.subscription_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_subinv_to_invoices();

-- Backfill existing subscription_invoices into invoices (idempotent on invoice_number)
INSERT INTO public.invoices(tenant_id, invoice_number, customer_name,
                            issue_date, due_date, status,
                            subtotal, tax_rate, tax_amount, total_amount, notes)
SELECT si.tenant_id, si.invoice_number,
       COALESCE(s.customer_name, 'Subscriber'),
       si.period_start, si.due_date,
       CASE si.status WHEN 'paid' THEN 'paid'
                      WHEN 'overdue' THEN 'overdue'
                      WHEN 'cancelled' THEN 'cancelled'
                      ELSE 'sent' END,
       si.amount, 0, 0, si.amount,
       'Subscription billing — period ' || si.period
  FROM public.subscription_invoices si
  JOIN public.subscriptions s ON s.id = si.subscription_id
  LEFT JOIN public.invoices i
    ON i.tenant_id = si.tenant_id AND i.invoice_number = si.invoice_number
 WHERE i.id IS NULL;
