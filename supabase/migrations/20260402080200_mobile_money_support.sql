-- Add Mobile Money support to payments
ALTER TABLE public.myerp_payments DROP CONSTRAINT IF EXISTS myerp_payments_method_check;
ALTER TABLE public.myerp_payments ADD CONSTRAINT myerp_payments_method_check 
  CHECK (method IN ('bank','cash','card','cheque','mobile_money'));

-- Table for Mobile Money Providers (M-Pesa, Wave, etc.)
CREATE TABLE IF NOT EXISTS public.myerp_mobile_money_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g., 'M-Pesa', 'Wave', 'GCash'
  country text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.myerp_mobile_money_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mm_providers_owner" ON public.myerp_mobile_money_providers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Add provider_id to payments
ALTER TABLE public.myerp_payments ADD COLUMN IF NOT EXISTS mobile_money_provider_id uuid REFERENCES public.myerp_mobile_money_providers(id);
ALTER TABLE public.myerp_payments ADD COLUMN IF NOT EXISTS mobile_money_number text;
ALTER TABLE public.myerp_payments ADD COLUMN IF NOT EXISTS transaction_reference text;
