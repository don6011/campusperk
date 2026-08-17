-- deal_status was (active, expired, coming_soon). Curation needs two more:
--
--   archived — retired from the public catalogue but kept for reference. Used by
--              the curation pass to retire the imported affiliate feed without
--              deleting rows.
--   draft    — created but not verified, so not publishable. A deal whose terms
--              have not been confirmed on the merchant's own page belongs here.
--
-- Kept in its own migration because Postgres will not let a new enum value be
-- used in the same transaction that adds it.
--
-- Re-runnable: ADD VALUE IF NOT EXISTS.

ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'draft';
