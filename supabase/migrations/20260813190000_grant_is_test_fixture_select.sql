-- Follow-up to 20260813180000_truth_pass_2_test_fixtures.sql.
--
-- `public.deals` does not grant SELECT at the table level. It grants it column
-- by column, deliberately: that is what keeps `affiliate_link_url` and
-- `direct_link_url` away from the anon role, and `npm run test:security`
-- asserts exactly that.
--
-- A column added by ALTER TABLE inherits none of those grants, so after the
-- previous migration `is_test_fixture` was readable only by the service role.
-- PostgREST needs SELECT on a column to *filter* on it as well as to return it,
-- so every public query added in this truth pass — all of which filter
-- `is_test_fixture=eq.false` — failed with 42501 and would have blanked every
-- deal surface on the live site.
--
-- Granting SELECT on this one boolean restores those queries. It widens nothing
-- else: the protected URL columns keep their existing (absent) grants.
--
-- Re-runnable: GRANT is idempotent.

GRANT SELECT (is_test_fixture) ON public.deals TO anon, authenticated;
