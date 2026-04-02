
-- Add unique constraint on chart_of_accounts (tenant_id, lower(name)) to prevent duplicate ledger names
CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_tenant_name_unique 
ON public.chart_of_accounts (tenant_id, LOWER(name));

-- Add is_active column for soft-delete support
ALTER TABLE public.chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
