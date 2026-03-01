
-- Campus points log: tracks individual point-earning actions
CREATE TABLE public.campus_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id uuid NOT NULL REFERENCES public.campus_domains(id),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'signup', 'deal_redeemed', 'referral', 'deal_submission', 'partner_added'
  points integer NOT NULL,
  week_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast leaderboard queries
CREATE INDEX idx_campus_points_week ON public.campus_points (week_start, campus_id);
CREATE INDEX idx_campus_points_user ON public.campus_points (user_id);

-- Enable RLS
ALTER TABLE public.campus_points ENABLE ROW LEVEL SECURITY;

-- Users can view all campus points (leaderboard is public)
CREATE POLICY "Campus points publicly readable"
  ON public.campus_points FOR SELECT
  USING (true);

-- Authenticated users can insert their own points
CREATE POLICY "Users can insert own campus points"
  ON public.campus_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage campus points"
  ON public.campus_points FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
