-- CampusPerk V1 security validation fixtures.
-- Run this in the Supabase SQL Editor for project jttcpewdibbczdnutmme.
-- These records are deterministic and safe to re-run.

DO $$
DECLARE
  v_store_id uuid := '33333333-3333-4333-8333-333333333333';
  v_campus_id uuid := '11111111-1111-4111-8111-111111111111';
  v_test_user_id uuid := '22222222-2222-4222-8222-222222222222';
  v_premium_deal_id uuid := '44444444-4444-4444-8444-444444444444';
  v_campus_deal_id uuid := '55555555-5555-4555-8555-555555555555';
BEGIN
  INSERT INTO public.stores (
    id,
    name,
    logo_url,
    website_url,
    categories,
    student_discount_available
  )
  VALUES (
    v_store_id,
    'CampusPerk Security Test Store',
    NULL,
    'https://example.com',
    ARRAY['Security Test'],
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    logo_url = excluded.logo_url,
    website_url = excluded.website_url,
    categories = excluded.categories,
    student_discount_available = excluded.student_discount_available;

  INSERT INTO public.campus_domains (
    id,
    domain_root,
    campus_name,
    verification_confidence,
    is_approved,
    is_blocked
  )
  VALUES (
    v_campus_id,
    'security-fixture.edu',
    'CampusPerk Security Fixture University',
    100,
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    domain_root = excluded.domain_root,
    campus_name = excluded.campus_name,
    verification_confidence = excluded.verification_confidence,
    is_approved = excluded.is_approved,
    is_blocked = excluded.is_blocked,
    updated_at = now();

  INSERT INTO public.deals (
    id,
    store_id,
    title,
    description,
    discount_type,
    discount_value,
    affiliate_link_url,
    direct_link_url,
    requires_edu_email,
    status,
    sponsored,
    featured,
    expires_at,
    category,
    premium_only,
    visibility,
    deal_scope,
    eligible_campuses,
    eligible_regions,
    eligible_cities,
    requires_campus_verification,
    requires_role_verification,
    last_checked_at,
    updated_at
  )
  VALUES (
    v_premium_deal_id,
    v_store_id,
    'CampusPerk Security Premium Fixture',
    'Security validation fixture. Safe fake premium-only deal.',
    'percentage',
    '99% off',
    'https://example.com/campusperk-security-premium-affiliate',
    NULL,
    false,
    'active',
    false,
    false,
    now() + interval '30 days',
    'Security Test',
    true,
    'public',
    'national',
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    false,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    store_id = v_store_id,
    title = excluded.title,
    description = excluded.description,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    affiliate_link_url = 'https://example.com/campusperk-security-premium-affiliate',
    direct_link_url = NULL,
    status = 'active',
    expires_at = now() + interval '30 days',
    premium_only = true,
    visibility = 'public',
    deal_scope = 'national',
    eligible_campuses = ARRAY[]::text[],
    requires_edu_email = false,
    requires_campus_verification = false,
    requires_role_verification = false,
    last_checked_at = now(),
    updated_at = now();

  INSERT INTO public.deals (
    id,
    store_id,
    title,
    description,
    discount_type,
    discount_value,
    affiliate_link_url,
    direct_link_url,
    requires_edu_email,
    status,
    sponsored,
    featured,
    expires_at,
    category,
    premium_only,
    visibility,
    deal_scope,
    eligible_campuses,
    eligible_regions,
    eligible_cities,
    requires_campus_verification,
    requires_role_verification,
    last_checked_at,
    updated_at
  )
  VALUES (
    v_campus_deal_id,
    v_store_id,
    'CampusPerk Security Campus Fixture',
    'Security validation fixture. Safe fake local campus-restricted deal.',
    'percentage',
    '88% off',
    'https://example.com/campusperk-security-campus-affiliate',
    NULL,
    false,
    'active',
    false,
    false,
    now() + interval '30 days',
    'Security Test',
    false,
    'public',
    'local',
    ARRAY[v_campus_id::text],
    ARRAY[]::text[],
    ARRAY[]::text[],
    false,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    store_id = v_store_id,
    title = excluded.title,
    description = excluded.description,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    affiliate_link_url = 'https://example.com/campusperk-security-campus-affiliate',
    direct_link_url = NULL,
    status = 'active',
    expires_at = now() + interval '30 days',
    premium_only = false,
    visibility = 'public',
    deal_scope = 'local',
    eligible_campuses = ARRAY[v_campus_id::text],
    requires_edu_email = false,
    requires_campus_verification = false,
    requires_role_verification = false,
    last_checked_at = now(),
    updated_at = now();

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'campusperk.security.fixture@security-fixture.edu',
    crypt('CampusPerkAudit!2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"CampusPerk Security Fixture"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_test_user_id,
    v_test_user_id,
    v_test_user_id::text,
    jsonb_build_object(
      'sub', v_test_user_id::text,
      'email', 'campusperk.security.fixture@security-fixture.edu',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    name,
    email,
    student_verified,
    premium_status,
    campus_role_status,
    campus_verified,
    verification_strength_score,
    campus_id,
    campus_domain,
    campus_name,
    location_opt_in,
    use_campus_location,
    has_seen_splash,
    is_founding_member
  )
  VALUES (
    v_test_user_id,
    'CampusPerk Security Fixture',
    'campusperk.security.fixture@security-fixture.edu',
    false,
    false,
    'unselected',
    false,
    0,
    NULL,
    NULL,
    NULL,
    false,
    false,
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    student_verified = false,
    premium_status = false,
    campus_role_status = 'unselected',
    campus_verified = false,
    verification_strength_score = 0,
    campus_id = NULL,
    campus_domain = NULL,
    campus_name = NULL,
    is_founding_member = false,
    updated_at = now();

  DELETE FROM public.user_roles WHERE user_id = v_test_user_id AND role = 'admin';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_test_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
