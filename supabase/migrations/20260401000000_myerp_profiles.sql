-- myERP user profiles table
-- Stores per-user ERP profile data (full name, company name)
-- Linked 1:1 to auth.users via trigger on signup

CREATE TABLE IF NOT EXISTS public.myerp_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text,
  company_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.myerp_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "myerp: users can read own profile"
  ON public.myerp_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "myerp: users can update own profile"
  ON public.myerp_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "myerp: users can insert own profile"
  ON public.myerp_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION public.handle_myerp_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.myerp_profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists to allow re-running the migration
DROP TRIGGER IF EXISTS on_myerp_auth_user_created ON auth.users;

CREATE TRIGGER on_myerp_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_myerp_new_user();

-- Updated_at auto-touch
CREATE OR REPLACE FUNCTION public.touch_myerp_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS myerp_profiles_updated_at ON public.myerp_profiles;

CREATE TRIGGER myerp_profiles_updated_at
  BEFORE UPDATE ON public.myerp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_myerp_profile_updated_at();
