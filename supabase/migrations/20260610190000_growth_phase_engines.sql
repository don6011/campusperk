-- CampusPerk V1 growth systems: founding members, ambassador rewards, merchant onboarding.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_member_since timestamptz,
  ADD COLUMN IF NOT EXISTS founding_member_source text,
  ADD COLUMN IF NOT EXISTS founding_member_number integer;

ALTER TABLE public.ambassador_applications
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS referral_goal integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.ambassadors
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS reward_balance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_referral_goal integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS merchant_lead_goal integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS founding_conversion_goal integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS ambassador_id uuid,
  ADD COLUMN IF NOT EXISTS source_path text,
  ADD COLUMN IF NOT EXISTS conversion_event text NOT NULL DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS premium_converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS founding_converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reward_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.founding_member_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  name text,
  campus text,
  referral_code text,
  status text NOT NULL DEFAULT 'reserved',
  price_cents integer NOT NULL DEFAULT 1900,
  source text NOT NULL DEFAULT 'founding_members_page',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founding_member_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own founding reservations" ON public.founding_member_reservations;
CREATE POLICY "Users can view own founding reservations"
  ON public.founding_member_reservations FOR SELECT
  USING (auth.uid() = user_id OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "Anyone can reserve founding membership" ON public.founding_member_reservations;
CREATE POLICY "Anyone can reserve founding membership"
  ON public.founding_member_reservations FOR INSERT
  WITH CHECK (
    length(email) BETWEEN 5 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(coalesce(name, '')) <= 160
    AND length(coalesce(campus, '')) <= 200
    AND length(coalesce(referral_code, '')) <= 100
  );

DROP POLICY IF EXISTS "Admins can manage founding reservations" ON public.founding_member_reservations;
CREATE POLICY "Admins can manage founding reservations"
  ON public.founding_member_reservations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_founding_reservations_email ON public.founding_member_reservations (lower(email));
CREATE INDEX IF NOT EXISTS idx_founding_reservations_status ON public.founding_member_reservations (status);
CREATE INDEX IF NOT EXISTS idx_founding_reservations_referral_code ON public.founding_member_reservations (referral_code);
GRANT SELECT, INSERT ON public.founding_member_reservations TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.ambassador_reward_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward_key text NOT NULL,
  reward_label text NOT NULL,
  threshold_type text NOT NULL,
  threshold_value integer NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unlocked',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ambassador_id, reward_key)
);

ALTER TABLE public.ambassador_reward_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ambassadors can view own reward unlocks" ON public.ambassador_reward_unlocks;
CREATE POLICY "Ambassadors can view own reward unlocks"
  ON public.ambassador_reward_unlocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage ambassador reward unlocks" ON public.ambassador_reward_unlocks;
CREATE POLICY "Admins can manage ambassador reward unlocks"
  ON public.ambassador_reward_unlocks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT ON public.ambassador_reward_unlocks TO authenticated;

CREATE TABLE IF NOT EXISTS public.merchant_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text,
  contact_email text NOT NULL,
  contact_phone text,
  website_url text,
  city text,
  state text,
  category text,
  offer_title text NOT NULL,
  offer_description text,
  discount_value text,
  redemption_instructions text,
  expires_at timestamptz,
  sponsored_interest boolean NOT NULL DEFAULT false,
  monthly_budget_cents integer,
  campus_target text,
  proof_url text,
  referral_code text,
  source text NOT NULL DEFAULT 'merchant_portal',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  approved_partner_id uuid,
  approved_offer_id uuid,
  submitted_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit merchant deals" ON public.merchant_submissions;
CREATE POLICY "Anyone can submit merchant deals"
  ON public.merchant_submissions FOR INSERT
  WITH CHECK (
    length(business_name) BETWEEN 2 AND 200
    AND length(contact_email) BETWEEN 5 AND 320
    AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(offer_title) BETWEEN 2 AND 200
  );

DROP POLICY IF EXISTS "Users can view own merchant submissions" ON public.merchant_submissions;
CREATE POLICY "Users can view own merchant submissions"
  ON public.merchant_submissions FOR SELECT
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Admins can manage merchant submissions" ON public.merchant_submissions;
CREATE POLICY "Admins can manage merchant submissions"
  ON public.merchant_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_merchant_submissions_status ON public.merchant_submissions (status);
CREATE INDEX IF NOT EXISTS idx_merchant_submissions_created_at ON public.merchant_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_submissions_referral_code ON public.merchant_submissions (referral_code);
GRANT SELECT, INSERT ON public.merchant_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.merchant_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.create_founding_member_reservation(
  p_email text,
  p_name text DEFAULT NULL,
  p_campus text DEFAULT NULL,
  p_referral_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  INSERT INTO public.founding_member_reservations (
    user_id, email, name, campus, referral_code
  )
  VALUES (
    v_uid,
    lower(trim(p_email)),
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_campus, '')), ''),
    nullif(left(trim(coalesce(p_referral_code, '')), 100), '')
  )
  RETURNING id INTO v_id;

  IF p_referral_code IS NOT NULL AND length(trim(p_referral_code)) >= 4 THEN
    INSERT INTO public.referrals (
      referral_code,
      referred_user_id,
      verified,
      conversion_event,
      founding_converted_at,
      reward_status
    )
    VALUES (
      left(trim(p_referral_code), 100),
      v_uid,
      v_uid IS NOT NULL,
      'founding_reservation',
      now(),
      'pending'
    );
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_founding_member_reservation(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_merchant_deal(
  p_business_name text,
  p_contact_email text,
  p_offer_title text,
  p_contact_name text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_offer_description text DEFAULT NULL,
  p_discount_value text DEFAULT NULL,
  p_redemption_instructions text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_sponsored_interest boolean DEFAULT false,
  p_monthly_budget_cents integer DEFAULT NULL,
  p_campus_target text DEFAULT NULL,
  p_proof_url text DEFAULT NULL,
  p_referral_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.merchant_submissions (
    business_name, contact_name, contact_email, contact_phone, website_url,
    city, state, category, offer_title, offer_description, discount_value,
    redemption_instructions, expires_at, sponsored_interest, monthly_budget_cents,
    campus_target, proof_url, referral_code, submitted_by
  )
  VALUES (
    trim(p_business_name),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    lower(trim(p_contact_email)),
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    nullif(trim(coalesce(p_website_url, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
    trim(p_offer_title),
    nullif(trim(coalesce(p_offer_description, '')), ''),
    nullif(trim(coalesce(p_discount_value, '')), ''),
    nullif(trim(coalesce(p_redemption_instructions, '')), ''),
    p_expires_at,
    coalesce(p_sponsored_interest, false),
    p_monthly_budget_cents,
    nullif(trim(coalesce(p_campus_target, '')), ''),
    nullif(trim(coalesce(p_proof_url, '')), ''),
    nullif(left(trim(coalesce(p_referral_code, '')), 100), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  IF p_referral_code IS NOT NULL AND length(trim(p_referral_code)) >= 4 THEN
    INSERT INTO public.referrals (
      referral_code,
      referred_user_id,
      verified,
      conversion_event,
      reward_status
    )
    VALUES (
      left(trim(p_referral_code), 100),
      auth.uid(),
      auth.uid() IS NOT NULL,
      'merchant_lead',
      'pending'
    );
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_merchant_deal(
  text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, boolean, integer, text, text, text
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_ambassador_referral(
  p_referral_code text,
  p_referred_user_id uuid DEFAULT NULL,
  p_event text DEFAULT 'signup',
  p_source_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_code text := left(trim(coalesce(p_referral_code, '')), 100);
  v_ambassador_id uuid;
BEGIN
  IF length(v_code) < 4 THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  SELECT id INTO v_ambassador_id
  FROM public.ambassadors
  WHERE referral_code = v_code
  LIMIT 1;

  INSERT INTO public.referrals (
    referral_code,
    ambassador_id,
    referred_user_id,
    verified,
    conversion_event,
    source_path,
    reward_status
  )
  VALUES (
    v_code,
    v_ambassador_id,
    coalesce(p_referred_user_id, auth.uid()),
    coalesce(p_referred_user_id, auth.uid()) IS NOT NULL,
    left(coalesce(p_event, 'signup'), 80),
    left(coalesce(p_source_path, ''), 300),
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ambassador_referral(text, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_ambassador_rewards(p_ambassador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amb public.ambassadors%ROWTYPE;
  v_verified integer;
  v_merchants integer;
  v_founders integer;
BEGIN
  SELECT * INTO v_amb FROM public.ambassadors WHERE id = p_ambassador_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF auth.uid() <> v_amb.user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT count(*) INTO v_verified
  FROM public.referrals
  WHERE referral_code = v_amb.referral_code AND verified = true;

  SELECT count(*) INTO v_merchants
  FROM public.merchant_submissions
  WHERE referral_code = v_amb.referral_code;

  SELECT count(*) INTO v_founders
  FROM public.founding_member_reservations
  WHERE referral_code = v_amb.referral_code;

  IF v_verified >= 3 THEN
    INSERT INTO public.ambassador_reward_unlocks (ambassador_id, user_id, reward_key, reward_label, threshold_type, threshold_value, current_value)
    VALUES (v_amb.id, v_amb.user_id, 'verified_3', '3 verified signups: Founding badge boost', 'verified_referrals', 3, v_verified)
    ON CONFLICT (ambassador_id, reward_key) DO UPDATE SET current_value = excluded.current_value;
  END IF;

  IF v_verified >= 10 THEN
    INSERT INTO public.ambassador_reward_unlocks (ambassador_id, user_id, reward_key, reward_label, threshold_type, threshold_value, current_value)
    VALUES (v_amb.id, v_amb.user_id, 'verified_10', '10 verified signups: premium extension', 'verified_referrals', 10, v_verified)
    ON CONFLICT (ambassador_id, reward_key) DO UPDATE SET current_value = excluded.current_value;
  END IF;

  IF v_merchants >= 3 THEN
    INSERT INTO public.ambassador_reward_unlocks (ambassador_id, user_id, reward_key, reward_label, threshold_type, threshold_value, current_value)
    VALUES (v_amb.id, v_amb.user_id, 'merchant_3', '3 merchant leads: sponsored placement bonus', 'merchant_leads', 3, v_merchants)
    ON CONFLICT (ambassador_id, reward_key) DO UPDATE SET current_value = excluded.current_value;
  END IF;

  IF v_founders >= 3 THEN
    INSERT INTO public.ambassador_reward_unlocks (ambassador_id, user_id, reward_key, reward_label, threshold_type, threshold_value, current_value)
    VALUES (v_amb.id, v_amb.user_id, 'founder_3', '3 founding reservations: cash reward review', 'founding_reservations', 3, v_founders)
    ON CONFLICT (ambassador_id, reward_key) DO UPDATE SET current_value = excluded.current_value;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_ambassador_rewards(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_merchant_submission(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.merchant_submissions%ROWTYPE;
  v_partner_id uuid;
  v_offer_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_sub
  FROM public.merchant_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  INSERT INTO public.partners (
    partner_name,
    partner_type,
    website_url,
    contact_email,
    status
  )
  VALUES (
    v_sub.business_name,
    'local_business',
    v_sub.website_url,
    v_sub.contact_email,
    'active'
  )
  RETURNING id INTO v_partner_id;

  INSERT INTO public.partner_offers (
    partner_id,
    offer_title,
    offer_description,
    discount_value,
    deal_type,
    end_at,
    redemption_instructions,
    sponsored,
    sponsor_tier,
    sponsor_notes,
    status
  )
  VALUES (
    v_partner_id,
    v_sub.offer_title,
    v_sub.offer_description,
    v_sub.discount_value,
    'percentage',
    v_sub.expires_at,
    v_sub.redemption_instructions,
    v_sub.sponsored_interest,
    CASE WHEN v_sub.sponsored_interest THEN 1 ELSE NULL END,
    CASE
      WHEN v_sub.sponsored_interest THEN concat('Merchant requested sponsored placement. Budget cents: ', coalesce(v_sub.monthly_budget_cents::text, 'not provided'))
      ELSE NULL
    END,
    'pending'
  )
  RETURNING id INTO v_offer_id;

  IF v_sub.city IS NOT NULL OR v_sub.state IS NOT NULL THEN
    INSERT INTO public.partner_locations (
      partner_id,
      location_name,
      city,
      state,
      radius_miles,
      is_active
    )
    VALUES (
      v_partner_id,
      'Primary location',
      v_sub.city,
      v_sub.state,
      10,
      true
    );
  END IF;

  UPDATE public.merchant_submissions
  SET status = 'approved',
      approved_partner_id = v_partner_id,
      approved_offer_id = v_offer_id,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object('partner_id', v_partner_id, 'offer_id', v_offer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_merchant_submission(uuid) TO authenticated;
