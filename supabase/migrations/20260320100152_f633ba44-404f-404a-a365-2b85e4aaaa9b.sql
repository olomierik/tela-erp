
-- Production Orders
CREATE TABLE public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  warehouse_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales Orders
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL DEFAULT '',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'social', 'ppc', 'content')),
  budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions (Accounting)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Orders (Procurement)
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'received', 'cancelled')),
  order_date DATE,
  expected_delivery DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at triggers
CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all 6 tables (same pattern: tenant-scoped)
-- Production Orders
CREATE POLICY "Users can view own tenant production orders" ON public.production_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant production orders" ON public.production_orders FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant production orders" ON public.production_orders FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant production orders" ON public.production_orders FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Inventory Items
CREATE POLICY "Users can view own tenant inventory" ON public.inventory_items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant inventory" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant inventory" ON public.inventory_items FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant inventory" ON public.inventory_items FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Sales Orders
CREATE POLICY "Users can view own tenant sales orders" ON public.sales_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant sales orders" ON public.sales_orders FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant sales orders" ON public.sales_orders FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant sales orders" ON public.sales_orders FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Campaigns
CREATE POLICY "Users can view own tenant campaigns" ON public.campaigns FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant campaigns" ON public.campaigns FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Transactions
CREATE POLICY "Users can view own tenant transactions" ON public.transactions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant transactions" ON public.transactions FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant transactions" ON public.transactions FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Purchase Orders
CREATE POLICY "Users can view own tenant purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant purchase orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant purchase orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant purchase orders" ON public.purchase_orders FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Reseller policies (resellers can view client tenant data)
CREATE POLICY "Resellers can view client production orders" ON public.production_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller') AND tenant_id IN (SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Resellers can view client inventory" ON public.inventory_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller') AND tenant_id IN (SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Resellers can view client sales orders" ON public.sales_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller') AND tenant_id IN (SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Resellers can view client campaigns" ON public.campaigns FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller') AND tenant_id IN (SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Resellers can view client transactions" ON public.transactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller') AND tenant_id IN (SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Resellers can view client purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller') AND tenant_id IN (SELECT id FROM tenants WHERE parent_tenant_id = get_user_tenant_id(auth.uid())));
