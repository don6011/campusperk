-- Archive the imported affiliate feed, retain the curated student catalogue.
--
-- Of 222 active public deals, 206 were not student offers:
--   * 138 blank rows — no title, no merchant name, no link. Import corruption
--     that rendered as empty cards on every public surface.
--   * 68 rows whose title is just the merchant name ("COOFANDY", "signNow",
--     "Hilton Honors Rewards - Points.com"). A generic affiliate feed:
--     loyalty-points programmes, dropshippers, sports merchandise. No student
--     programme among them.
--
-- The 16 retained rows are every deal with a real, human-written title distinct
-- from its merchant name. That set is exactly the 12 target-list offers plus the
-- four flagged in the audit as genuine student offers off the list (Amtrak,
-- ASOS, The North Face, Uber Eats).
--
-- Rows are archived, not deleted, so a category that turns out too thin can be
-- repopulated from history.
--
-- The two CampusPerk Security fixtures are deliberately left active: npm run
-- test:security resolves them, and is_test_fixture already keeps them out of
-- every public query.
--
-- Re-runnable: only touches status='active' rows matching the criteria, so a
-- second run matches nothing.

UPDATE public.deals AS d
SET status = 'archived',
    archived_at = now()
FROM public.stores AS s
WHERE d.store_id = s.id
  AND d.status = 'active'
  AND d.is_test_fixture = false
  AND (
    coalesce(trim(d.title), '') = ''
    OR trim(d.title) = trim(s.name)
  );
