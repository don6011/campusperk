
-- Add use_campus_location flag and user_state_code to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS use_campus_location boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS user_state_code text;

-- Add state_code to partner_locations
ALTER TABLE public.partner_locations
  ADD COLUMN IF NOT EXISTS state_code text;

-- Add state_code to campus_domains
ALTER TABLE public.campus_domains
  ADD COLUMN IF NOT EXISTS state_code text;
