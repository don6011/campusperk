-- Retire the pre-import catalogue, now that the verified deals are in.
--
-- The 16 rows archived here were the survivors of the previous curation pass.
-- None had a working link and none of their terms had been verified — the
-- titles came from the same CSV import as the rest of the catalogue and read
-- plausibly without being confirmed. They are superseded by the hand-verified
-- import checked on 2026-08-16.
--
-- ORDER MATTERS: this must run after 20260816140000_import_verified_catalogue,
-- never before. Archiving first would take the live catalogue to zero.
--
-- Rows are archived, not deleted. The two security fixtures stay active so
-- npm run test:security can still resolve them.
--
-- Re-runnable: rows already archived no longer match the status filter.

UPDATE public.deals
SET status = 'archived',
    archived_at = now()
WHERE status IN ('active', 'draft')
  AND is_test_fixture = false
  AND (last_checked_at IS NULL OR last_checked_at <> '2026-08-16'::timestamptz);
