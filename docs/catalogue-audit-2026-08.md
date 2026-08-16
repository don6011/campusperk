# Catalogue audit — August 2026

Read-only audit of the 222 active public deals, taken before any curation.
No data was changed to produce this document.

## Headline

Of 222 active, public, non-fixture deals:

| Segment | Count | % |
|---|---:|---:|
| Blank rows — no title, no merchant name, no link | 138 | 62% |
| Title is just the merchant name ("COOFANDY", "signNow") | 68 | 31% |
| Real, human-written deal title | 16 | 7% |
| Unclickable (no `affiliate_link_url` and no `direct_link_url`) | 154 | 69% |
| **Both a real title AND a working link** | **0** | **0%** |

Not one deal in the catalogue is both properly titled and clickable. The two
halves do not overlap: the 68 rows that carry working links are merchant names
rather than offers, and all 16 rows that read like real student deals have no
link of any kind.

The 138 blank rows currently render as empty cards on every public surface.

## A2 — merchants, and what is worth keeping

The 68 name-only rows are a generic affiliate feed, not student offers:
Points.com loyalty programs (Hilton Honors, IHG, Marriott Bonvoy, JetBlue,
Qatar Airways), consumer-goods dropshippers (Amanda Hair, COOFANDY, Fitory
Footwear, mooglasses, lightsaber.com), regional electronics listings (OPPO ES,
OPPO FR), and sports merchandise (NBA Store, NFL Shop, Fanatics). None is a
student programme. All are miscategorised — COOFANDY, a menswear brand, is
filed under "Software".

**Not on the target list, but genuine student offers worth retaining:**

| Deal | Merchant | Why |
|---|---|---|
| 15% Off with Student Advantage | Amtrak | Real student travel programme; relevant to commuting/online students |
| 10% Off Everything | ASOS | Real student discount programme |
| 10% Student Discount | The North Face | Real student discount programme |
| $5 Off First 3 Orders | Uber Eats | Real; note the target list asks for **Uber One student**, a different offer |

## A3 — category taxonomy, live counts

| Category | Deals | Clickable |
|---|---:|---:|
| other | 138 | 0 |
| Student Essentials | 41 | 41 |
| Software | 22 | 18 |
| Technology | 7 | 7 |
| Clothing | 3 | 0 |
| Tech | 2 | 0 |
| Travel | 2 | 1 |
| Subscriptions | 2 | 0 |
| Fitness | 1 | 0 |
| Food | 1 | 0 |
| Books | 1 | 0 |
| Education | 1 | 1 |
| Learning | 1 | 0 |

13 categories for 222 deals, and 62% sit in "other". "Tech" and "Technology"
are duplicates of each other. "Student Essentials" is the affiliate feed's
default bucket, not a student signal — every one of its 41 rows is a name-only
merchant row.

## A1 — target offers against the catalogue

12 of the 37 target offers already exist as deals (13 rows; Adobe has two).
Every one of them is unclickable, and none has a `last_checked_at` value.

| Target offer | Exists | Deal id | Current title | Status | Merchant | Network | Clickable |
|---|---|---|---|---|---|---|---|
| GitHub Student Developer Pack | YES | 350b71b4 | GitHub Student Developer Pack | active | GitHub | — | no |
| Adobe Creative Cloud Student | YES | cb7318bd | 60% Off Creative Cloud | active | Adobe | — | no |
| Adobe (Acrobat, second row) | YES | d9f4e5cd | 50% Off Acrobat Pro | active | Adobe | — | no |
| Notion for students | YES | f800396c | Free Notion Plus Plan | active | Notion | — | no |
| Spotify Premium Student | YES | 5c63616c | Premium Student Plan $5.99/mo | active | Spotify | — | no |
| Amazon Prime Student | YES | 83e7d32b | Prime Student 6-Month Free Trial | active | Amazon Prime | — | no |
| Coursera Plus student pricing | YES | ab59f90e | Coursera Plus at $1/month for 3 months | active | Coursera | — | no |
| Chegg Study | YES | 944cdc3c | 4-Week Free Trial | active | Chegg | — | no |
| Apple Education Store | YES | 50335aca | Education Pricing on MacBooks | active | Apple | — | no |
| Samsung student discount | YES | ae20cde1 | 15% Off with Student Beans | active | Samsung | — | no |
| Nike student | YES | 25f2334c | 10% Off with UNiDAYS | active | Nike | — | no |
| Headspace student | YES | 95faee48 | Free Headspace for Students | active | Headspace | — | no |
| Canva Pro for Education | NO | — | — | — | — | — | — |
| Figma Education | NO | — | — | — | — | — | — |
| Autodesk Education | NO | — | — | — | — | — | — |
| JetBrains student license | NO | — | — | — | — | — | — |
| Microsoft 365 Education | NO | — | — | — | — | — | — |
| YouTube Premium Student | NO | — | — | — | — | — | — |
| Apple Music Student | NO | — | — | — | — | — | — |
| Hulu student bundle | NO | — | — | — | — | — | — |
| Paramount+ student | NO | — | — | — | — | — | — |
| Peacock student | NO | — | — | — | — | — | — |
| Grammarly Premium student | NO | — | — | — | — | — | — |
| Quizlet Plus | NO | — | — | — | — | — | — |
| Todoist Pro for students | NO | — | — | — | — | — | — |
| Dell University | NO | — | — | — | — | — | — |
| Lenovo student | NO | — | — | — | — | — | — |
| Best Buy student deals | NO | — | — | — | — | — | — |
| Squarespace student | NO | — | — | — | — | — | — |
| Uber One student | NO | — | — | — | — | — | — |
| DoorDash DashPass student | NO | — | — | — | — | — | — |
| Adidas student | NO | — | — | — | — | — | — |
| Target Circle student | NO | — | — | — | — | — | — |
| Chipotle student offers | NO | — | — | — | — | — | — |
| LinkedIn Premium student | NO | — | — | — | — | — | — |
| Calm student | NO | — | — | — | — | — | — |
| NordVPN student | NO | — | — | — | — | — | — |
| Norton student | NO | — | — | — | — | — | — |

`last_checked_at` is NULL for all 12 existing target deals, which is consistent
with the earlier finding that the column was populated only by CSV import dates
and never by an actual check.

## Note on affiliate networks

No target-offer deal carries an affiliate network. Across the whole catalogue,
the only live network is Impact, and it is attached to the generic feed rows —
not to any student offer. Every affiliate relationship needed to monetise the
target list still has to be applied for.
