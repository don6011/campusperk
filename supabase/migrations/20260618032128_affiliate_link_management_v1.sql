-- Affiliate Link Management V1
-- Additive admin-managed affiliate metadata for merchant defaults and deal overrides.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS default_affiliate_link_url text,
  ADD COLUMN IF NOT EXISTS default_destination_url text,
  ADD COLUMN IF NOT EXISTS default_deep_link_url text,
  ADD COLUMN IF NOT EXISTS tracking_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_notes text,
  ADD COLUMN IF NOT EXISTS link_validation_status text NOT NULL DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS link_validation_message text,
  ADD COLUMN IF NOT EXISTS link_last_validated_at timestamptz;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deep_link_url text,
  ADD COLUMN IF NOT EXISTS deal_image_url text,
  ADD COLUMN IF NOT EXISTS tracking_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_notes text,
  ADD COLUMN IF NOT EXISTS link_validation_status text NOT NULL DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS link_validation_message text,
  ADD COLUMN IF NOT EXISTS link_last_validated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'partners_link_validation_status_check'
  ) THEN
    ALTER TABLE public.partners
      ADD CONSTRAINT partners_link_validation_status_check
      CHECK (link_validation_status IN ('unchecked', 'valid', 'warning', 'invalid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deals_link_validation_status_check'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_link_validation_status_check
      CHECK (link_validation_status IN ('unchecked', 'valid', 'warning', 'invalid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partners_default_affiliate_link
  ON public.partners (affiliate_network, advertiser_id)
  WHERE default_affiliate_link_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_affiliate_override_status
  ON public.deals (partner_id, link_validation_status)
  WHERE affiliate_link_url IS NOT NULL OR direct_link_url IS NOT NULL OR deep_link_url IS NOT NULL;
