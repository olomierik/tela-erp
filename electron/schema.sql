-- TELA ERP SQLite Schema
-- All primary keys are TEXT (UUIDs stored as text)

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_companies (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id),
  tenant_id TEXT REFERENCES tenants(id),
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id),
  tenant_id TEXT REFERENCES tenants(id),
  role TEXT NOT NULL,
  permissions TEXT, -- JSON array
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  parent_id TEXT,
  is_active INTEGER DEFAULT 1,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounting_vouchers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  voucher_number TEXT NOT NULL,
  voucher_type TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  reference TEXT,
  status TEXT DEFAULT 'draft',
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounting_voucher_entries (
  id TEXT PRIMARY KEY,
  voucher_id TEXT REFERENCES accounting_vouchers(id),
  account_id TEXT REFERENCES chart_of_accounts(id),
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounting_ledger_balances (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  account_id TEXT REFERENCES chart_of_accounts(id),
  period TEXT NOT NULL,
  opening_balance REAL DEFAULT 0,
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  closing_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  credit_limit REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  payment_terms INTEGER DEFAULT 30,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  cost_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  quantity_on_hand REAL DEFAULT 0,
  reorder_level REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  order_number TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'draft',
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  order_number TEXT NOT NULL,
  supplier_id TEXT REFERENCES suppliers(id),
  date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'draft',
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  invoice_number TEXT NOT NULL,
  invoice_type TEXT DEFAULT 'sale', -- sale | purchase
  customer_id TEXT REFERENCES customers(id),
  supplier_id TEXT REFERENCES suppliers(id),
  sales_order_id TEXT REFERENCES sales_orders(id),
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'draft',
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id),
  item_id TEXT REFERENCES inventory_items(id),
  description TEXT,
  quantity REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  tax_percent REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  transaction_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  account_id TEXT REFERENCES chart_of_accounts(id),
  amount REAL NOT NULL,
  direction TEXT NOT NULL, -- debit | credit
  date TEXT NOT NULL,
  description TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  user_id TEXT REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
