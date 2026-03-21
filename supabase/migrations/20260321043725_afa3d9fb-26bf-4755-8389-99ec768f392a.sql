
-- 1. inventory_transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'adjustment' CHECK (type IN ('production_in', 'sales_out', 'adjustment', 'procurement_in')),
  quantity INTEGER NOT NULL DEFAULT 0,
  batch TEXT,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant inventory_transactions" ON public.inventory_transactions
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant inventory_transactions" ON public.inventory_transactions
  FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant inventory_transactions" ON public.inventory_transactions
  FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Resellers can view client inventory_transactions" ON public.inventory_transactions
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'reseller'::app_role) AND tenant_id IN (
      SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- 2. exchange_rates table
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 1,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exchange_rates" ON public.exchange_rates
  FOR SELECT TO authenticated USING (true);

-- 3. Add default_currency to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD';

-- 4. Enable realtime for new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;
