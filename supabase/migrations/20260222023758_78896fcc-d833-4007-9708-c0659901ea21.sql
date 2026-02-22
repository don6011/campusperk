-- Add sponsored fields to partner_offers
ALTER TABLE public.partner_offers
  ADD COLUMN IF NOT EXISTS sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_tier integer,
  ADD COLUMN IF NOT EXISTS sponsor_start_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sponsor_end_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sponsor_notes text;
