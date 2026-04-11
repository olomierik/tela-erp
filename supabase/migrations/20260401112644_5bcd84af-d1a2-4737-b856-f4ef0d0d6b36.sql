
-- Drop and recreate triggers that may already exist
DROP TRIGGER IF EXISTS trg_sales_order_auto_invoice ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_purchase_order_received ON public.purchase_orders;
DROP TRIGGER IF EXISTS trg_storefront_order_to_sales ON public.storefront_orders;

CREATE TRIGGER trg_sales_order_auto_invoice
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  WHEN (NEW.status IN ('delivered', 'shipped') AND OLD.status NOT IN ('delivered', 'shipped'))
  EXECUTE FUNCTION public.trg_sales_order_auto_invoice();

CREATE TRIGGER trg_purchase_order_received
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'received' AND OLD.status IS DISTINCT FROM 'received')
  EXECUTE FUNCTION public.trg_purchase_order_received();

CREATE TRIGGER trg_storefront_order_to_sales
  AFTER INSERT ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_storefront_order_to_sales();
