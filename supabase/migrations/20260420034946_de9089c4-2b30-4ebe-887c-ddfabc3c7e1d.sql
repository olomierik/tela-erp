
-- ============================================================
-- 1. STORAGE: tenant-scoped policies for product-images
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Tenant users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- ============================================================
-- 2. STORAGE: tenant-scoped policies for tenant-logos
-- Files must be stored under <uploader_tenant_id>/...
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;

CREATE POLICY "Tenant users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant users can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant users can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- ============================================================
-- 3. tenant_secrets: strict tenant + admin-only access
-- ============================================================
ALTER TABLE public.tenant_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can view their secrets" ON public.tenant_secrets;
DROP POLICY IF EXISTS "Tenant admins can insert their secrets" ON public.tenant_secrets;
DROP POLICY IF EXISTS "Tenant admins can update their secrets" ON public.tenant_secrets;
DROP POLICY IF EXISTS "Tenant admins can delete their secrets" ON public.tenant_secrets;

CREATE POLICY "Tenant admins can view their secrets"
ON public.tenant_secrets FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Tenant admins can insert their secrets"
ON public.tenant_secrets FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Tenant admins can update their secrets"
ON public.tenant_secrets FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Tenant admins can delete their secrets"
ON public.tenant_secrets FOR DELETE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================
-- 4. Realtime: tenant-scoped channel topics
-- Topic format expected: "tenant:<tenant_id>" or "tenant:<tenant_id>:..."
-- ============================================================
DROP POLICY IF EXISTS "Tenant scoped realtime read"  ON realtime.messages;
DROP POLICY IF EXISTS "Tenant scoped realtime write" ON realtime.messages;

CREATE POLICY "Tenant scoped realtime read"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE ('tenant:' || public.get_user_tenant_id(auth.uid())::text || '%')
);

CREATE POLICY "Tenant scoped realtime write"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE ('tenant:' || public.get_user_tenant_id(auth.uid())::text || '%')
);

-- ============================================================
-- 5. password_reset_otps: brute-force protection column
-- ============================================================
ALTER TABLE public.password_reset_otps
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
