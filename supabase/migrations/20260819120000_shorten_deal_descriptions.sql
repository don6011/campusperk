-- Card descriptions cut mid-word — "Cancellin…", "back-t…" — because they are
-- longer than the two lines the card gives them.
--
-- The clamp is not the bug. `line-clamp-2` ellipsises at the point the text
-- stops fitting, which is mid-word by definition; there is no CSS that makes it
-- break on a space. Nothing here truncates by character count, so the only
-- honest fix is text that fits.
--
-- The budget was measured, not estimated: rendered in the real card at 375px,
-- where the description column is 249px wide. Two lines is roughly 80
-- characters, but character count is not the constraint — long unbreakable
-- tokens are. "Saves about $100–$200 by model. Back-to-school usually adds an
-- accessory." is 73 characters and wraps to three lines; "…A back-to-school
-- accessory is typical." is 70 and fits in two. Every string below was measured
-- in the browser at 375px and renders in two lines with nothing clipped.
--
-- Facts are preserved, and hedges are preserved as hedges. Apple's promotion
-- stays "typical" rather than becoming a promise; Adobe keeps both the student
-- price and the regular price, and its renewal price stays in `watch_out`
-- where it belongs. What was dropped is detail, never a claim:
--
--   GitHub     "a free domain" — covered by "90+ other tools".
--   Microsoft  OneNote from the app list.
--   Adobe      "billed monthly" and Firefly. The billing structure is the
--              subject of this deal's `watch_out`, which already carries it.
--   Notion     guest collaborators, and the separate 50%-off Notion AI offer.
--   Apple      "on qualifying Mac or iPad purchases".
--
-- Spotify is not listed: at 74 characters it already fits in two lines.
--
-- `watch_out` is deliberately untouched. It is the product's whole claim and is
-- shown in full on the deal page; shortening it to fit a card would delete the
-- warning everywhere to fix a layout problem in one place.
--
-- Scoped to `is_test_fixture = false` so it cannot touch the security fixtures,
-- and to `status = 'active'` because titles are not unique across the table —
-- "GitHub Student Developer Pack" exists twice, once live and once archived
-- from the pre-import catalogue. Idempotent: re-running sets the same values.

UPDATE public.deals AS d
SET description = v.description
FROM (
  VALUES
    ('GitHub Student Developer Pack',
     'Free. GitHub Pro, JetBrains IDEs, $200 DigitalOcean credit and 90+ other tools.'),
    ('Microsoft 365 Education',
     'Free at eligible institutions. Word, Excel, PowerPoint, Teams, 1TB OneDrive.'),
    ('Adobe Creative Cloud Pro — Student & Teacher',
     '$19.99/mo year one on an annual plan. Regular price $69.99/mo. 20+ apps.'),
    ('Dell Student Discount',
     'Extra 10% off through Dell''s education portal. Stacks on listed sale prices.'),
    ('Apple Education Pricing',
     'Saves about $100–$200 by model. A back-to-school accessory is typical.'),
    ('Notion for Students',
     'Free Notion Plus, normally $16/mo. Unlimited pages, blocks and uploads.')
) AS v(title, description)
WHERE d.title = v.title
  AND d.is_test_fixture = false
  AND d.status = 'active'::deal_status
  AND d.description IS DISTINCT FROM v.description;
