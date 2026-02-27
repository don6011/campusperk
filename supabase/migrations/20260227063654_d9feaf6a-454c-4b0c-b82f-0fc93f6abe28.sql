
-- Affiliate Sources: tracks configured affiliate networks
CREATE TABLE public.affiliate_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network_name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_secret_name TEXT,
  feed_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage affiliate sources"
  ON public.affiliate_sources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Affiliate Raw Deals: stores unprocessed data from feeds/APIs
CREATE TABLE public.affiliate_raw_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.affiliate_sources(id) ON DELETE CASCADE,
  network_name TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  category TEXT,
  affiliate_url TEXT,
  image_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(network_name, external_id)
);

ALTER TABLE public.affiliate_raw_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage raw deals"
  ON public.affiliate_raw_deals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_raw_deals_source ON public.affiliate_raw_deals(source_id);
CREATE INDEX idx_raw_deals_network_ext ON public.affiliate_raw_deals(network_name, external_id);

-- Normalized Deals: cleaned/mapped data ready for promotion to main deals
CREATE TABLE public.normalized_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_deal_id UUID REFERENCES public.affiliate_raw_deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  description TEXT,
  affiliate_url TEXT,
  image_url TEXT,
  source_network TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  promoted_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.normalized_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage normalized deals"
  ON public.normalized_deals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_normalized_source ON public.normalized_deals(source_network);
CREATE INDEX idx_normalized_verified ON public.normalized_deals(verified);

-- Update trigger for affiliate_sources
CREATE TRIGGER update_affiliate_sources_updated_at
  BEFORE UPDATE ON public.affiliate_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for normalized_deals
CREATE TRIGGER update_normalized_deals_updated_at
  BEFORE UPDATE ON public.normalized_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
