/** Shared deal utility functions used across Dashboard, ExploreDeals, DealDetail, Favorites */

export function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function timeAgo(dateStr: string) {
  const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function freshnessColor(dateStr: string) {
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 1) return "text-accent";
  if (days <= 7) return "text-gold";
  return "text-destructive";
}

/**
 * Explicit "Checked <date>" label for `deals.last_checked_at`, or null.
 *
 * Deal cards and detail pages used to render `timeAgo(last_checked_at ||
 * updated_at)` tinted with `freshnessColor`. Three separate problems:
 *
 *  - The `updated_at` fallback reported when the row was last written. Every
 *    deal read "4h ago" because an import had touched it, so editing a typo in
 *    a description told students the offer had been re-checked.
 *  - Relative time ("4h ago") implies a live process. An explicit date makes
 *    the age of the check legible instead of implying recency.
 *  - The tint graded that number green/amber/red, turning a timestamp nobody
 *    could vouch for into a freshness verdict.
 *
 * Returns null when `last_checked_at` is absent, and callers render nothing —
 * no timestamp is honest when no check is recorded.
 */
export function checkedDateLabel(lastCheckedAt: string | null | undefined) {
  if (!lastCheckedAt) return null;
  const d = new Date(lastCheckedAt);
  if (Number.isNaN(d.getTime())) return null;
  /*
   * Rendered in UTC, deliberately.
   *
   * `last_checked_at` records the DAY someone checked an offer; the import
   * stores midnight UTC because there is no meaningful time of day attached to
   * it. Formatting that in the viewer's zone moves it: midnight UTC on the 16th
   * is 8pm on the 15th in New York, so every US viewer read "Checked Aug 15"
   * for a check recorded on the 16th.
   *
   * This sandbox runs UTC, which is why it rendered correctly here and wrong
   * for the entire intended audience. A stored date should display as the date
   * it is, not shift by the reader's longitude.
   */
  return `Checked ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}

export function urgencyColor(days: number) {
  if (days < 3) return "bg-destructive/15 text-destructive border-destructive/30";
  if (days <= 7) return "bg-[hsl(25_95%_53%)]/15 text-[hsl(25_95%_53%)] border-[hsl(25_95%_53%)]/30";
  if (days <= 14) return "bg-gold/15 text-gold border-gold/30";
  return "bg-accent/15 text-accent border-accent/30";
}
