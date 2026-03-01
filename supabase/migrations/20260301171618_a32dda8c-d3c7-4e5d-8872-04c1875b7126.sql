
-- Table: deal_redemptions (tracks each deal click as a savings event)
CREATE TABLE public.deal_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  campus_id uuid NOT NULL REFERENCES public.campus_domains(id),
  savings_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own redemptions"
  ON public.deal_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own redemptions"
  ON public.deal_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage redemptions"
  ON public.deal_redemptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_deal_redemptions_campus_created ON public.deal_redemptions (campus_id, created_at);
CREATE INDEX idx_deal_redemptions_user ON public.deal_redemptions (user_id);

-- Table: campus_savings (weekly aggregated savings per campus)
CREATE TABLE public.campus_savings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id uuid NOT NULL REFERENCES public.campus_domains(id),
  total_savings numeric NOT NULL DEFAULT 0,
  week_start timestamp with time zone NOT NULL,
  week_end timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campus_id, week_start)
);

ALTER TABLE public.campus_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campus savings publicly readable"
  ON public.campus_savings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage campus savings"
  ON public.campus_savings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service/edge functions to upsert savings
CREATE POLICY "Anyone can insert campus savings"
  ON public.campus_savings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update campus savings"
  ON public.campus_savings FOR UPDATE
  USING (true);

CREATE INDEX idx_campus_savings_week ON public.campus_savings (week_start, total_savings DESC);
