# Catalogue curation — August 2026

Follows `catalogue-audit-2026-08.md`. Records what was curated, and what could
not be done in this environment.

## Final active catalogue — 16 deals

Every row below already existed. None was created this session, and no offer
terms were written or altered.

| Title | Merchant | Category | Status | Link |
|---|---|---|---|---|
| 60% Off Creative Cloud | Adobe | Software & Creative | active | none |
| 50% Off Acrobat Pro | Adobe | Software & Creative | active | none |
| GitHub Student Developer Pack | GitHub | Software & Creative | active | none |
| Free Notion Plus Plan | Notion | Software & Creative | active | none |
| Premium Student Plan $5.99/mo | Spotify | Subscriptions & Media | active | none |
| Prime Student 6-Month Free Trial | Amazon Prime | Subscriptions & Media | active | none |
| Coursera Plus at $1/month for 3 months | Coursera | Learning & Productivity | active | none |
| 4-Week Free Trial | Chegg | Learning & Productivity | active | none |
| Education Pricing on MacBooks | Apple | Tech & Hardware | active | none |
| 15% Off with Student Beans | Samsung | Tech & Hardware | active | none |
| 10% Off with UNiDAYS | Nike | Everyday | active | none |
| 10% Off Everything | ASOS | Everyday | active | none |
| 10% Student Discount | The North Face | Everyday | active | none |
| $5 Off First 3 Orders | Uber Eats | Everyday | active | none |
| 15% Off with Student Advantage | Amtrak | Everyday | active | none |
| Free Headspace for Students | Headspace | Everyday | active | none |

**Every one of these is unclickable** — no `affiliate_link_url` and no
`direct_link_url`. And **none of their terms has been verified**: the titles
came from the same CSV import as the rest of the catalogue. They read
plausibly, which is not the same as being confirmed.

## Category taxonomy — collapsed 13 → 5

| Category | Deals |
|---|---:|
| Everyday | 6 |
| Software & Creative | 4 |
| Learning & Productivity | 2 |
| Subscriptions & Media | 2 |
| Tech & Hardware | 2 |

Two retained deals have no clean home in the five and are parked in Everyday:

* **Headspace** — the target list files it under "Finance & Wellbeing", which is
  not one of the five categories.
* **Amtrak** — travel, and there is no travel category.

## What could not be done: offer verification

The session required fetching each merchant's own student page before writing
any offer. **This environment's network policy blocks every merchant domain.**
The egress gateway answers `403` to CONNECT; `curl` returns HTTP 000 for all of
them. Confirmed against education.github.com, spotify.com, apple.com,
notion.com, coursera.org, adobe.com, canva.com.

WebSearch works, but it returns aggregator and blog content — apidog.com,
perkstack.co and similar — which is exactly the class of source the session
forbids as authoritative.

Consequently **no new deals were created**. The 25 missing target offers remain
missing. Writing them from background knowledge would have put unverified
prices and terms into the database, which is the failure mode the last three
truth passes existed to remove. A missing deal is recoverable; an invented one
is what we have been deleting.

### Target offers with no deal in the catalogue (25)

Canva Pro for Education · Figma Education · Autodesk Education · JetBrains
student license · Microsoft 365 Education · YouTube Premium Student · Apple
Music Student · Hulu student bundle · Paramount+ student · Peacock student ·
Grammarly Premium student · Quizlet Plus · Todoist Pro for students · Dell
University · Lenovo student · Best Buy student deals · Squarespace student ·
Uber One student · DoorDash DashPass student · Adidas student · Target Circle
student · Chipotle student offers · LinkedIn Premium student · Calm student ·
NordVPN student · Norton student

(Uber One is distinct from the Uber Eats deal that exists and was retained.)

## To finish this work

1. Run the verification pass from an environment that can reach merchant
   domains, or supply the offer terms and canonical URLs directly.
2. Add `'draft'` to the `deal_status` enum — the migration is written but that
   value is not yet applied to production.
3. Apply for the affiliate programmes. No target offer currently carries an
   affiliate network; the only live network is Impact, attached to the feed rows
   that were just archived. Approvals have lead times measured in weeks and are
   the critical path for monetisation, independent of anything in the app.
