-- Truth pass 2: keep security-validation fixtures out of the public catalogue.
--
-- `CampusPerk Security Test Store` owns two deals — "CampusPerk Security Premium
-- Fixture" (99% off) and "CampusPerk Security Campus Fixture" (88% off). Both are
-- status = 'active' and visibility = 'public', so they were being counted in the
-- 224 active deals and were reachable from Explore, Categories and the sitemap.
--
-- Same treatment the ambassador board got in the first truth pass: a flag on the
-- table, set on the fixture rows, filtered out of every public query. The rows
-- stay in place so `npm run test:security` still has something to test against —
-- the script now selects them by this flag rather than by title.
--
-- Re-runnable: IF NOT EXISTS on the column, and the UPDATE is idempotent.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS is_test_fixture boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.deals.is_test_fixture IS
  'True for deals created by validation scripts. Excluded from every user-facing query and from the public deal count.';

-- Flag by owning store rather than by hardcoded id, so a re-seeded fixture store
-- is still caught.
UPDATE public.deals AS d
SET is_test_fixture = true
FROM public.stores AS s
WHERE d.store_id = s.id
  AND s.name = 'CampusPerk Security Test Store'
  AND d.is_test_fixture = false;

-- Belt and braces: the two fixtures are also identifiable by title, in case the
-- store was renamed between environments.
UPDATE public.deals
SET is_test_fixture = true
WHERE title IN (
  'CampusPerk Security Premium Fixture',
  'CampusPerk Security Campus Fixture'
)
AND is_test_fixture = false;

CREATE INDEX IF NOT EXISTS deals_is_test_fixture_idx
  ON public.deals (is_test_fixture)
  WHERE is_test_fixture = false;
