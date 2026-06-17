-- Additive repair for legacy affiliate ingestion tables used by ingest-deals.
-- Safe for production: no drops, no destructive column changes.

CREATE TABLE IF NOT EXISTS public.affiliate_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_name text NOT NULL,
  source_name text,
  api_endpoint text,
  api_key_secret_name text,
  feed_url text,
  auth_type text DEFAULT 'api_key',
  credentials_json jsonb,
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_sources
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS credentials_json jsonb;

CREATE TABLE IF NOT EXISTS public.affiliate_raw_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.affiliate_sources(id) ON DELETE CASCADE,
  network_name text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  description text,
  brand text,
  category text,
  affiliate_url text,
  image_url text,
  raw_data jsonb,
  advertiser_id text,
  checksum text,
  status text DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_raw_deals
  ADD COLUMN IF NOT EXISTS advertiser_id text,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_raw_deals_source
  ON public.affiliate_raw_deals (source_id);

CREATE INDEX IF NOT EXISTS idx_raw_deals_network_ext
  ON public.affiliate_raw_deals (network_name, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_raw_deals_network_external_unique
  ON public.affiliate_raw_deals (network_name, external_id);

CREATE TABLE IF NOT EXISTS public.normalized_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_deal_id uuid REFERENCES public.affiliate_raw_deals(id) ON DELETE SET NULL,
  title text NOT NULL,
  brand text,
  category text,
  description text,
  affiliate_url text,
  image_url text,
  source_network text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  promoted_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  network_item_id text,
  advertiser_id text,
  advertiser_name text,
  brand_name text,
  short_description text,
  long_description text,
  deeplink_url text,
  domain text,
  category_primary text,
  category_secondary text,
  price numeric,
  sale_price numeric,
  currency text DEFAULT 'USD',
  estimated_savings_amount numeric,
  estimated_savings_percent numeric,
  coupon_code text,
  is_coupon boolean DEFAULT false,
  is_student_relevant boolean DEFAULT false,
  student_relevance_score numeric DEFAULT 0,
  is_premium_only boolean DEFAULT false,
  is_local boolean DEFAULT false,
  campus_scope text DEFAULT 'national',
  expires_at timestamptz,
  status text DEFAULT 'draft',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.normalized_deals
  ADD COLUMN IF NOT EXISTS raw_deal_id uuid REFERENCES public.affiliate_raw_deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_item_id text,
  ADD COLUMN IF NOT EXISTS advertiser_id text,
  ADD COLUMN IF NOT EXISTS advertiser_name text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS deeplink_url text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS category_primary text,
  ADD COLUMN IF NOT EXISTS category_secondary text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS estimated_savings_amount numeric,
  ADD COLUMN IF NOT EXISTS estimated_savings_percent numeric,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS is_coupon boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_student_relevant boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS student_relevance_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_premium_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_local boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS campus_scope text DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE TABLE IF NOT EXISTS public.brand_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_brand_name text NOT NULL,
  normalized_brand_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_normalized_source
  ON public.normalized_deals (source_network);

CREATE INDEX IF NOT EXISTS idx_normalized_verified
  ON public.normalized_deals (verified);

CREATE INDEX IF NOT EXISTS idx_normalized_deals_dedup
  ON public.normalized_deals (brand_name, title, domain);

CREATE INDEX IF NOT EXISTS idx_normalized_deals_relevance
  ON public.normalized_deals (student_relevance_score DESC, is_student_relevant)
  WHERE status = 'draft' OR status = 'published';

ALTER TABLE public.affiliate_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_raw_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_aliases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliate_sources'
      AND policyname = 'Admins can manage affiliate sources'
  ) THEN
    CREATE POLICY "Admins can manage affiliate sources"
      ON public.affiliate_sources
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliate_raw_deals'
      AND policyname = 'Admins can manage raw deals'
  ) THEN
    CREATE POLICY "Admins can manage raw deals"
      ON public.affiliate_raw_deals
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'normalized_deals'
      AND policyname = 'Admins can manage normalized deals'
  ) THEN
    CREATE POLICY "Admins can manage normalized deals"
      ON public.normalized_deals
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_aliases'
      AND policyname = 'Admins can manage brand aliases'
  ) THEN
    CREATE POLICY "Admins can manage brand aliases"
      ON public.brand_aliases
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_aliases'
      AND policyname = 'Brand aliases publicly readable'
  ) THEN
    CREATE POLICY "Brand aliases publicly readable"
      ON public.brand_aliases
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_affiliate_sources_updated_at ON public.affiliate_sources;
    CREATE TRIGGER update_affiliate_sources_updated_at
      BEFORE UPDATE ON public.affiliate_sources
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_normalized_deals_updated_at ON public.normalized_deals;
    CREATE TRIGGER update_normalized_deals_updated_at
      BEFORE UPDATE ON public.normalized_deals
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_raw_deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.normalized_deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_aliases TO authenticated;
