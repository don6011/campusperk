ALTER TABLE public.campus_domains
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT NULL;