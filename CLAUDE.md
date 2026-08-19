# Working notes for CampusPerk

Conventions and hard-won lessons. Read this before changing catalogue code.

---

## The failing-open filter

**A filter that excludes the known bad values instead of admitting the known
good ones.** This is the single most common defect class in this codebase.
Three separate instances, each correct on the day it was written, each silently
absorbing a case added later:

| written as | absorbed | symptom |
| --- | --- | --- |
| `.neq("status", "archived")` | `draft`, added months later | drafts filled the first page of Explore for anyone whose RLS returned them |
| `if (error) return 0` | a failing count query | "0 deals available" above nine rendered cards |
| `discount_value ?? "Special"` | `discount_value` being null on every deal | every card invented a discount that did not exist |

They share a shape and a failure mode. All three **failed toward showing
something** rather than showing nothing, so none of them threw, none tripped a
test, and every one needed a human to look at a rendered page and notice a wrong
pixel.

**Rule:** admit the known good. `.in("status", PUBLIC_DEAL_STATUSES)`, not
`.neq(...)`. Throw or return null on failure, never a plausible-looking zero.
Render nothing when a value is absent, never a placeholder that reads as data.

`src/lib/deal-counts.ts` holds `PUBLIC_DEAL_STATUSES`, which mirrors the
`Public deals are readable` RLS policy exactly. **If you change one, change the
other.** Drift there is invisible to anyone whose RLS returns the smaller set —
which is every student — and shows up only for whoever can read more.

---

## Verify by rendering, not by reading

Nearly every real defect over eleven sessions was code that read correctly and
behaved wrongly. Reading the source found none of them. Loading the page found
all of them.

- `watch_out` was absent from a card because the *query* never selected it. The
  component was correct.
- Logos burst out of their tiles because `.merchant-logo-img` was referenced by
  five files and defined by none. Every call site read fine.
- Sorting labelled "Newest" ranked by quality score. The label and the
  comparator were each internally coherent.

**Corollary: distrust your own measurements.** Four false alarms came from the
harness rather than the app:

- **Full-page screenshots paint fixed elements once, mid-stitch.** They cannot
  be used to judge overlap. Take viewport shots at scroll positions, or measure
  the DOM.
- **Substring-matching page text produces false positives.** GitHub's
  description contains "JetBrains IDEs"; Spotify's contains "includes Hulu".
  Searching page text for draft titles reported drafts that were not there.
  **Match on card titles, not page text.**
- **Playwright cannot fulfil a HEAD request with a body** — it aborts. That
  broke every `count: exact` query and made the app render "0 deals available"
  in the harness only.
- **This sandbox runs UTC.** A date bug that showed the wrong day for the entire
  US audience rendered correctly here. Set the browser timezone explicitly when
  checking anything date-shaped.

---

## Project invariants

- **RLS is the boundary, not client filters.** The `deals` read policy admits
  `is_test_fixture = false` and only `active` / `expired` / `coming_soon`.
  Client-side filters are defence in depth. The anon key ships in the public JS
  bundle, so anything RLS permits is public regardless of what the UI asks for.
- **There are two merchant tables.** `stores` (joined to deals) and `partners`
  (a separate record with its own `status` and a denormalised `active_deals`
  counter that nothing recomputes). Archiving deals does not touch `partners` —
  that is how archived merchants reached the front page. `CampusHub` and
  `UAGCHub` still read `partners` and carry the same exposure behind their
  feature flags.
- **`last_checked_at` is a date, stored at midnight UTC.** Render it with
  `timeZone: "UTC"`. Never fall back to `updated_at` — that reports when a row
  was written, so an import makes every deal look freshly verified.
- **Drafts are not viewable at a deal URL, deliberately** — not even for admins.
  Their terms are unconfirmed, and a draft on a normal URL is how one gets
  shared or indexed by accident. Preview them in the admin portal.
- **`FEATURE_FLAGS` hides, it does not delete.** Everything behind a flag still
  compiles and still routes. Read the comment above each flag for why it is off.

---

## Repo mechanics

- Work on a `claude/*` branch, open a PR, merge, then **delete the branch**. A
  branch that outlives its PR only trips the unpushed-commits hook.
- `npm install` prunes anything installed with `--no-save` (Playwright, here).
  Reinstall it after any dependency change.
- Do not wrap verification in
  `trap 'git checkout -- <file>' EXIT` when editing that same file — it restores
  the whole file and silently discards the edit. That produced a passing
  verification against source that no longer existed.
- Gates: `npx tsc -p tsconfig.app.json --noEmit`, `npm run build`, `npx vitest
  run`, `npx eslint .` Baseline is 0 errors and ~324 pre-existing warnings.
- **`npx tsc --noEmit` type-checks nothing.** The root `tsconfig.json` is
  `"files": []` plus two project references, and plain `tsc` does not follow
  references — only `tsc -b` does. It exits 0 on a file that references an
  undefined identifier, which is how four `Cannot find name 'Wordmark'` errors
  passed the gate. Use `-p tsconfig.app.json`. It is the failing-open filter
  again, this time in the toolchain: a check that reports success by checking
  nothing.
