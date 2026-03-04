CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  campus_name text,
  referral_source text,
  position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read waitlist" ON public.waitlist
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage waitlist" ON public.waitlist
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_waitlist_position(p_email text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT count(*)::integer
  FROM public.waitlist
  WHERE created_at <= (SELECT created_at FROM public.waitlist WHERE email = p_email LIMIT 1);
$$;