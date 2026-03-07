
-- Add columns to affiliate_sources
ALTER TABLE public.affiliate_sources
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS credentials_json jsonb;

-- Add columns to affiliate_raw_deals
ALTER TABLE public.affiliate_raw_deals
  ADD COLUMN IF NOT EXISTS advertiser_id text,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Add columns to normalized_deals
ALTER TABLE public.normalized_deals
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

-- Create brand_aliases table
CREATE TABLE IF NOT EXISTS public.brand_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_brand_name text NOT NULL,
  normalized_brand_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage brand aliases"
  ON public.brand_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Brand aliases publicly readable"
  ON public.brand_aliases FOR SELECT TO authenticated
  USING (true);

-- Add dedup index on normalized_deals
CREATE INDEX IF NOT EXISTS idx_normalized_deals_dedup
  ON public.normalized_deals (brand_name, title, domain);

-- Add index for student relevance filtering
CREATE INDEX IF NOT EXISTS idx_normalized_deals_relevance
  ON public.normalized_deals (student_relevance_score DESC, is_student_relevant)
  WHERE status = 'draft' OR status = 'published';
