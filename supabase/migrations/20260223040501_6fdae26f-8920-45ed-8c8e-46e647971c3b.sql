
-- Add sponsor_priority to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sponsor_priority integer NOT NULL DEFAULT 0;

-- Add sponsor_source to deals (track provenance)
DO $$ BEGIN
  CREATE TYPE sponsor_source_type AS ENUM ('manual', 'partner_offer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sponsor_source text DEFAULT 'manual';

-- Add sponsor_priority to partner_offers
ALTER TABLE public.partner_offers ADD COLUMN IF NOT EXISTS sponsor_priority integer NOT NULL DEFAULT 0;

-- Add is_sponsored snapshot to affiliate_clicks
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false;

-- Create sponsored_impressions table
CREATE TABLE IF NOT EXISTS public.sponsored_impressions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  deal_id uuid,
  offer_id uuid,
  scope text,
  campus_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sponsored impressions"
  ON public.sponsored_impressions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert sponsored impressions"
  ON public.sponsored_impressions FOR INSERT
  WITH CHECK (true);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sponsored_impressions_deal ON public.sponsored_impressions (deal_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_sponsor_priority ON public.deals (sponsor_priority DESC) WHERE sponsored = true;
