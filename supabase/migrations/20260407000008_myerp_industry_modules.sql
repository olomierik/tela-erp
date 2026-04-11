-- Migration: Industry-based module activation
-- Adds industry, active_modules, and onboarding_completed to myerp_profiles

ALTER TABLE public.myerp_profiles
  ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS active_modules jsonb NOT NULL DEFAULT '["finance","sales","procurement","inventory","hr","manufacturing","projects","assets","expenses","helpdesk","fleet","maintenance","marketing","subscriptions","pos"]'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_size text NOT NULL DEFAULT 'small' CHECK (business_size IN ('solo','small','medium','large'));

-- Industry module presets lookup table (reference only, not user-scoped)
CREATE TABLE IF NOT EXISTS public.myerp_industry_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key text NOT NULL UNIQUE,
  industry_label text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'building',
  default_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed industry presets
INSERT INTO public.myerp_industry_presets (industry_key, industry_label, description, icon, default_modules) VALUES
(
  'retail',
  'Retail & Commerce',
  'Physical or online stores selling products directly to consumers',
  'shopping-bag',
  '["finance","sales","inventory","procurement","pos","hr","expenses"]'::jsonb
),
(
  'manufacturing',
  'Manufacturing',
  'Companies that produce goods from raw materials or components',
  'factory',
  '["finance","manufacturing","inventory","procurement","hr","expenses","assets","maintenance"]'::jsonb
),
(
  'services',
  'Professional Services',
  'Consulting, legal, accounting, agencies, and other service businesses',
  'briefcase',
  '["finance","sales","projects","hr","helpdesk","expenses","marketing"]'::jsonb
),
(
  'hospitality',
  'Hospitality & Restaurant',
  'Hotels, restaurants, cafes, bars, and food service businesses',
  'utensils',
  '["finance","pos","inventory","hr","expenses","procurement"]'::jsonb
),
(
  'healthcare',
  'Healthcare & Medical',
  'Clinics, hospitals, pharmacies, and health service providers',
  'heart-pulse',
  '["finance","hr","inventory","helpdesk","expenses","assets"]'::jsonb
),
(
  'construction',
  'Construction & Engineering',
  'Contractors, builders, civil engineering, and infrastructure firms',
  'hard-hat',
  '["finance","projects","assets","hr","procurement","inventory","expenses","maintenance"]'::jsonb
),
(
  'logistics',
  'Logistics & Transportation',
  'Freight, delivery, warehousing, and supply chain companies',
  'truck',
  '["finance","fleet","hr","inventory","procurement","expenses"]'::jsonb
),
(
  'ecommerce',
  'E-Commerce & Online Business',
  'Online stores, marketplaces, dropshipping, and digital products',
  'globe',
  '["finance","sales","inventory","marketing","subscriptions","helpdesk","expenses"]'::jsonb
),
(
  'nonprofit',
  'Non-Profit & NGO',
  'Charities, foundations, religious organisations, and social enterprises',
  'heart',
  '["finance","hr","projects","expenses","marketing"]'::jsonb
),
(
  'agriculture',
  'Agriculture & Farming',
  'Farms, agribusinesses, food processing, and agri-supply companies',
  'sprout',
  '["finance","inventory","procurement","manufacturing","hr","expenses","assets"]'::jsonb
),
(
  'realestate',
  'Real Estate & Property',
  'Property developers, agents, landlords, and property managers',
  'building',
  '["finance","assets","sales","hr","expenses","maintenance"]'::jsonb
),
(
  'technology',
  'Technology & SaaS',
  'Software companies, tech startups, IT services, and digital agencies',
  'cpu',
  '["finance","subscriptions","projects","helpdesk","hr","expenses","marketing","sales"]'::jsonb
),
(
  'general',
  'General Business',
  'All modules activated — suitable for businesses with diverse needs',
  'layout-grid',
  '["finance","sales","procurement","inventory","hr","manufacturing","projects","assets","expenses","helpdesk","fleet","maintenance","marketing","subscriptions","pos"]'::jsonb
)
ON CONFLICT (industry_key) DO UPDATE SET
  industry_label = EXCLUDED.industry_label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  default_modules = EXCLUDED.default_modules;

-- Make presets readable by all authenticated users (no user_id scoping needed)
ALTER TABLE public.myerp_industry_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_industry_presets_read"
  ON public.myerp_industry_presets
  FOR SELECT TO authenticated
  USING (true);
