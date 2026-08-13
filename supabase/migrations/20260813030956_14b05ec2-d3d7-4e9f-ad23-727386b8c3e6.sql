ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS beta_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_access_granted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS beta_access_source text;

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS network text;