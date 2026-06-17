-- Campus assignment hardening: use campus_id as the canonical identity source.

CREATE OR REPLACE FUNCTION public.campus_slugify(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(
    trim(
      both '-' from regexp_replace(
        regexp_replace(lower(coalesce(p_value, '')), '&', ' and ', 'g'),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION public.canonical_campus_slug(
  p_domain_root text,
  p_campus_name text DEFAULT NULL
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_domain_root, '')) = 'uagc.edu'
      OR lower(coalesce(p_campus_name, '')) LIKE '%university of arizona global campus%' THEN 'uagc'
    WHEN lower(coalesce(p_domain_root, '')) = 'asu.edu'
      OR lower(coalesce(p_campus_name, '')) LIKE '%arizona state%' THEN 'arizona-state'
    WHEN lower(coalesce(p_domain_root, '')) = 'olemiss.edu'
      OR lower(coalesce(p_campus_name, '')) LIKE '%ole miss%'
      OR lower(coalesce(p_campus_name, '')) LIKE '%university of mississippi%' THEN 'ole-miss'
    WHEN lower(coalesce(p_domain_root, '')) = 'nau.edu'
      OR lower(coalesce(p_campus_name, '')) LIKE '%northern arizona%' THEN 'northern-arizona'
    ELSE coalesce(
      public.campus_slugify(nullif(p_campus_name, '')),
      public.campus_slugify(regexp_replace(coalesce(p_domain_root, ''), '\.edu$', '', 'i'))
    )
  END
$$;

ALTER TABLE public.campus_domains
  ADD COLUMN IF NOT EXISTS campus_slug text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS campus_slug text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

UPDATE public.campus_domains
SET campus_slug = public.canonical_campus_slug(domain_root, campus_name)
WHERE campus_slug IS NULL OR trim(campus_slug) = '';

WITH ranked AS (
  SELECT
    id,
    campus_slug,
    row_number() OVER (PARTITION BY campus_slug ORDER BY created_at, id) AS rn
  FROM public.campus_domains
  WHERE campus_slug IS NOT NULL
)
UPDATE public.campus_domains cd
SET campus_slug = ranked.campus_slug || '-' || ranked.rn
FROM ranked
WHERE cd.id = ranked.id
  AND ranked.rn > 1;

UPDATE public.profiles p
SET campus_slug = cd.campus_slug,
    campus_name = coalesce(p.campus_name, cd.campus_name),
    campus_domain = coalesce(p.campus_domain, cd.domain_root),
    campus_city = coalesce(p.campus_city, cd.city),
    campus_state = coalesce(p.campus_state, cd.state, cd.state_code),
    verification_status = CASE
      WHEN p.campus_verified THEN 'verified'
      WHEN p.campus_role_status = 'pending' THEN 'pending'
      WHEN p.campus_role_status = 'rejected' THEN 'rejected'
      ELSE p.verification_status
    END,
    verified_at = CASE WHEN p.campus_verified AND p.verified_at IS NULL THEN p.updated_at ELSE p.verified_at END
FROM public.campus_domains cd
WHERE p.campus_id = cd.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campus_domains_campus_slug_key'
      AND conrelid = 'public.campus_domains'::regclass
  ) THEN
    ALTER TABLE public.campus_domains
      ADD CONSTRAINT campus_domains_campus_slug_key UNIQUE (campus_slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_campus_id ON public.profiles(campus_id);
CREATE INDEX IF NOT EXISTS idx_profiles_campus_slug ON public.profiles(campus_slug);
CREATE INDEX IF NOT EXISTS idx_campus_domains_campus_slug ON public.campus_domains(campus_slug);

CREATE OR REPLACE FUNCTION public.assign_user_campus(
  p_target_user_id uuid DEFAULT NULL,
  p_campus_id uuid DEFAULT NULL,
  p_role public.campus_role DEFAULT 'student',
  p_admin_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_is_admin boolean := false;
  v_target uuid;
  v_email text;
  v_domain text;
  v_domain_count integer := 0;
  v_campus public.campus_domains%ROWTYPE;
  v_slug text;
  v_verified boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('status', 'auth_required');
  END IF;

  v_is_admin := public.has_role(v_actor, 'admin');
  v_target := coalesce(p_target_user_id, v_actor);

  IF v_target <> v_actor AND NOT v_is_admin THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  IF (p_admin_override OR (p_target_user_id IS NOT NULL AND p_target_user_id <> v_actor))
    AND NOT v_is_admin THEN
    RETURN jsonb_build_object('status', 'admin_required');
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_target;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'user_not_found');
  END IF;

  v_domain := public.normalize_campus_domain(coalesce(v_email, ''));
  v_verified := v_domain <> '' AND right(v_domain, 4) = '.edu';

  IF p_campus_id IS NOT NULL THEN
    SELECT * INTO v_campus
    FROM public.campus_domains
    WHERE id = p_campus_id
      AND is_blocked = false;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'campus_not_found');
    END IF;

    IF NOT v_is_admin AND lower(v_campus.domain_root) <> lower(v_domain) THEN
      RETURN jsonb_build_object(
        'status', 'campus_domain_mismatch',
        'expected_domain', v_domain,
        'campus_domain', v_campus.domain_root,
        'browse_only', true
      );
    END IF;
  ELSE
    IF v_domain = '' THEN
      RETURN jsonb_build_object('status', 'no_verified_domain');
    END IF;

    SELECT count(*) INTO v_domain_count
    FROM public.campus_domains
    WHERE lower(domain_root) = lower(v_domain)
      AND is_blocked = false;

    IF v_domain_count > 1 THEN
      RETURN jsonb_build_object('status', 'campus_conflict', 'domain', v_domain);
    END IF;

    SELECT * INTO v_campus
    FROM public.campus_domains
    WHERE lower(domain_root) = lower(v_domain)
      AND is_blocked = false
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.campus_domains (
        domain_root,
        campus_name,
        campus_slug,
        is_approved,
        verification_confidence
      )
      VALUES (
        lower(v_domain),
        NULL,
        public.canonical_campus_slug(lower(v_domain), NULL),
        v_verified,
        CASE WHEN v_verified THEN 70 ELSE 30 END
      )
      RETURNING * INTO v_campus;
    END IF;
  END IF;

  v_slug := coalesce(v_campus.campus_slug, public.canonical_campus_slug(v_campus.domain_root, v_campus.campus_name));

  UPDATE public.campus_domains
  SET campus_slug = v_slug,
      updated_at = now()
  WHERE id = v_campus.id
    AND (campus_slug IS NULL OR campus_slug <> v_slug);

  UPDATE public.profiles
  SET campus_id = v_campus.id,
      campus_name = coalesce(v_campus.campus_name, v_campus.domain_root),
      campus_domain = v_campus.domain_root,
      campus_slug = v_slug,
      campus_city = v_campus.city,
      campus_state = coalesce(v_campus.state, v_campus.state_code),
      campus_role = coalesce(p_role, campus_role, 'student'::public.campus_role),
      campus_role_status = CASE WHEN v_verified OR v_is_admin THEN 'verified'::public.campus_role_status ELSE campus_role_status END,
      campus_verified = CASE WHEN v_verified OR v_is_admin THEN true ELSE campus_verified END,
      campus_verification_method = CASE
        WHEN v_is_admin THEN 'manual_admin'::public.campus_verification_method
        WHEN v_verified THEN 'edu_email'::public.campus_verification_method
        ELSE campus_verification_method
      END,
      student_verified = CASE WHEN (v_verified OR v_is_admin) AND coalesce(p_role, campus_role, 'student'::public.campus_role) = 'student' THEN true ELSE student_verified END,
      verification_status = CASE WHEN v_verified OR v_is_admin THEN 'verified' ELSE verification_status END,
      verified_at = CASE WHEN v_verified OR v_is_admin THEN coalesce(verified_at, now()) ELSE verified_at END,
      updated_at = now()
  WHERE id = v_target;

  RETURN jsonb_build_object(
    'status', 'assigned',
    'campus_id', v_campus.id,
    'campus_slug', v_slug,
    'campus_name', coalesce(v_campus.campus_name, v_campus.domain_root),
    'campus_domain', v_campus.domain_root
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_campus(uuid, uuid, public.campus_role, boolean) TO authenticated;

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
  v_assignment jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
  v_domain := public.normalize_campus_domain(coalesce(v_email, ''));

  IF p_role = 'student' AND (v_domain = '' OR right(v_domain, 4) <> '.edu') THEN
    RAISE EXCEPTION 'edu_email_required';
  END IF;

  IF lower(coalesce(p_domain_root, '')) <> lower(v_domain) THEN
    RAISE EXCEPTION 'domain_mismatch';
  END IF;

  v_assignment := public.assign_user_campus(v_uid, NULL, p_role, false);
  IF coalesce(v_assignment->>'status', '') <> 'assigned' THEN
    RAISE EXCEPTION 'campus_assignment_failed:%', coalesce(v_assignment->>'status', 'unknown');
  END IF;

  UPDATE public.profiles
  SET verification_strength_score = greatest(0, least(coalesce(p_score, 0), 100)),
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
    'Automatic campus verification and campus assignment',
    'verification_approved',
    p_role,
    'verified',
    'edu_email'
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
  v_assignment jsonb;
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

  IF p_approve THEN
    v_assignment := public.assign_user_campus(v_req.user_id, NULL, v_req.campus_role_requested, true);
    IF coalesce(v_assignment->>'status', '') <> 'assigned' THEN
      RAISE EXCEPTION 'campus_assignment_failed:%', coalesce(v_assignment->>'status', 'unknown');
    END IF;
  ELSE
    UPDATE public.profiles
    SET campus_role = v_req.campus_role_requested,
        campus_role_status = v_status,
        campus_verified = false,
        verification_status = 'rejected',
        updated_at = now()
    WHERE id = v_req.user_id;
  END IF;

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
