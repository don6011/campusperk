
-- Create paywall_views table for tracking upgrade intent
CREATE TABLE public.paywall_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  deal_id uuid NOT NULL,
  source_page text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paywall_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even anon for tracking)
CREATE POLICY "Anyone can insert paywall views"
ON public.paywall_views FOR INSERT
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read paywall views"
ON public.paywall_views FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can read own
CREATE POLICY "Users can read own paywall views"
ON public.paywall_views FOR SELECT
USING (auth.uid() = user_id);
