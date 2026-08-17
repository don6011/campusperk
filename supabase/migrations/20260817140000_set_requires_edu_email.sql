-- NOT YET APPLIED. Staged for the next session; review before running.
--
-- `requires_edu_email` is false on all seven live deals because the catalogue
-- import never set it, not because anyone checked. The verification pass
-- checked. Two of the seven require a school-issued address; five do not, and
-- accept documents, portals or third-party verification instead.
--
-- All seven are written explicitly rather than only the two that change. The
-- five `false` rows are currently correct by accident, and an explicit statement
-- of "verified: does not require .edu" is worth more than a row nobody touched —
-- it is the difference between an unset default and a recorded finding.
--
-- Per-deal basis for each value:
--
--   Microsoft 365 Education  TRUE   School-issued email required.
--   Notion for Students      TRUE   .edu verification at notion.so/students.
--
--   GitHub Student Pack      FALSE  Explicitly accepts student ID, class
--                                   schedule, transcript or enrollment letter.
--   Adobe Creative Cloud     FALSE  School email OR dated documents from the
--                                   last 6 months.
--   Spotify Premium Student  FALSE  SheerID verification; no .edu address
--                                   needed.
--   Dell Student Discount    FALSE  Verification through Dell's education
--                                   portal.
--   Apple Education Pricing  FALSE  Multiple proof paths; parents purchasing
--                                   for a student also qualify.
--
-- Matching is by title, scoped to `is_test_fixture = false` so it cannot touch
-- the security fixtures, and to `status = 'active'` because titles are not
-- unique across the table: "GitHub Student Developer Pack" exists twice, once
-- live and once archived from the pre-import catalogue. Without the status
-- predicate this would flip the archived copy as well. Idempotent: re-running
-- sets the same values.
--
-- Note for whoever picks this up: this corrects the per-deal flag only. It does
-- not touch the signup gate, which is a separate and larger question —
-- `SignUp.tsx` blocks submission unless the address ends in `.edu`, so five of
-- these seven offers are gated more tightly by CampusPerk than by the merchant,
-- and the `endsWith(".edu")` test also excludes every non-US institution
-- (`ac.uk`, `edu.au`, `edu.cn`). Rebuilding that gate against the campus-domains
-- table is deliberately out of scope here.

UPDATE public.deals AS d
SET requires_edu_email = v.requires_edu
FROM (
  VALUES
    ('Microsoft 365 Education',                    true),
    ('Notion for Students',                        true),
    ('GitHub Student Developer Pack',              false),
    ('Adobe Creative Cloud Pro — Student & Teacher', false),
    ('Spotify Premium Student',                    false),
    ('Dell Student Discount',                      false),
    ('Apple Education Pricing',                    false)
) AS v(title, requires_edu)
WHERE d.title = v.title
  AND d.is_test_fixture = false
  AND d.status = 'active'::deal_status
  AND d.requires_edu_email IS DISTINCT FROM v.requires_edu;
