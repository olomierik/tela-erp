DROP TRIGGER IF EXISTS production_completed_trigger ON public.production_orders;
DROP TRIGGER IF EXISTS sales_order_fulfilled_trigger ON public.sales_orders;

DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
CREATE TRIGGER trg_production_completed
AFTER UPDATE ON public.production_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_production_completed();

DROP TRIGGER IF EXISTS trg_purchase_order_received ON public.purchase_orders;
CREATE TRIGGER trg_purchase_order_received
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_purchase_order_received();