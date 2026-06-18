-- CampusPerk Deal Quality Cleanup
-- Additive fields only. Raw imported titles remain unchanged.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS display_title text,
  ADD COLUMN IF NOT EXISTS deal_quality_score integer NOT NULL DEFAULT 0 CHECK (deal_quality_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS quality_warnings text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS quality_reviewed_at timestamptz;

ALTER TABLE public.affiliate_deals
  ADD COLUMN IF NOT EXISTS display_title text,
  ADD COLUMN IF NOT EXISTS deal_quality_score integer NOT NULL DEFAULT 0 CHECK (deal_quality_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS quality_warnings text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS quality_reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deals_status_quality
  ON public.deals (status, deal_quality_score DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_deals_homepage_quality
  ON public.deals (deal_quality_score DESC, updated_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_affiliate_deals_quality
  ON public.affiliate_deals (status, deal_quality_score DESC, updated_at DESC);
