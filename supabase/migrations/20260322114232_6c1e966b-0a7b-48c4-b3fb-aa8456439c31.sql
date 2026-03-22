
-- Remove duplicate sales triggers (keep only one AFTER UPDATE)
DROP TRIGGER IF EXISTS trg_sales_fulfilled ON public.sales_orders;

-- Remove duplicate production triggers (keep only one AFTER UPDATE)
DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
DROP TRIGGER IF EXISTS production_completed_insert_trigger ON public.production_orders;
