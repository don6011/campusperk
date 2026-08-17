/**
 * Single home for things that are switched off rather than deleted.
 *
 * Everything here is hidden, not removed: the components, routes and logic all
 * still exist and still compile. Flipping a flag back to `true` is the whole
 * cost of turning the feature back on — there is no code to restore. Routes
 * behind these flags stay registered and reachable by direct URL for testing;
 * what the flags remove is the navigation entry and every in-app link to them.
 *
 * Declared without `as const` on purpose, so each value is typed `boolean` and
 * a flag can be flipped without TypeScript narrowing every guarded branch to
 * unreachable code.
 */
export const FEATURE_FLAGS = {
  /**
   * `deals.last_checked_at` holds CSV import dates, not the result of anyone
   * checking a deal. Every control that sorts, filters or badges on it —
   * Explore's "Recently Verified" sort, its freshness filters and per-card
   * "Verified today" badge, and the same three on CategoryDetail — tells the
   * student a check happened that never did. Flip this on once a real
   * verification pass writes that column.
   */
  showVerificationFreshnessUI: false,

  /**
   * Per-deal claim counts on cards and detail pages ("2 students claimed this
   * deal", "2 claimed today").
   *
   * The events behind these are real — recording continues regardless of this
   * flag, so turning it back on shows accumulated history rather than starting
   * from zero. What makes them wrong to display today is scale: the true
   * numbers are 1, 2 and 3, and a social-proof row reading "1 claimed" is
   * weaker than no row at all. Flip this on when the counts are large enough
   * to mean something.
   */
  showClaimCounts: false,

  /** Badge collection: /badges, the avatar-menu entry, and the Account nudge. */
  showBadges: false,

  /** National campus rankings: /campus-leaderboard. */
  showCampusLeaderboard: false,

  /** Campus hubs: /campus and /campus/:slug. */
  showCampusHub: false,

  /** The UAGC-specific hub: /uagc. */
  showUagcHub: false,

  /** Ambassador tools for active ambassadors: /ambassador/dashboard. */
  showAmbassadorDashboard: false,

  /** Ambassador rankings: /ambassador/leaderboard. */
  showAmbassadorLeaderboard: false,

  /** Founding member showcase: /founding-showcase. */
  showFoundersShowcase: false,

  /**
   * The Premium sidebar entry only. /pricing, /premium and the whole upgrade
   * path stay live — this hides one nav row, nothing else.
   */
  showPremiumNavEntry: false,
};
