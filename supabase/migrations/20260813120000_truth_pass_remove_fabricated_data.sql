-- Truth pass: remove fabricated counters, fixtures, and false labels.
--
-- 1. Public founding-member counter so the dashboard banner can read a real number.
-- 2. Remove the growth-validation ambassador fixtures that were leaking onto the
--    public ambassador board, and give the table a flag so future validation runs
--    stay out of user-facing lists.
-- 3. Clear the `sponsored` flag from deals that were never paid placements.

-- ─────────────────────────────────────────────────────────────
-- 1. Founding member counter
-- ─────────────────────────────────────────────────────────────
-- `profiles` RLS only lets a user read their own row, so a client-side
-- count(*) always returns 0 (or 1). This SECURITY DEFINER function exposes the
-- aggregate only — no profile rows, no PII.
CREATE OR REPLACE FUNCTION public.count_founding_members()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::integer
  FROM public.profiles
  WHERE is_founding_member = true;
$$;

REVOKE ALL ON FUNCTION public.count_founding_members() FROM public;
GRANT EXECUTE ON FUNCTION public.count_founding_members() TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Ambassador validation fixtures
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.ambassadors
  ADD COLUMN IF NOT EXISTS is_test_fixture boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ambassadors.is_test_fixture IS
  'True for rows created by validation scripts. Excluded from user-facing leaderboards.';

-- Referrals are keyed by referral_code with no FK, so drop them explicitly
-- before the ambassador rows go (ambassador_reward_unlocks cascades on its own).
DELETE FROM public.referrals
WHERE referral_code IN (
  SELECT referral_code
  FROM public.ambassadors
  WHERE university = 'CampusPerk Growth Validation University'
     OR university ILIKE '%Validation University%'
     OR university ILIKE '%Security Fixture%'
);

DELETE FROM public.ambassadors
WHERE university = 'CampusPerk Growth Validation University'
   OR university ILIKE '%Validation University%'
   OR university ILIKE '%Security Fixture%';

-- ─────────────────────────────────────────────────────────────
-- 3. False sponsored labels
-- ─────────────────────────────────────────────────────────────
-- These are ordinary affiliate offers, not paid placements. Clearing the flag
-- moves them into the normal deal grid and stops the "Sponsored" badge from
-- rendering against inventory nobody paid for.
UPDATE public.deals
SET sponsored = false,
    sponsor_tier = NULL,
    sponsor_priority = NULL,
    sponsor_start_at = NULL,
    sponsor_end_at = NULL
WHERE sponsored = true;
