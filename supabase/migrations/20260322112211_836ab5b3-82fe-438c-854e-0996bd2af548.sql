
-- CUSTOMERS table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  credit_limit NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant customers" ON public.customers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant customers" ON public.customers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant customers" ON public.customers FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- SUPPLIERS table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  payment_terms TEXT DEFAULT 'net_30',
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant suppliers" ON public.suppliers FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add customer_id to sales_orders
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- Add supplier_id to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- STOCK TRANSFERS table
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transfer_number TEXT NOT NULL,
  source_store_id UUID NOT NULL REFERENCES public.stores(id),
  destination_store_id UUID NOT NULL REFERENCES public.stores(id),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  initiated_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant transfers" ON public.stock_transfers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant transfers" ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant transfers" ON public.stock_transfers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant transfers" ON public.stock_transfers FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- BOM TEMPLATES
CREATE TABLE public.bom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  finished_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  name TEXT NOT NULL,
  output_quantity INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant boms" ON public.bom_templates FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant boms" ON public.bom_templates FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant boms" ON public.bom_templates FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant boms" ON public.bom_templates FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- BOM LINES (raw materials per BOM)
CREATE TABLE public.bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES public.bom_templates(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  wastage_percent NUMERIC DEFAULT 0,
  notes TEXT DEFAULT ''
);

ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bom_lines" ON public.bom_lines FOR SELECT TO authenticated
  USING (bom_id IN (SELECT id FROM public.bom_templates WHERE tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Users can insert bom_lines" ON public.bom_lines FOR INSERT TO authenticated
  WITH CHECK (bom_id IN (SELECT id FROM public.bom_templates WHERE tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Users can update bom_lines" ON public.bom_lines FOR UPDATE TO authenticated
  USING (bom_id IN (SELECT id FROM public.bom_templates WHERE tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Users can delete bom_lines" ON public.bom_lines FOR DELETE TO authenticated
  USING (bom_id IN (SELECT id FROM public.bom_templates WHERE tenant_id = get_user_tenant_id(auth.uid())));

-- CHART OF ACCOUNTS
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'expense',
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_system BOOLEAN DEFAULT false,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant coa" ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant coa" ON public.chart_of_accounts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant coa" ON public.chart_of_accounts FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete non-system coa" ON public.chart_of_accounts FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND is_system = false);

-- JOURNAL ENTRIES (double-entry)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  reference_type TEXT DEFAULT '',
  reference_id TEXT DEFAULT '',
  debit_account_id UUID REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  is_auto BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant journal" ON public.journal_entries FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant journal" ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- PAYMENTS table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  customer_id UUID REFERENCES public.customers(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount NUMERIC NOT NULL DEFAULT 0,
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tenant payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete own tenant payments" ON public.payments FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entries;
