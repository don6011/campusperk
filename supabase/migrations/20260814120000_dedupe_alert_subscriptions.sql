-- Deduplicate alert_subscriptions and stop duplicates coming back.
--
-- The Alerts screen showed eight subscriptions that all read "All deals". Seven
-- of them were `alert_type = 'local_deals'` rows with an empty `categories`
-- array, created by the old "Notify Me When Available" button on the dashboard's
-- local-deals card: it inserted on every click with no uniqueness check, so one
-- student clicking seven times produced seven identical rows. The label read
-- "All deals" because the UI falls back to that whenever `categories` is empty.
--
-- That button is gone, but the rows remain and nothing stopped another flow
-- doing the same thing. This collapses each (user, type, categories) group to
-- its oldest row and adds a unique index so the database refuses the rest.
--
-- Note: `local_deals` subscribes to a feature that is off the roadmap
-- permanently. Those rows are deduplicated here, not deleted — removing a
-- student's subscription outright is a product decision, not a cleanup.
--
-- Re-runnable: the delete is a no-op once unique, and the index uses IF NOT
-- EXISTS. Touches no column on public.deals, so no SELECT grant is required.

-- 1. Keep the earliest row in each duplicate group.
DELETE FROM public.alert_subscriptions AS a
USING public.alert_subscriptions AS b
WHERE a.user_id = b.user_id
  AND a.alert_type = b.alert_type
  AND coalesce(a.categories, '{}') = coalesce(b.categories, '{}')
  AND (a.created_at, a.id) > (b.created_at, b.id);

-- 2. Make the duplicate unrepresentable. `categories` is coalesced because a
--    NULL array is the same subscription as an empty one, and NULL would
--    otherwise slip past the constraint every time.
CREATE UNIQUE INDEX IF NOT EXISTS alert_subscriptions_user_type_categories_key
  ON public.alert_subscriptions (user_id, alert_type, (coalesce(categories, '{}')));
