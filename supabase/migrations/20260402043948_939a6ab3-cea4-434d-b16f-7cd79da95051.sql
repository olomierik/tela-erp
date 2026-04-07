
-- The existing ALL policy on accounting_voucher_entries already covers update/delete for tenant members.
-- But we need to ensure the policy has WITH CHECK for inserts/updates.
-- Drop and recreate with explicit permissions:
DROP POLICY IF EXISTS "Tenant isolation" ON public.accounting_voucher_entries;

CREATE POLICY "Tenant isolation" ON public.accounting_voucher_entries
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
