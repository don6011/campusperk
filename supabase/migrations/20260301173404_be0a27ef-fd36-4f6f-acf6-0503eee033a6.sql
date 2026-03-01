
-- Create deal_claims table for tracking deal claim counts
CREATE TABLE public.deal_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES public.deals(id),
  campus_id UUID REFERENCES public.campus_domains(id),
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast count queries
CREATE INDEX idx_deal_claims_deal_id ON public.deal_claims(deal_id);
CREATE INDEX idx_deal_claims_deal_claimed ON public.deal_claims(deal_id, claimed_at DESC);
CREATE INDEX idx_deal_claims_campus ON public.deal_claims(deal_id, campus_id);

-- Enable RLS
ALTER TABLE public.deal_claims ENABLE ROW LEVEL SECURITY;

-- Anyone can insert claims (logged-in users)
CREATE POLICY "Users can insert own claims"
ON public.deal_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Claims are publicly readable (for counters)
CREATE POLICY "Claims are publicly readable"
ON public.deal_claims FOR SELECT
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage claims"
ON public.deal_claims FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
