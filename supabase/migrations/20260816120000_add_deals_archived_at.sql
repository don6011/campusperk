-- Adds deals.archived_at so curation can retire a deal without deleting the row.
--
-- public.deals grants SELECT column by column, not at table level — that is what
-- keeps affiliate_link_url and direct_link_url away from the anon role, and
-- test:security asserts it. A column added by ALTER TABLE inherits none of those
-- grants, and PostgREST needs SELECT on a column to filter on it as well as to
-- return it, so the GRANT ships in the same migration. (Truth pass 2 learned this
-- the hard way: the flag column went out without a grant and every public deals
-- query would have failed with 42501.)
--
-- Re-runnable: IF NOT EXISTS on the column, GRANT is idempotent.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.deals.archived_at IS
  'When the deal was archived out of the public catalogue. NULL for deals that were never archived. Set alongside status = ''archived''.';

GRANT SELECT (archived_at) ON public.deals TO anon, authenticated;
