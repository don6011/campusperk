-- Keep the security suite working now that fixtures are not publicly readable.
--
-- `20260817120000_restrict_public_deal_reads.sql` stopped anon reading rows with
-- `is_test_fixture = true`. That is the point of it, but it also broke the thing
-- those fixtures exist for: `scripts/security-validation.ts` looks a fixture up
-- over REST to get a deal id, then feeds that id to `get_deal_redirect` and
-- asserts the redirect is blocked without leaking URLs.
--
-- The fallbacks in that script do not cover the gap. The only active
-- `premium_only` deal and the only active `deal_scope = 'local'` deal in this
-- database are the two fixtures themselves, so with them hidden both the
-- premium-gating and campus-gating checks degrade from pass to skip — the suite
-- stays green while testing nothing.
--
-- This returns the id of a fixture row and nothing else that matters: the rows
-- are synthetic, they hold no real merchant URLs, and their whole purpose is to
-- be refused. `get_deal_redirect` still enforces gating on its own, so handing
-- out a fixture id grants no access.
--
-- Restricted to `is_test_fixture = true` so it cannot be used to read around the
-- read policy for real inventory.

CREATE OR REPLACE FUNCTION public.get_security_fixture_deal(p_title text)
RETURNS TABLE (id uuid, title text, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT d.id, d.title, d.status::text
  FROM public.deals d
  WHERE d.is_test_fixture = true
    AND d.title = p_title
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_security_fixture_deal(text) IS
  'Test-support lookup: resolves a security fixture deal id by title. Limited to '
  'is_test_fixture rows so it cannot read real inventory around the public read '
  'policy. Used by scripts/security-validation.ts.';

GRANT EXECUTE ON FUNCTION public.get_security_fixture_deal(text) TO anon, authenticated;
