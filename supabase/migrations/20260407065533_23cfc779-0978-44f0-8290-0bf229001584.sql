
-- Table to track which apps/modules each tenant has installed
CREATE TABLE public.tenant_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installed_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, app_key)
);

ALTER TABLE public.tenant_apps ENABLE ROW LEVEL SECURITY;

-- Users can read their tenant's installed apps
CREATE POLICY "Users can view own tenant apps"
  ON public.tenant_apps
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Admins can install/uninstall apps
CREATE POLICY "Admins can manage tenant apps"
  ON public.tenant_apps
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );
