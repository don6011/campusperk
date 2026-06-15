-- V1 critical security hardening.

-- 1) Profile permissions: trusted flags must not be user-editable.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own safe profile fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  name,
  has_seen_splash,
  user_city,
  user_state,
  user_state_code,
  location_opt_in,
  use_campus_location
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_student_verification(
  p_user_id uuid,
  p_verified boolean,
  p_reason text,
  p_method text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_previous boolean;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT student_verified INTO v_previous FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  UPDATE public.profiles
  SET student_verified = p_verified,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.verification_audit_log (
    user_id, admin_id, previous_status, new_status, verification_method, reason
  )
  VALUES (
    p_user_id, v_admin, coalesce(v_previous, false), p_verified,
    p_method::public.verification_method, p_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_premium_status(
  p_user_id uuid,
  p_premium boolean,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_previous boolean;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT premium_status INTO v_previous FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  UPDATE public.profiles
  SET premium_status = p_premium,
      updated_at = now()
  WHERE id = p_user_id;

  IF p_premium THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'premium_user')
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'premium_user';
  END IF;

  INSERT INTO public.verification_audit_log (
    user_id, admin_id, previous_status, new_status, verification_method, reason
  )
  VALUES (
    p_user_id, v_admin, coalesce(v_previous, false), p_premium,
    'manual', '[Premium] ' || p_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_verification_request(
  p_request_id uuid,
  p_approve boolean,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_req public.verification_requests%ROWTYPE;
  v_status public.campus_role_status;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT * INTO v_req FROM public.verification_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  v_status := CASE WHEN p_approve THEN 'verified'::public.campus_role_status ELSE 'rejected'::public.campus_role_status END;

  UPDATE public.verification_requests
  SET status = v_status,
      admin_id = v_admin,
      admin_decision_reason = p_reason,
      reviewed_at = now()
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET campus_role = v_req.campus_role_requested,
      campus_role_status = v_status,
      campus_domain = v_req.email_domain,
      campus_verified = p_approve,
      campus_verification_method = CASE WHEN p_approve THEN 'manual_admin'::public.campus_verification_method ELSE campus_verification_method END,
      student_verified = CASE WHEN p_approve AND v_req.campus_role_requested = 'student' THEN true ELSE student_verified END,
      updated_at = now()
  WHERE id = v_req.user_id;

  INSERT INTO public.verification_audit_log (
    user_id,
    admin_id,
    previous_status,
    new_status,
    verification_method,
    reason,
    action_type,
    new_role,
    new_campus_status,
    campus_verification_method
  )
  VALUES (
    v_req.user_id,
    v_admin,
    false,
    p_approve,
    'manual',
    p_reason,
    CASE WHEN p_approve THEN 'verification_approved' ELSE 'verification_rejected' END,
    v_req.campus_role_requested,
    v_status,
    CASE WHEN p_approve THEN 'manual_admin'::public.campus_verification_method ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.self_auto_verify_campus_role(
  p_role public.campus_role,
  p_domain_root text,
  p_score integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_domain text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
  v_domain := lower(split_part(coalesce(v_email, ''), '@', 2));

  IF p_role = 'student' AND (v_domain = '' OR right(v_domain, 4) <> '.edu') THEN
    RAISE EXCEPTION 'edu_email_required';
  END IF;

  UPDATE public.profiles
  SET campus_role = p_role,
      campus_role_status = 'verified',
      campus_verification_method = 'edu_email',
      campus_domain = lower(p_domain_root),
      campus_verified = true,
      student_verified = CASE WHEN p_role = 'student' THEN true ELSE student_verified END,
      verification_strength_score = greatest(0, least(coalesce(p_score, 0), 100)),
      updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.verification_audit_log (
    user_id,
    admin_id,
    previous_status,
    new_status,
    verification_method,
    reason,
    action_type,
    new_role,
    new_campus_status,
    campus_verification_method
  )
  VALUES (
    v_uid,
    v_uid,
    false,
    true,
    'edu',
    'Automatic campus verification',
    'verification_approved',
    p_role,
    'verified',
    'edu_email'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_campus_verification(
  p_role public.campus_role,
  p_domain_root text,
  p_proof_upload_urls text[] DEFAULT '{}',
  p_user_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_recent_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT count(*) INTO v_recent_count
  FROM public.verification_requests
  WHERE user_id = v_uid
    AND created_at > now() - interval '24 hours';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  UPDATE public.profiles
  SET campus_role = p_role,
      campus_role_status = 'pending',
      campus_domain = lower(p_domain_root),
      updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.verification_requests (
    user_id,
    campus_role_requested,
    email_domain,
    proof_upload_urls,
    user_message
  )
  VALUES (
    v_uid,
    p_role,
    lower(p_domain_root),
    coalesce(p_proof_upload_urls, '{}'),
    nullif(left(coalesce(p_user_message, ''), 2000), '')
  );

  INSERT INTO public.verification_audit_log (
    user_id,
    admin_id,
    previous_status,
    new_status,
    verification_method,
    reason,
    action_type,
    new_role,
    new_campus_status
  )
  VALUES (
    v_uid,
    v_uid,
    false,
    false,
    'manual',
    'User requested manual campus verification',
    'verification_requested',
    p_role,
    'pending'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_merge_campus_domain(
  p_source_domain text,
  p_target_domain text,
  p_source_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.profiles
  SET campus_domain = p_target_domain,
      updated_at = now()
  WHERE campus_domain = p_source_domain;

  DELETE FROM public.campus_domains
  WHERE id = p_source_id;
END;
$$;

-- 2) Protect affiliate/direct URLs from public table reads.
REVOKE SELECT ON public.deals FROM anon, authenticated;
GRANT SELECT (
  id,
  store_id,
  title,
  description,
  discount_type,
  discount_value,
  requires_edu_email,
  status,
  sponsored,
  featured,
  commission_rate,
  last_checked_at,
  ai_summary,
  expires_at,
  category,
  created_at,
  updated_at,
  visibility,
  premium_only,
  deal_scope,
  eligible_campuses,
  eligible_cities,
  eligible_regions,
  eligible_roles,
  requires_campus_verification,
  requires_role_verification,
  sponsor_tier,
  sponsor_priority,
  sponsor_start_at,
  sponsor_end_at,
  is_surprise_drop,
  drop_window,
  drop_time,
  partner_id,
  partner_offer_id,
  is_affiliate,
  affiliate_network,
  commission_type
) ON public.deals TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_deals()
RETURNS SETOF public.deals
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
  FROM public.deals d
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY d.created_at DESC;
$$;

-- 3) Harden and centralize outbound redirect authorization + click logging.
CREATE OR REPLACE FUNCTION public.get_deal_redirect(
  p_deal_id uuid,
  p_device_type text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_referral_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.deals%ROWTYPE;
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_store_name text;
  v_store_logo text;
  v_blocked text;
  v_active boolean;
BEGIN
  SELECT * INTO rec FROM public.deals WHERE id = p_deal_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT s.name, s.logo_url INTO v_store_name, v_store_logo
  FROM public.stores s
  WHERE s.id = rec.store_id;

  IF v_uid IS NOT NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  END IF;

  v_active := rec.status = 'active'
    AND (rec.expires_at IS NULL OR rec.expires_at > now());

  IF NOT v_active THEN
    v_blocked := 'unavailable';
  ELSIF (rec.visibility = 'premium' OR rec.premium_only = true)
    AND NOT coalesce(v_profile.premium_status, false)
    AND NOT coalesce(v_profile.is_founding_member, false) THEN
    v_blocked := 'premium_gated';
  ELSIF rec.requires_edu_email = true
    AND NOT coalesce(v_profile.student_verified, false) THEN
    v_blocked := 'verification_required';
  ELSIF rec.requires_campus_verification = true
    AND NOT (coalesce(v_profile.campus_verified, false) AND v_profile.campus_role_status = 'verified') THEN
    v_blocked := 'campus_verification_required';
  ELSIF rec.eligible_roles IS NOT NULL
    AND array_length(rec.eligible_roles, 1) > 0
    AND (v_profile.campus_role IS NULL OR NOT (v_profile.campus_role = ANY(rec.eligible_roles))) THEN
    v_blocked := 'role_not_eligible';
  ELSIF rec.deal_scope = 'local'
    AND rec.eligible_campuses IS NOT NULL
    AND array_length(rec.eligible_campuses, 1) > 0
    AND (v_profile.campus_id IS NULL OR NOT (v_profile.campus_id::text = ANY(rec.eligible_campuses))) THEN
    v_blocked := 'not_available_here';
  ELSIF rec.deal_scope = 'regional'
    AND rec.eligible_regions IS NOT NULL
    AND array_length(rec.eligible_regions, 1) > 0
    AND (
      coalesce(v_profile.campus_state, v_profile.user_state) IS NULL
      OR NOT (coalesce(v_profile.campus_state, v_profile.user_state) = ANY(rec.eligible_regions))
    ) THEN
    v_blocked := 'not_available_here';
  END IF;

  INSERT INTO public.affiliate_clicks (
    deal_id,
    user_id,
    device_type,
    referrer,
    is_verified_student,
    is_premium_user,
    campus_id,
    scope,
    referral_code,
    is_sponsored,
    blocked_reason
  )
  VALUES (
    rec.id,
    v_uid,
    left(coalesce(p_device_type, 'unknown'), 32),
    left(p_referrer, 500),
    coalesce(v_profile.student_verified, false),
    coalesce(v_profile.premium_status, false),
    v_profile.campus_id,
    rec.deal_scope::text,
    left(p_referral_code, 100),
    coalesce(rec.sponsored, false),
    v_blocked
  );

  IF v_blocked IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', rec.id,
      'title', rec.title,
      'status', rec.status,
      'visibility', rec.visibility,
      'sponsored', rec.sponsored,
      'deal_scope', rec.deal_scope,
      'blocked_reason', v_blocked,
      'store_name', v_store_name,
      'store_logo', v_store_logo
    );
  END IF;

  RETURN jsonb_build_object(
    'id', rec.id,
    'title', rec.title,
    'status', rec.status,
    'visibility', rec.visibility,
    'sponsored', rec.sponsored,
    'deal_scope', rec.deal_scope,
    'affiliate_link_url', rec.affiliate_link_url,
    'direct_link_url', rec.direct_link_url,
    'store_name', v_store_name,
    'store_logo', v_store_logo
  );
END;
$$;

-- 4) Restrict direct public writes and provide controlled RPCs where the UI needs logging.
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_clicks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.deal_clicks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.sponsored_clicks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.sponsored_impressions FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.campus_savings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.deal_claims FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "Anyone can insert deal clicks" ON public.deal_clicks;
DROP POLICY IF EXISTS "Anyone can insert sponsored clicks" ON public.sponsored_clicks;
DROP POLICY IF EXISTS "Anyone can insert sponsored impressions" ON public.sponsored_impressions;
DROP POLICY IF EXISTS "Anyone can insert campus savings" ON public.campus_savings;
DROP POLICY IF EXISTS "Anyone can update campus savings" ON public.campus_savings;
DROP POLICY IF EXISTS "Anyone can insert campuses" ON public.campuses;
DROP POLICY IF EXISTS "Users can insert own claims" ON public.deal_claims;
DROP POLICY IF EXISTS "Users can insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;

CREATE POLICY "Anyone can insert valid referrals"
  ON public.referrals
  FOR INSERT
  WITH CHECK (
    length(referral_code) BETWEEN 4 AND 100
    AND (referred_user_id IS NULL OR auth.uid() = referred_user_id)
  );

CREATE OR REPLACE FUNCTION public.check_user_rate_limit(
  p_table text,
  p_max integer,
  p_window interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN true;
  END IF;

  IF p_table = 'deal_claims' THEN
    SELECT count(*) INTO v_count FROM public.deal_claims WHERE user_id = v_uid AND claimed_at > now() - p_window;
  ELSIF p_table = 'submissions' THEN
    SELECT count(*) INTO v_count FROM public.submissions WHERE submitted_by = v_uid AND created_at > now() - p_window;
  ELSIF p_table = 'deal_clicks' THEN
    SELECT count(*) INTO v_count FROM public.deal_clicks WHERE user_id = v_uid AND clicked_at > now() - p_window;
  ELSE
    RETURN false;
  END IF;

  RETURN v_count >= p_max;
END;
$$;

CREATE POLICY "Users can insert rate-limited submissions"
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND NOT public.check_user_rate_limit('submissions', 10, interval '1 hour')
    AND length(store_name) BETWEEN 1 AND 120
    AND (deal_url IS NULL OR deal_url ~* '^https?://')
  );

CREATE OR REPLACE FUNCTION public.record_deal_claim(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_campus uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  IF public.check_user_rate_limit('deal_claims', 60, interval '1 hour') THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  SELECT campus_id INTO v_campus FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.deal_claims (user_id, deal_id, campus_id)
  VALUES (v_uid, p_deal_id, v_campus);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_deal_click(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_campus uuid;
BEGIN
  IF v_uid IS NOT NULL AND public.check_user_rate_limit('deal_clicks', 240, interval '1 hour') THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT campus_id INTO v_campus FROM public.profiles WHERE id = v_uid;
  END IF;

  INSERT INTO public.deal_clicks (user_id, deal_id, campus_id)
  VALUES (v_uid, p_deal_id, v_campus);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_sponsored_click(
  p_item_id uuid,
  p_item_type text DEFAULT 'deal',
  p_scope text DEFAULT NULL,
  p_sponsor_tier integer DEFAULT NULL,
  p_sponsor_priority integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  END IF;

  INSERT INTO public.sponsored_clicks (
    user_id, item_type, item_id, scope, campus_id, city, state,
    is_sponsored, sponsor_tier, sponsor_priority
  )
  VALUES (
    v_uid, left(coalesce(p_item_type, 'deal'), 30), p_item_id, left(p_scope, 30),
    v_profile.campus_id,
    coalesce(v_profile.campus_city, v_profile.user_city),
    coalesce(v_profile.campus_state, v_profile.user_state),
    true, p_sponsor_tier, p_sponsor_priority
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_sponsored_impressions(p_deal_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_deal_id uuid;
BEGIN
  IF array_length(p_deal_ids, 1) IS NULL OR array_length(p_deal_ids, 1) > 20 THEN
    RAISE EXCEPTION 'invalid_impression_batch';
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  END IF;

  FOREACH v_deal_id IN ARRAY p_deal_ids LOOP
    INSERT INTO public.sponsored_impressions (
      user_id, deal_id, item_type, scope, campus_id, city, state, is_verified, is_premium
    )
    SELECT
      v_uid, d.id, 'deal', d.deal_scope::text, v_profile.campus_id,
      coalesce(v_profile.campus_city, v_profile.user_city),
      coalesce(v_profile.campus_state, v_profile.user_state),
      coalesce(v_profile.campus_verified, false),
      coalesce(v_profile.premium_status, false)
    FROM public.deals d
    WHERE d.id = v_deal_id
      AND d.sponsored = true
      AND d.status = 'active'
      AND (d.sponsor_start_at IS NULL OR d.sponsor_start_at <= now())
      AND (d.sponsor_end_at IS NULL OR d.sponsor_end_at >= now());
  END LOOP;
END;
$$;

-- Basic validation on public waitlist writes; deeper abuse protection should live at edge/WAF.
DROP POLICY IF EXISTS "Anyone can insert waitlist" ON public.waitlist_signups;
CREATE POLICY "Anyone can insert valid waitlist signups"
  ON public.waitlist_signups
  FOR INSERT
  WITH CHECK (
    length(email_normalized) BETWEEN 5 AND 254
    AND email_normalized = lower(email_normalized)
    AND email_normalized ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(campus) BETWEEN 2 AND 160
    AND length(campus_slug) BETWEEN 2 AND 180
    AND (source IS NULL OR length(source) <= 80)
    AND (referred_by IS NULL OR length(referred_by) <= 100)
  );
