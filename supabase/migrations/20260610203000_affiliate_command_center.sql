-- CampusPerk V1.1 Affiliate Command Center.

CREATE TABLE IF NOT EXISTS public.affiliate_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_key text NOT NULL UNIQUE,
  network_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  api_connected boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_networks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage affiliate networks" ON public.affiliate_networks;
CREATE POLICY "Admins can manage affiliate networks"
  ON public.affiliate_networks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated admins can read affiliate networks" ON public.affiliate_networks;
CREATE POLICY "Authenticated admins can read affiliate networks"
  ON public.affiliate_networks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_networks TO authenticated;

INSERT INTO public.affiliate_networks (network_key, network_name, status, api_connected)
VALUES
  ('cj', 'CJ', 'active', false),
  ('impact', 'Impact', 'active', false),
  ('awin', 'Awin', 'active', false),
  ('rakuten', 'Rakuten', 'active', false),
  ('shareasale', 'ShareASale', 'active', false),
  ('local_merchant', 'Local Merchant', 'active', false)
ON CONFLICT (network_key) DO UPDATE SET
  network_name = excluded.network_name,
  updated_at = now();

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS affiliate_network_id uuid REFERENCES public.affiliate_networks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_network text,
  ADD COLUMN IF NOT EXISTS advertiser_id text,
  ADD COLUMN IF NOT EXISTS commission_percent numeric(6,2),
  ADD COLUMN IF NOT EXISTS cookie_duration_days integer,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_deals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_deals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_merchant boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_partners_affiliate_network ON public.partners (affiliate_network);
CREATE INDEX IF NOT EXISTS idx_partners_affiliate_network_id ON public.partners (affiliate_network_id);
CREATE INDEX IF NOT EXISTS idx_partners_approval_status ON public.partners (approval_status);
CREATE INDEX IF NOT EXISTS idx_partners_featured_merchant ON public.partners (featured_merchant) WHERE featured_merchant = true;

CREATE TABLE IF NOT EXISTS public.affiliate_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid REFERENCES public.affiliate_networks(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.affiliate_sources(id) ON DELETE SET NULL,
  network text,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  new_deals_imported integer NOT NULL DEFAULT 0,
  failed_imports integer NOT NULL DEFAULT 0,
  duplicate_deals integer NOT NULL DEFAULT 0,
  message text,
  raw_result jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage affiliate sync logs" ON public.affiliate_sync_logs;
CREATE POLICY "Admins can manage affiliate sync logs"
  ON public.affiliate_sync_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_affiliate_sync_logs_network ON public.affiliate_sync_logs (network);
CREATE INDEX IF NOT EXISTS idx_affiliate_sync_logs_created_at ON public.affiliate_sync_logs (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sync_logs TO authenticated;

CREATE TABLE IF NOT EXISTS public.affiliate_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  network text NOT NULL,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  conversion_date timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  campus_id uuid,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  conversion_id uuid REFERENCES public.affiliate_conversions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'confirmed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage affiliate revenue" ON public.affiliate_revenue;
CREATE POLICY "Admins can manage affiliate revenue"
  ON public.affiliate_revenue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_merchant ON public.affiliate_revenue (merchant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_network ON public.affiliate_revenue (network);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_conversion_date ON public.affiliate_revenue (conversion_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_user ON public.affiliate_revenue (user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_campus ON public.affiliate_revenue (campus_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_revenue TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_partner_deal_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  v_partner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.partner_id ELSE NEW.partner_id END;
  IF v_partner_id IS NULL THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  UPDATE public.partners p
  SET total_deals = counts.total_deals,
      active_deals = counts.active_deals,
      updated_at = now()
  FROM (
    SELECT
      partner_id,
      count(*)::integer AS total_deals,
      count(*) FILTER (WHERE status = 'active')::integer AS active_deals
    FROM public.deals
    WHERE partner_id IS NOT NULL
    GROUP BY partner_id
  ) counts
  WHERE p.id = counts.partner_id
    AND p.id = v_partner_id;

  UPDATE public.partners
  SET total_deals = 0,
      active_deals = 0,
      updated_at = now()
  WHERE id = v_partner_id
    AND NOT EXISTS (
      SELECT 1 FROM public.deals WHERE partner_id = v_partner_id
    );

  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_partner_deal_counts_after_deal_change ON public.deals;
CREATE TRIGGER sync_partner_deal_counts_after_deal_change
  AFTER INSERT OR UPDATE OF partner_id, status OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.sync_partner_deal_counts();
