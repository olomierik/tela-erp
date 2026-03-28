-- Add Anthropic API key and model preference to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT,
  ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'claude-sonnet-4-6';
