-- ========================================
-- 1. PERFORMANCE INDEXES FOR SCALE
-- ========================================
-- Composite indexes on (tenant_id, created_at) for tenant-scoped pagination

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_created ON public.inventory_items (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_store ON public.inventory_items (tenant_id, store_id) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_sku ON public.inventory_items (tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_status ON public.inventory_items (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_created ON public.inventory_transactions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON public.inventory_transactions (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created ON public.invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON public.invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices (customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines (invoice_id);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_created ON public.customers (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_email ON public.customers (tenant_id, email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_date ON public.attendance_logs (employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_status ON public.leave_requests (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created ON public.audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON public.audit_log (tenant_id, module, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON public.journal_entries (tenant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_tenant_date ON public.accounting_vouchers (tenant_id, voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_status ON public.accounting_vouchers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_accounting_voucher_entries_voucher ON public.accounting_voucher_entries (voucher_id);
CREATE INDEX IF NOT EXISTS idx_accounting_voucher_entries_account ON public.accounting_voucher_entries (account_id);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON public.chart_of_accounts (tenant_id, account_type, is_active);
CREATE INDEX IF NOT EXISTS idx_account_mappings_tenant ON public.account_mappings (tenant_id, module, transaction_type);

CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant_status ON public.expense_claims (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_items_claim ON public.expense_items (claim_id);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant ON public.fixed_assets (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON public.budgets (tenant_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON public.budget_lines (budget_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON public.campaigns (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant_stage ON public.crm_deals (tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant_scheduled ON public.crm_activities (tenant_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON public.inventory_reservations (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_tenant_created ON public.inventory_adjustments (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_item ON public.inventory_adjustments (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_status ON public.maintenance_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_tenant ON public.equipment (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_date ON public.fuel_logs (vehicle_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_bom_lines_bom ON public.bom_lines (bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_templates_tenant ON public.bom_templates (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories (tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON public.departments (tenant_id);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_active ON public.automation_rules (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log (recipient_email, created_at DESC);

-- ========================================
-- 2. SECURITY: Fix mutable search_path on functions
-- ========================================
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- ========================================
-- 3. SECURITY: Restrict public bucket listing
-- ========================================
-- Drop overly broad SELECT policies that allow listing all files
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tenant logos" ON storage.objects;

-- Allow public read of individual files (by URL) but NOT listing
-- Public buckets serve files directly via CDN URL; SELECT policy controls listing.
-- Restrict listing to authenticated users only.
CREATE POLICY "Authenticated users can list product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can list tenant logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'tenant-logos');

-- ========================================
-- 4. ANALYZE tables to refresh planner statistics
-- ========================================
ANALYZE public.inventory_items;
ANALYZE public.invoices;
ANALYZE public.customers;
ANALYZE public.audit_log;
ANALYZE public.accounting_vouchers;