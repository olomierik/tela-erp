-- 1. Add tier column
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard';

-- 2. Drop existing triggers if any
DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
DROP TRIGGER IF EXISTS trg_sales_order_fulfilled ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_sales_order_auto_invoice ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_purchase_order_received ON public.purchase_orders;
DROP TRIGGER IF EXISTS trg_storefront_order_to_sales ON public.storefront_orders;

-- 3. Create all triggers
CREATE TRIGGER trg_production_completed
  AFTER UPDATE ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_production_completed();

CREATE TRIGGER trg_sales_order_fulfilled
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sales_order_fulfilled();

CREATE TRIGGER trg_sales_order_auto_invoice
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sales_order_auto_invoice();

CREATE TRIGGER trg_purchase_order_received
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_order_received();

CREATE TRIGGER trg_storefront_order_to_sales
  AFTER INSERT ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_storefront_order_to_sales();