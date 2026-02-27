
-- Add affiliate fields to deals table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS affiliate_network text,
  ADD COLUMN IF NOT EXISTS is_affiliate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage';

-- Add tracking fields to affiliate_clicks table
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS campus_id uuid,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- Add index for campus-based analytics
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_campus_id ON public.affiliate_clicks(campus_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_scope ON public.affiliate_clicks(scope);
