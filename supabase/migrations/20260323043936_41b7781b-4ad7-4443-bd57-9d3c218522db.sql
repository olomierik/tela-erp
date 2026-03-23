
-- Online stores table for the storefront builder
CREATE TABLE public.online_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  is_published BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.online_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant online stores"
  ON public.online_stores FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can insert online stores"
  ON public.online_stores FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND is_store_admin(auth.uid()));

CREATE POLICY "Admins can update online stores"
  ON public.online_stores FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND is_store_admin(auth.uid()));

CREATE POLICY "Admins can delete online stores"
  ON public.online_stores FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND is_store_admin(auth.uid()));

-- Public read policy for storefront visitors (no auth required)
CREATE POLICY "Anyone can view published stores"
  ON public.online_stores FOR SELECT TO anon
  USING (is_published = true);

-- API keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND is_store_admin(auth.uid()));

-- Storefront orders table (for guest checkout, links back to sales_orders)
CREATE TABLE public.storefront_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  online_store_id UUID NOT NULL REFERENCES public.online_stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES public.sales_orders(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cod',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view storefront orders"
  ON public.storefront_orders FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Allow anonymous inserts for guest checkout
CREATE POLICY "Anyone can place storefront orders"
  ON public.storefront_orders FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to read published store products
CREATE POLICY "Anon can read published store inventory"
  ON public.inventory_items FOR SELECT TO anon
  USING (
    store_id IN (
      SELECT os.store_id FROM public.online_stores os WHERE os.is_published = true
    )
    OR tenant_id IN (
      SELECT os.tenant_id FROM public.online_stores os WHERE os.is_published = true AND os.store_id IS NULL
    )
  );
