
-- Create affiliate_clicks table for click tracking
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid DEFAULT NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_hint text DEFAULT NULL,
  device_type text DEFAULT NULL,
  referrer text DEFAULT NULL,
  country text DEFAULT NULL,
  is_verified_student boolean DEFAULT false,
  is_premium_user boolean DEFAULT false,
  flagged boolean DEFAULT false,
  flag_reason text DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Anon/authenticated can insert clicks (public action)
CREATE POLICY "Anyone can insert clicks"
ON public.affiliate_clicks FOR INSERT
WITH CHECK (true);

-- Users can view own clicks
CREATE POLICY "Users can view own clicks"
ON public.affiliate_clicks FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all clicks
CREATE POLICY "Admins can manage clicks"
ON public.affiliate_clicks FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create affiliate_conversions table (skeleton for Phase B)
CREATE TYPE public.conversion_status AS ENUM ('pending', 'confirmed', 'paid');

CREATE TABLE public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  network text DEFAULT NULL,
  order_value numeric DEFAULT NULL,
  commission_earned numeric DEFAULT NULL,
  conversion_date timestamp with time zone DEFAULT now(),
  status conversion_status NOT NULL DEFAULT 'pending',
  notes text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage conversions"
ON public.affiliate_conversions FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_affiliate_clicks_deal_id ON public.affiliate_clicks(deal_id);
CREATE INDEX idx_affiliate_clicks_user_id ON public.affiliate_clicks(user_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON public.affiliate_clicks(clicked_at DESC);
CREATE INDEX idx_affiliate_conversions_deal_id ON public.affiliate_conversions(deal_id);
