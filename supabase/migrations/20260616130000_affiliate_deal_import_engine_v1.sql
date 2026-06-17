-- Affiliate Deal Import Engine V1
-- Additive marketplace import tables for admin-managed affiliate inventory.

CREATE TABLE IF NOT EXISTS public.affiliate_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL CHECK (network IN ('Impact', 'ShareASale', 'CJ', 'Awin', 'Rakuten', 'Local Merchant')),
  merchant_name text NOT NULL,
  merchant_logo text,
  merchant_description text,
  advertiser_id text,
  website_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'pending', 'archived')),
  external_id text,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.affiliate_merchants(id) ON DELETE CASCADE,
  promoted_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  partner_offer_id uuid REFERENCES public.partner_offers(id) ON DELETE SET NULL,
  merchant_name text NOT NULL,
  merchant_logo text,
  network text NOT NULL CHECK (network IN ('Impact', 'ShareASale', 'CJ', 'Awin', 'Rakuten', 'Local Merchant')),
  offer_title text NOT NULL,
  offer_description text,
  coupon_code text,
  discount_value text,
  category text,
  affiliate_url text NOT NULL,
  destination_url text,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'expired', 'rejected', 'unpublished')),
  source_file text,
  source_row_number integer,
  external_id text,
  duplicate_key text,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  click_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  claim_count integer NOT NULL DEFAULT 0,
  conversion_count integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unpublished_at timestamptz,
  unpublished_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL CHECK (network IN ('Impact', 'ShareASale', 'CJ', 'Awin', 'Rakuten', 'Local Merchant')),
  source_file text,
  status text NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed', 'publishing', 'published', 'failed', 'rolled_back')),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_rows integer NOT NULL DEFAULT 0,
  preview_rows integer NOT NULL DEFAULT 0,
  approved_rows integer NOT NULL DEFAULT 0,
  published_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_merchants_network_name_unique
  ON public.affiliate_merchants (network, lower(merchant_name));

CREATE INDEX IF NOT EXISTS idx_affiliate_merchants_status ON public.affiliate_merchants (status);
CREATE INDEX IF NOT EXISTS idx_affiliate_merchants_store ON public.affiliate_merchants (store_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_deals_merchant ON public.affiliate_deals (merchant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_deals_promoted_deal ON public.affiliate_deals (promoted_deal_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_deals_network_status ON public.affiliate_deals (network, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_deals_category ON public.affiliate_deals (category);
CREATE INDEX IF NOT EXISTS idx_affiliate_deals_end_date ON public.affiliate_deals (end_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_deals_duplicate_key ON public.affiliate_deals (duplicate_key);
CREATE INDEX IF NOT EXISTS idx_affiliate_import_logs_created_at ON public.affiliate_import_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_import_logs_network ON public.affiliate_import_logs (network);

CREATE OR REPLACE FUNCTION public.update_affiliate_import_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_affiliate_merchants_updated_at ON public.affiliate_merchants;
CREATE TRIGGER set_affiliate_merchants_updated_at
  BEFORE UPDATE ON public.affiliate_merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_import_updated_at();

DROP TRIGGER IF EXISTS set_affiliate_deals_updated_at ON public.affiliate_deals;
CREATE TRIGGER set_affiliate_deals_updated_at
  BEFORE UPDATE ON public.affiliate_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_import_updated_at();

ALTER TABLE public.affiliate_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage affiliate merchants" ON public.affiliate_merchants;
CREATE POLICY "Admins manage affiliate merchants"
  ON public.affiliate_merchants
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read active affiliate merchants" ON public.affiliate_merchants;
CREATE POLICY "Public can read active affiliate merchants"
  ON public.affiliate_merchants
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins manage affiliate deals" ON public.affiliate_deals;
CREATE POLICY "Admins manage affiliate deals"
  ON public.affiliate_deals
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage affiliate import logs" ON public.affiliate_import_logs;
CREATE POLICY "Admins manage affiliate import logs"
  ON public.affiliate_import_logs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.affiliate_merchants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_import_logs TO authenticated;
