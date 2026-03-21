
-- 1. Create stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 2. Create store role enum
CREATE TYPE public.store_role AS ENUM ('store_admin', 'user', 'viewer');

-- 3. Create user_store_assignments table
CREATE TABLE public.user_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role store_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE public.user_store_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Add store_id to core tables (nullable so existing data isn't broken)
ALTER TABLE public.inventory_items ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.sales_orders ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.production_orders ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.purchase_orders ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.transactions ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.campaigns ADD COLUMN store_id UUID REFERENCES public.stores(id);

-- 5. Helper function: get stores accessible by a user
CREATE OR REPLACE FUNCTION public.get_user_store_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.user_store_assignments WHERE user_id = _user_id
$$;

-- 6. Helper function: check if user is store admin (or tenant admin/reseller)
CREATE OR REPLACE FUNCTION public.is_store_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_store_assignments WHERE user_id = _user_id AND role = 'store_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'reseller')
  )
$$;

-- 7. RLS policies for stores table
CREATE POLICY "Users can view stores they are assigned to"
  ON public.stores FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      is_store_admin(auth.uid())
      OR id IN (SELECT get_user_store_ids(auth.uid()))
    )
  );

CREATE POLICY "Admins can insert stores"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_store_admin(auth.uid())
  );

CREATE POLICY "Admins can update stores"
  ON public.stores FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_store_admin(auth.uid())
  );

CREATE POLICY "Admins can delete stores"
  ON public.stores FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_store_admin(auth.uid())
  );

-- 8. RLS policies for user_store_assignments
CREATE POLICY "Users can view own assignments"
  ON public.user_store_assignments FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (user_id = auth.uid() OR is_store_admin(auth.uid()))
  );

CREATE POLICY "Admins can insert assignments"
  ON public.user_store_assignments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_store_admin(auth.uid())
  );

CREATE POLICY "Admins can delete assignments"
  ON public.user_store_assignments FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_store_admin(auth.uid())
  );

CREATE POLICY "Admins can update assignments"
  ON public.user_store_assignments FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_store_admin(auth.uid())
  );
