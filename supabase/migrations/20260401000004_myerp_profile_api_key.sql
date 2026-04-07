-- Add Anthropic API key to myerp_profiles so each user can store their own key.
-- The key is only readable/writable by the owner (existing RLS policies cover this).

ALTER TABLE public.myerp_profiles
  ADD COLUMN IF NOT EXISTS anthropic_api_key text,
  ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'claude-opus-4-6';
