
-- Ambassador applications table
CREATE TABLE public.ambassador_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  university TEXT NOT NULL,
  social_handle TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  motivation_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit ambassador applications"
  ON public.ambassador_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage ambassador applications"
  ON public.ambassador_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ambassadors table
CREATE TABLE public.ambassadors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ambassadors"
  ON public.ambassadors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own ambassador record"
  ON public.ambassadors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Ambassadors publicly readable"
  ON public.ambassadors FOR SELECT
  USING (true);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referred_user_id UUID,
  signup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage referrals"
  ON public.referrals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ambassadors can view own referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassadors
      WHERE ambassadors.referral_code = referrals.referral_code
        AND ambassadors.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_ambassador_applications_status ON public.ambassador_applications(status);
CREATE INDEX idx_ambassadors_referral_code ON public.ambassadors(referral_code);
CREATE INDEX idx_referrals_referral_code ON public.referrals(referral_code);
