/**
 * Single home for things that are switched off rather than deleted.
 *
 * Everything here is hidden, not removed: the components, routes and logic all
 * still exist and still compile. Flipping a flag back to `true` is the whole
 * cost of turning the feature back on — there is no code to restore.
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
};
