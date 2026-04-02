-- Fix: tenants RLS was restricting SELECT to only the user's single profile tenant.
-- This policy allows users to see ALL tenants they're a member of via user_companies.
CREATE POLICY "Users can view all member tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
