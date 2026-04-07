-- ============================================================================
-- FIX: Add missing columns that the frontend expects but the schema lacks
-- Date: 2026-04-06
-- ============================================================================

-- ─── SUPPLIERS: add rating column ───────────────────────────────────────────
-- The Suppliers page sends `rating` (integer 1-5) on create/update.
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rating integer DEFAULT 3;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tax_id text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- ─── PROJECTS: add client column ────────────────────────────────────────────
-- The Projects page sends `client`, `manager`, `budget`, `spent`, `notes`.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client text DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS manager text DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget numeric(15,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS spent numeric(15,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date date;

-- ─── PRODUCTION ORDERS: add item_id, product_name, start/end dates ──────────
-- The Production page sends `item_id`, `product_name`, `start_date`, `end_date`.
-- Also add `total_cost` to prevent "no field total_cost" errors from any
-- older code path or Supabase schema cache.
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS item_id uuid;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS product_name text DEFAULT '';
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS total_cost numeric(15,2) DEFAULT 0;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS quantity numeric(15,4) DEFAULT 1;

-- ─── FIXED ASSETS: ensure all columns the page expects exist ────────────────
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS asset_number text DEFAULT '';
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS purchase_cost numeric(15,2) DEFAULT 0;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS current_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS condition text DEFAULT 'good';
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS useful_life_years integer DEFAULT 5;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS salvage_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS depreciation_method text DEFAULT 'straight_line';
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS assigned_to text DEFAULT '';

-- ─── BUDGET LINES: ensure all columns exist ─────────────────────────────────
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS name text DEFAULT '';
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS actual_amount numeric(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- ─── BUDGETS: ensure all columns exist ──────────────────────────────────────
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS department text DEFAULT '';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period text DEFAULT 'annual';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS fiscal_year integer DEFAULT EXTRACT(YEAR FROM now());
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_budget numeric(15,2) DEFAULT 0;

-- ─── SCANNED DOCUMENTS: add columns for OCR text and camera source ──────────
ALTER TABLE public.scanned_documents ADD COLUMN IF NOT EXISTS ocr_text text DEFAULT '';
ALTER TABLE public.scanned_documents ADD COLUMN IF NOT EXISTS source text DEFAULT 'upload';
ALTER TABLE public.scanned_documents ADD COLUMN IF NOT EXISTS file_url text DEFAULT '';
ALTER TABLE public.scanned_documents ADD COLUMN IF NOT EXISTS file_name text DEFAULT '';
ALTER TABLE public.scanned_documents ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'other';
ALTER TABLE public.scanned_documents ADD COLUMN IF NOT EXISTS extracted_data jsonb DEFAULT '{}';

-- ─── PURCHASE ORDERS: add received_quantity for inventory tracking ───────────
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS received_quantity numeric(15,4) DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_name text DEFAULT '';

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON public.suppliers(rating);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client);
CREATE INDEX IF NOT EXISTS idx_production_orders_item_id ON public.production_orders(item_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_type ON public.scanned_documents(document_type);
