-- TELA ERP — SQLite schema
-- Strategy: core identity tables use defined columns; all ERP tables use a
-- flexible (id, tenant_id, store_id, status, created_at, updated_at, _data)
-- pattern where _data is a JSON blob for domain-specific fields. This lets
-- the schema survive any future field additions without migrations.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous   = NORMAL;

-- ── Core identity ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT,
  plan       TEXT DEFAULT 'enterprise',
  settings   TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,
  user_id       TEXT UNIQUE NOT NULL,
  tenant_id     TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  full_name     TEXT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT DEFAULT 'admin',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_email     ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant    ON profiles(tenant_id);

CREATE TABLE IF NOT EXISTS user_companies (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  tenant_id  TEXT NOT NULL,
  role       TEXT DEFAULT 'admin',
  is_active  INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_uc_user_tenant ON user_companies(user_id, tenant_id);

CREATE TABLE IF NOT EXISTS user_roles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  tenant_id   TEXT NOT NULL,
  role        TEXT DEFAULT 'admin',
  permissions TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ur_user_tenant ON user_roles(user_id, tenant_id);

-- ── ERP table template macro (repeated for each domain table) ─────────────
-- Columns: id · tenant_id · store_id · status · created_at · updated_at · _data
-- _data carries all other fields as a JSON string.

CREATE TABLE IF NOT EXISTS sales_orders            (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS inventory_items         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS invoices                (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS invoice_lines           (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS customers               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS suppliers               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS transactions            (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS pos_orders              (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS pos_order_lines         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS inventory_transactions  (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS inventory_adjustments   (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS payments                (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS production_orders       (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS purchase_orders         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS inventory_reservations  (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS categories              (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS campaigns               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS stock_transfers         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS bom_templates           (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS bom_lines               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS chart_of_accounts       (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS journal_entries         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS stores                  (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS projects                (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS project_tasks           (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS notifications           (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS employees               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS departments             (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS attendance_logs         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS leave_requests          (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS payroll_runs            (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS payroll_lines           (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS crm_deals               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS crm_activities          (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS scanned_documents       (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS fixed_assets            (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS expense_claims          (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS expense_items           (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS budgets                 (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS budget_lines            (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS automation_rules        (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS tax_rates               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS team_invites            (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS audit_log               (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS automation_logs         (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS recurring_templates     (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), _data TEXT DEFAULT '{}');

-- ── Indexes for every ERP table (tenant_id + created_at) ──────────────────

CREATE INDEX IF NOT EXISTS idx_sales_orders_t           ON sales_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_t        ON inventory_items(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_t               ON invoices(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_t          ON invoice_lines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_t              ON customers(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_t              ON suppliers(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_t           ON transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_orders_t             ON pos_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_order_lines_t        ON pos_order_lines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_t ON inventory_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_t  ON inventory_adjustments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_t               ON payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_orders_t      ON production_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_t        ON purchase_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_t             ON categories(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_t              ON campaigns(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_t        ON stock_transfers(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bom_templates_t          ON bom_templates(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bom_lines_t              ON bom_lines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_t      ON chart_of_accounts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_t        ON journal_entries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stores_t                 ON stores(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_t               ON projects(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_tasks_t          ON project_tasks(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_t          ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_t              ON employees(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_departments_t            ON departments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_t        ON attendance_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_t         ON leave_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_t           ON payroll_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_t          ON payroll_lines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_t              ON crm_deals(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_t         ON crm_activities(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_t      ON scanned_documents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_t           ON fixed_assets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_claims_t         ON expense_claims(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_items_t          ON expense_items(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_t                ON budgets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_lines_t           ON budget_lines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_t       ON automation_rules(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_rates_t              ON tax_rates(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_invites_t           ON team_invites(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_t              ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_t        ON automation_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_t    ON recurring_templates(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_t ON inventory_reservations(tenant_id, created_at DESC);
