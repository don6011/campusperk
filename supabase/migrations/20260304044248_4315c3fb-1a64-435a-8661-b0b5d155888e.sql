-- 1. Create campuses table
CREATE TABLE public.campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  country text NOT NULL DEFAULT 'US',
  domain text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campuses publicly readable"
  ON public.campuses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert campuses"
  ON public.campuses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage campuses"
  ON public.campuses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for search
CREATE INDEX idx_campuses_name_lower ON public.campuses (lower(name));
CREATE INDEX idx_campuses_status ON public.campuses (status);

-- 2. Add new columns to waitlist_signups
ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES public.campuses(id),
  ADD COLUMN IF NOT EXISTS campus_text text,
  ADD COLUMN IF NOT EXISTS email_type text NOT NULL DEFAULT 'other';