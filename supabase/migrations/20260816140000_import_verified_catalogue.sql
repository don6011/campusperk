-- Import the hand-verified catalogue checked on 2026-08-16.
--
-- Offer text, prices and dates are reproduced exactly as verified. Nothing is
-- inferred: discount_value stays NULL because the source records the offer in
-- prose rather than as a number, and requires_edu_email stays at its default
-- because the source describes eligibility in words rather than as a flag.
--
-- last_checked_at is 2026-08-16 — the date a human checked these — not now().
--
-- No affiliate URLs. Not one of these 18 brands has a merchant record carrying a
-- real affiliate URL, so every deal links to the merchant's own canonical page
-- via direct_link_url. Constructing an affiliate URL would invent a commercial
-- relationship that does not exist.
--
-- Re-runnable: stores are created only when absent, and each deal is guarded by
-- NOT EXISTS on (store_id, title).

-- ── Merchants ───────────────────────────────────────────────────────────────
INSERT INTO public.stores (name, website_url, student_discount_available)
SELECT v.name, v.website_url, true
FROM (VALUES
  ('Microsoft',  'https://www.microsoft.com/en-us/education/products/office'),
  ('Dell',       'https://www.dell.com/en-us/lp/students'),
  ('Figma',      'https://www.figma.com/education/'),
  ('Google',     'https://one.google.com/explore-plan/ai-pro-students'),
  ('JetBrains',  'https://www.jetbrains.com/community/education/#students'),
  ('Skillshare', 'https://www.skillshare.com/'),
  ('Hulu',       'https://www.hulu.com/student'),
  ('HBO Max',    'https://www.hbomax.com/'),
  ('Sling TV',   'https://www.sling.com/'),
  ('Peacock',    'https://www.peacocktv.com/'),
  ('Paramount+', 'https://www.paramountplus.com/'),
  ('YouTube',    'https://tv.youtube.com/learn/nflsundayticket/')
) AS v(name, website_url)
WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.name = v.name);

-- ── Deals ───────────────────────────────────────────────────────────────────
INSERT INTO public.deals (
  store_id, title, description, watch_out, renewal_cliff, eligibility_note,
  category, direct_link_url, status, last_checked_at, visibility, is_affiliate
)
SELECT s.id, v.title, v.description, v.watch_out, v.renewal_cliff, v.eligibility_note,
       v.category, v.direct_link_url, v.status::public.deal_status,
       '2026-08-16'::timestamptz, 'public', false
