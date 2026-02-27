
-- Extend sponsored_impressions with richer tracking fields
ALTER TABLE public.sponsored_impressions
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'deal',
  ADD COLUMN IF NOT EXISTS partner_id uuid,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Create sponsored_clicks table for detailed click tracking
CREATE TABLE IF NOT EXISTS public.sponsored_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  item_type text NOT NULL DEFAULT 'deal',
  item_id uuid NOT NULL,
  partner_id uuid,
  scope text,
  campus_id uuid,
  city text,
  state text,
  is_sponsored boolean NOT NULL DEFAULT true,
  sponsor_tier integer,
  sponsor_priority integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sponsored clicks"
  ON public.sponsored_clicks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert sponsored clicks"
  ON public.sponsored_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own sponsored clicks"
  ON public.sponsored_clicks FOR SELECT
  USING (auth.uid() = user_id);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_sponsored_impressions_created ON public.sponsored_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_sponsored_impressions_deal ON public.sponsored_impressions(deal_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_clicks_created ON public.sponsored_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_sponsored_clicks_item ON public.sponsored_clicks(item_id);
