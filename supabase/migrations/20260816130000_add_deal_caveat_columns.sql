-- Three columns for the caveats a student needs before clicking, carried by the
-- hand-verified catalogue:
--
--   watch_out         — the caveat shown on the card. "Price doubles to $39.99
--                       after year one", "Copilot sign-ups paused since April".
--   renewal_cliff     — when the price changes and to what.
--   eligibility_note  — who actually qualifies. Several offers are age-based or
--                       institution-type-based rather than simply "a student".
--
-- public.deals grants SELECT column by column, not at table level — that is what
-- keeps affiliate_link_url and direct_link_url away from the anon role, and
-- test:security asserts it. A column added by ALTER TABLE inherits none of those
-- grants, and PostgREST needs SELECT on a column to filter on it as well as to
-- return it, so the GRANT ships in the same migration. Truth pass 2 shipped a
-- column without its grant and every public deals query would have 42501'd.
--
-- Re-runnable: IF NOT EXISTS on each column, GRANT is idempotent.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS watch_out text,
  ADD COLUMN IF NOT EXISTS renewal_cliff text,
  ADD COLUMN IF NOT EXISTS eligibility_note text;

COMMENT ON COLUMN public.deals.watch_out IS
  'The caveat a student should read before clicking through. Nullable — not every offer has one.';
COMMENT ON COLUMN public.deals.renewal_cliff IS
  'When the price changes and to what, for offers that convert or require reverification.';
COMMENT ON COLUMN public.deals.eligibility_note IS
  'Who actually qualifies. Some offers are age-based or restricted by institution type rather than enrollment alone.';

GRANT SELECT (watch_out) ON public.deals TO anon, authenticated;
GRANT SELECT (renewal_cliff) ON public.deals TO anon, authenticated;
GRANT SELECT (eligibility_note) ON public.deals TO anon, authenticated;