FROM (VALUES
  ($q$GitHub Student Developer Pack$q$, $q$GitHub$q$,
   $q$Free. Includes GitHub Pro, JetBrains IDEs, $200 DigitalOcean credit, a free domain, and 90+ other developer tools.$q$,
   $q$Copilot Student sign-ups have been paused since April 2026 over compute demand. Students verified before the pause keep their plan; new members currently get Copilot Free. Most listings elsewhere still advertise Copilot Pro.$q$,
   $q$Re-verify when prompted, typically every 1-2 years$q$,
   $q$13+, enrolled in a degree- or diploma-granting program. No .edu email required — student ID, class schedule, transcript, or enrollment letter accepted. Personal GitHub account only.$q$,
   $q$Software & Creative$q$, $q$https://education.github.com/pack$q$, $q$active$q$),

  ($q$Spotify Premium Student$q$, $q$Spotify$q$,
   $q$$6.99/mo, includes Hulu (with ads). Regular Individual price is $12.99/mo.$q$,
   $q$Price rose from $5.99 to $6.99 in January 2026. Several major aggregators still list $5.99.$q$,
   $q$Annual reverification; reverts to $12.99/mo if missed$q$,
   $q$Enrolled at an accredited higher-education institution. Verified via SheerID. Maximum 4 years total.$q$,
   $q$Subscriptions & Media$q$, $q$https://www.spotify.com/us/student/$q$, $q$active$q$),

  ($q$Adobe Creative Cloud Pro — Student & Teacher$q$, $q$Adobe$q$,
   $q$$19.99/mo for the first year on an annual plan billed monthly. Regular price $69.99/mo. Includes 20+ apps plus Firefly.$q$,
   $q$Price DOUBLES to $39.99/mo after the first year. The 71%-off headline applies only to year one. Cancelling a monthly plan mid-term incurs an early termination fee.$q$,
   $q$Year 1 $19.99 → Year 2 $39.99$q$,
   $q$13+, enrolled at a qualifying school. Part-time students generally eligible. Verified by school email or documents dated within the last 6 months.$q$,
   $q$Software & Creative$q$, $q$https://www.adobe.com/creativecloud/buy/students.html$q$, $q$active$q$),

  ($q$Microsoft 365 Education$q$, $q$Microsoft$q$,
   $q$Free. Word, Excel, PowerPoint, OneNote, Teams, and 1TB OneDrive for students at eligible institutions.$q$,
   $q$Goes into view-only mode when your enrollment ends. Export your files before graduation.$q$,
   $q$Access ends with enrollment$q$,
   $q$School-issued email at an eligible institution. No credit card required.$q$,
   $q$Software & Creative$q$, $q$https://www.microsoft.com/en-us/education/products/office$q$, $q$active$q$),

  ($q$Notion for Students$q$, $q$Notion$q$,
   $q$Free Notion Plus — normally $16/mo. Unlimited pages, blocks, file uploads, and guest collaborators. Notion AI separately 50% off.$q$,
   $q$Keeps working as long as your school email stays active.$q$,
   $q$Tied to school email remaining active$q$,
   $q$.edu email verification at notion.so/students.$q$,
   $q$Learning & Productivity$q$, $q$https://www.notion.so/students$q$, $q$active$q$),

  ($q$Dell Student Discount$q$, $q$Dell$q$,
   $q$Extra 10% off after verifying through Dell's education portal. Stacks on top of listed sale prices.$q$,
   $q$Percentage-based, not a fixed price — underlying sale prices change constantly.$q$,
   NULL,
   $q$Verification through Dell's education portal.$q$,
   $q$Tech & Hardware$q$, $q$https://www.dell.com/en-us/lp/students$q$, $q$active$q$),

  ($q$Apple Education Pricing$q$, $q$Apple$q$,
   $q$Education pricing saves roughly $100-$200 depending on model. Apple typically runs a back-to-school promotion with a free accessory on qualifying Mac or iPad purchases.$q$,
   $q$As of July 2026 Apple had NOT confirmed its 2026 US back-to-school offer. Education pricing itself is always available; confirm the promo is live before counting on the free accessory.$q$,
   NULL,
   $q$Current or newly accepted college students, parents buying for them, and faculty/staff.$q$,
   $q$Tech & Hardware$q$, $q$https://www.apple.com/us-edu/store$q$, $q$active$q$),

  ($q$Figma Education$q$, $q$Figma$q$,
   $q$Free Education plan for verified students. Plan level and duration vary by school type.$q$,
   NULL, NULL,
   $q$Verified student status.$q$,
   $q$Software & Creative$q$, $q$https://www.figma.com/education/$q$, $q$draft$q$),

  ($q$Google AI Pro — Student$q$, $q$Google$q$,
   $q$Up to 12 months free for verified US college students. Includes Gemini Pro-level access and NotebookLM premium features.$q$,
   $q$Time-limited free period — set a reminder before it converts. Handshake runs a separate 12-month Google AI Plus offer for students and recent alumni.$q$,
   $q$Converts to paid after the free period$q$,
   $q$Verified US college student.$q$,
   $q$Learning & Productivity$q$, $q$https://one.google.com/explore-plan/ai-pro-students$q$, $q$draft$q$),

  ($q$JetBrains Student License$q$, $q$JetBrains$q$,
   $q$Free access to the full IDE suite for students. Also bundled inside the GitHub Student Developer Pack.$q$,
   $q$Requires annual re-verification.$q$,
   $q$Annual re-verification$q$,
   $q$Verified student status.$q$,
   $q$Software & Creative$q$, $q$https://www.jetbrains.com/community/education/#students$q$, $q$draft$q$),

  ($q$Skillshare Student$q$, $q$Skillshare$q$,
   $q$$90/year for students, versus $240 regular.$q$,
   NULL, NULL,
   $q$School email or ID.me verification.$q$,
   $q$Learning & Productivity$q$, $q$https://www.skillshare.com/$q$, $q$draft$q$),

  ($q$Samsung Education Offers Program$q$, $q$Samsung$q$,
   $q$Extra savings on Galaxy devices and laptops for verified students.$q$,
   $q$Percentage varies by product and promotion window.$q$,
   NULL,
   $q$Valid .edu email address.$q$,
   $q$Tech & Hardware$q$, $q$https://www.samsung.com/us/shop/discount-program/education/$q$, $q$draft$q$),

  ($q$Hulu (With Ads) — Student$q$, $q$Hulu$q$,
   $q$$1.99/mo, down from $11.99/mo.$q$,
   $q$Already included free with Spotify Premium Student — do not pay for both.$q$,
   $q$Reverts to $11.99/mo when enrollment lapses$q$,
   $q$Current college student.$q$,
   $q$Subscriptions & Media$q$, $q$https://www.hulu.com/student$q$, $q$draft$q$),

  ($q$HBO Max Basic with Ads — Student$q$, $q$HBO Max$q$,
   $q$Up to 50% off the Basic with Ads monthly plan — roughly $4.99/mo.$q$,
   $q$Requires reverification at the end of each year.$q$,
   $q$Annual reverification required$q$,
   $q$Verified through UNiDAYS.$q$,
   $q$Subscriptions & Media$q$, $q$https://www.hbomax.com/$q$, $q$draft$q$),

  ($q$Sling TV Student — $10 off$q$, $q$Sling TV$q$,
   $q$$10/mo off Sling Orange or Blue (regularly $45.99/mo each, $60.99 combined) for the first 6 months. Orange carries ESPN, ESPN2, ESPN3.$q$,
   $q$THE DISCOUNT LASTS 6 MONTHS, NOT A YEAR. Sign up in September and the price reverts in March — two months after the season ends.$q$,
   $q$6 months from signup — a September signup reverts in March 2027$q$,
   $q$Verified through Student Beans.$q$,
   $q$Subscriptions & Media$q$, $q$https://www.sling.com/$q$, $q$draft$q$),

  ($q$Peacock Premium — Student / Young Adult$q$, $q$Peacock$q$,
   $q$$5.99/mo for 12 months, down from $10.99/mo. Carries Big Ten football and Sunday Night Football.$q$,
   $q$Age-based (18-24), NOT enrollment-based — an older returning student will not qualify. Sources currently conflict on the price; several still publish $2.99. Confirm at checkout.$q$,
   $q$Auto-renews at the then-current rate after 12 months unless reverified$q$,
   $q$Ages 18-24, verified via SheerID on age.$q$,
   $q$Subscriptions & Media$q$, $q$https://www.peacocktv.com/$q$, $q$draft$q$),

  ($q$Paramount+ Student$q$, $q$Paramount+$q$,
   $q$50% off any plan. Carries NFL games on CBS and SEC coverage.$q$,
   $q$Requires a Title IV-accredited institution — narrower eligibility than most student offers.$q$,
   $q$Annual reverification$q$,
   $q$Enrolled at a Title IV-accredited college or university. Verified via SheerID.$q$,
   $q$Subscriptions & Media$q$, $q$https://www.paramountplus.com/$q$, $q$draft$q$),

  ($q$NFL Sunday Ticket — Student$q$, $q$YouTube$q$,
   $q$Discounted student pricing on NFL Sunday Ticket.$q$,
   $q$Only worth it if you live outside your team's local market — otherwise your local games are already on broadcast TV.$q$,
   $q$Seasonal — cancel once the regular season ends in January$q$,
   $q$Student verification through the YouTube TV / Sunday Ticket student page.$q$,
   $q$Subscriptions & Media$q$, $q$https://tv.youtube.com/learn/nflsundayticket/$q$, $q$draft$q$)
) AS v(title, merchant, description, watch_out, renewal_cliff, eligibility_note,
       category, direct_link_url, status)
JOIN public.stores s ON s.name = v.merchant
-- Guard on (store_id, title, last_checked_at) rather than (store_id, title).
-- The pre-import catalogue already contained a row titled "GitHub Student
-- Developer Pack"; a title-only guard silently skipped the verified replacement.
-- The check date is what distinguishes this import from anything already there.
WHERE NOT EXISTS (
  SELECT 1 FROM public.deals d
  WHERE d.store_id = s.id
    AND d.title = v.title
    AND d.last_checked_at = '2026-08-16'::timestamptz
);
