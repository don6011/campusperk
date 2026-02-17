
-- Track verification attempts to prevent abuse
CREATE TABLE public.verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_domain text NOT NULL,
  user_id uuid,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  ip_hint text -- partial IP for pattern detection, not full IP
);

ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can read verification attempts
CREATE POLICY "Admins can manage verification_attempts"
  ON public.verification_attempts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own attempts
CREATE POLICY "Users can insert own attempts"
  ON public.verification_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for domain-based abuse queries
CREATE INDEX idx_verification_attempts_domain ON public.verification_attempts (email_domain, attempted_at DESC);
CREATE INDEX idx_verification_attempts_user ON public.verification_attempts (user_id, attempted_at DESC);

-- Function to check if a domain has too many recent signups (anti-abuse)
CREATE OR REPLACE FUNCTION public.check_domain_abuse(p_domain text, p_window_hours int DEFAULT 24, p_max_accounts int DEFAULT 3)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) >= p_max_accounts
  FROM public.verification_attempts
  WHERE email_domain = p_domain
    AND success = true
    AND attempted_at > now() - (p_window_hours || ' hours')::interval;
$$;

-- Function to check if a user has too many recent attempts (rate limiting)
CREATE OR REPLACE FUNCTION public.check_verification_rate_limit(p_user_id uuid, p_max_attempts int DEFAULT 5, p_window_hours int DEFAULT 1)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) >= p_max_attempts
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND attempted_at > now() - (p_window_hours || ' hours')::interval;
$$;
