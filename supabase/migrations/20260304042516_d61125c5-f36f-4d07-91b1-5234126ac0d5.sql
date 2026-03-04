-- Drop old waitlist table if exists (from previous iteration)
DROP TABLE IF EXISTS public.waitlist;
DROP FUNCTION IF EXISTS public.get_waitlist_position(text);

-- Create waitlist_signups table
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL,
  campus text NOT NULL,
  campus_slug text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  referral_code text NOT NULL,
  referred_by text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_waitlist_email_normalized ON public.waitlist_signups (email_normalized);
CREATE UNIQUE INDEX idx_waitlist_referral_code ON public.waitlist_signups (referral_code);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert waitlist" ON public.waitlist_signups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read waitlist" ON public.waitlist_signups
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage waitlist" ON public.waitlist_signups
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create partner_inquiries table
CREATE TABLE public.partner_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  website text,
  deal_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert partner inquiries" ON public.partner_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage partner inquiries" ON public.partner_inquiries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));