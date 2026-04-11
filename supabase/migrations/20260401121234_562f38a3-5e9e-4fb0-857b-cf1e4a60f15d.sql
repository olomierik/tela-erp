
UPDATE public.profiles SET phone = '' WHERE phone IS NULL;
ALTER TABLE public.profiles ALTER COLUMN phone SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT '';
