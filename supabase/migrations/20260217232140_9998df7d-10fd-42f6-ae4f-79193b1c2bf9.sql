
-- Add blocked_reason to affiliate_clicks for logging blocked redirect attempts
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Add premium gating and sponsor fields to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS early_access boolean NOT NULL DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sponsor_tier integer;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sponsor_start_at timestamp with time zone;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sponsor_end_at timestamp with time zone;
