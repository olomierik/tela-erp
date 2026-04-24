
-- =============================================================
-- 1. ROLE-BASED DELETE RESTRICTIONS (CLIENT_SIDE_AUTH)
-- =============================================================
-- Helper: admin OR reseller can delete; everyone else in tenant cannot.

-- inventory_items
DROP POLICY IF EXISTS "Users can delete own tenant inventory" ON public.inventory_items;
CREATE POLICY "Admins can delete own tenant inventory"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- sales_orders
DROP POLICY IF EXISTS "Users can delete own tenant sales orders" ON public.sales_orders;
CREATE POLICY "Admins can delete own tenant sales orders"
  ON public.sales_orders FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- transactions
DROP POLICY IF EXISTS "Users can delete own tenant transactions" ON public.transactions;
CREATE POLICY "Admins can delete own tenant transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- invoices
DROP POLICY IF EXISTS "Users can delete own tenant invoices" ON public.invoices;
CREATE POLICY "Admins can delete own tenant invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- customers
DROP POLICY IF EXISTS "Users can delete own tenant customers" ON public.customers;
CREATE POLICY "Admins can delete own tenant customers"
  ON public.customers FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- employees
DROP POLICY IF EXISTS "Users can delete own tenant employees" ON public.employees;
CREATE POLICY "Admins can delete own tenant employees"
  ON public.employees FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- =============================================================
-- 2. PREVENT user_roles SELF-ESCALATION (PRIVILEGE_ESCALATION)
-- =============================================================
-- user_roles already has no INSERT/UPDATE/DELETE policy = deny by default.
-- Add explicit deny-all-writes policies for clarity & defence-in-depth.

DROP POLICY IF EXISTS "Block client inserts on user_roles" ON public.user_roles;
CREATE POLICY "Block client inserts on user_roles"
  ON public.user_roles FOR INSERT TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates on user_roles" ON public.user_roles;
CREATE POLICY "Block client updates on user_roles"
  ON public.user_roles FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Block client deletes on user_roles" ON public.user_roles;
CREATE POLICY "Block client deletes on user_roles"
  ON public.user_roles FOR DELETE TO authenticated, anon
  USING (false);

-- =============================================================
-- 3. SCOPE PUBLIC-ROLE POLICIES TO authenticated
-- (PUBLIC_POLICY_ON_SENSITIVE_TABLE)
-- =============================================================

-- accounting_vouchers
DROP POLICY IF EXISTS "Tenant isolation" ON public.accounting_vouchers;
CREATE POLICY "Tenant isolation accounting_vouchers"
  ON public.accounting_vouchers FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- accounting_ledger_balances
DROP POLICY IF EXISTS "Tenant isolation" ON public.accounting_ledger_balances;
CREATE POLICY "Tenant isolation accounting_ledger_balances"
  ON public.accounting_ledger_balances FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- automation_rules
DROP POLICY IF EXISTS "tenant_isolation_automation_rules" ON public.automation_rules;
CREATE POLICY "tenant_isolation_automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- budgets
DROP POLICY IF EXISTS "tenant_isolation_budgets" ON public.budgets;
CREATE POLICY "tenant_isolation_budgets"
  ON public.budgets FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- budget_lines
DROP POLICY IF EXISTS "tenant_isolation_budget_lines" ON public.budget_lines;
CREATE POLICY "tenant_isolation_budget_lines"
  ON public.budget_lines FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- expense_claims
DROP POLICY IF EXISTS "tenant_isolation_expense_claims" ON public.expense_claims;
CREATE POLICY "tenant_isolation_expense_claims"
  ON public.expense_claims FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- expense_items
DROP POLICY IF EXISTS "tenant_isolation_expense_items" ON public.expense_items;
CREATE POLICY "tenant_isolation_expense_items"
  ON public.expense_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- fixed_assets
DROP POLICY IF EXISTS "tenant_isolation_fixed_assets" ON public.fixed_assets;
CREATE POLICY "tenant_isolation_fixed_assets"
  ON public.fixed_assets FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- payroll_runs
DROP POLICY IF EXISTS "Tenant isolation for payroll_runs" ON public.payroll_runs;
CREATE POLICY "Tenant isolation for payroll_runs"
  ON public.payroll_runs FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- purchase_order_lines (4 separate policies)
DROP POLICY IF EXISTS "Users can view purchase order lines in their tenant" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can create purchase order lines in their tenant" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can update purchase order lines in their tenant" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can delete purchase order lines in their tenant" ON public.purchase_order_lines;

CREATE POLICY "Users can view purchase order lines in their tenant"
  ON public.purchase_order_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND po.tenant_id = public.get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Users can create purchase order lines in their tenant"
  ON public.purchase_order_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND po.tenant_id = public.get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Users can update purchase order lines in their tenant"
  ON public.purchase_order_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND po.tenant_id = public.get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Admins can delete purchase order lines in their tenant"
  ON public.purchase_order_lines FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_lines.purchase_order_id
        AND po.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
  );

-- scanned_documents
DROP POLICY IF EXISTS "tenant_isolation_scanned_documents" ON public.scanned_documents;
CREATE POLICY "tenant_isolation_scanned_documents"
  ON public.scanned_documents FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- tax_rates
DROP POLICY IF EXISTS "tenant_isolation_tax_rates" ON public.tax_rates;
CREATE POLICY "tenant_isolation_tax_rates"
  ON public.tax_rates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- team_invites — keep anon read for invite acceptance, but scope tenant policy to authenticated
DROP POLICY IF EXISTS "tenant_isolation_team_invites" ON public.team_invites;
CREATE POLICY "tenant_isolation_team_invites"
  ON public.team_invites FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- =============================================================
-- 4. STORAGE: REMOVE BROAD LISTING (SUPA_public_bucket_allows_listing)
-- =============================================================
-- Public URL access still works because the buckets are public.
-- We only remove the broad SELECT policy that lets clients enumerate files.

DROP POLICY IF EXISTS "Authenticated users can list product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list tenant logos" ON storage.objects;

-- Allow tenant users to list ONLY files inside their own tenant folder.
CREATE POLICY "Tenant users can list own product images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
  );

CREATE POLICY "Tenant users can list own logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
  );
