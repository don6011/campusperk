-- Make the database the enforcement point for which deals are public.
--
-- The old policy was named "Active deals are publicly readable" but its USING
-- clause was literally `true`: every row in `deals` was readable by anon. The
-- only thing keeping test fixtures and unpublished rows off the site was a
-- `.eq("is_test_fixture", false)` filter repeated by hand in each page query.
-- That is not a boundary. The anon key ships inside the public JS bundle, so
-- anyone could read the whole table directly:
--
--   curl "$URL/rest/v1/deals?status=eq.draft" -H "apikey: $ANON_KEY"
--
-- returned all 11 unpublished drafts, and `is_test_fixture=is.true` returned
-- both security fixtures. A client-side filter also fails open in two ordinary
-- ways: a stale deploy still runs the old bundle, and any new query that
-- forgets the filter leaks immediately.
--
-- Two rows additionally reached the UI, not just the REST API: CategoryDetail
-- and DealDetail select with `.neq("status", "archived")`, which admits drafts.
-- The 11 drafts imported for review were therefore listed in category pages and
-- reachable at /deal/:id.
--
-- The replacement policy admits exactly the statuses the app renders for the
-- public, and never a fixture. `expired` and `coming_soon` stay readable
-- because DealDetail deliberately shows those states; `draft` and `archived`
-- do not, matching what every public query already asks for.
--
-- Admins are unaffected: "Admins can manage deals" is a separate permissive
-- policy, and permissive policies OR together, so an admin still reads and
-- writes every row including drafts and fixtures.

DROP POLICY IF EXISTS "Active deals are publicly readable" ON public.deals;

CREATE POLICY "Public deals are readable"
  ON public.deals
  FOR SELECT
  TO anon, authenticated
  USING (
    is_test_fixture = false
    AND status IN ('active'::deal_status, 'expired'::deal_status, 'coming_soon'::deal_status)
  );

COMMENT ON POLICY "Public deals are readable" ON public.deals IS
  'Public read boundary: never a test fixture, and only the statuses the site '
  'renders (active, expired, coming_soon). Drafts and archived rows are '
  'admin-only via the separate "Admins can manage deals" policy. Client-side '
  'is_test_fixture filters are now defence in depth, not the boundary.';
