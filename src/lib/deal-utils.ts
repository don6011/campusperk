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
  return `Checked ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function urgencyColor(days: number) {
  if (days < 3) return "bg-destructive/15 text-destructive border-destructive/30";
  if (days <= 7) return "bg-[hsl(25_95%_53%)]/15 text-[hsl(25_95%_53%)] border-[hsl(25_95%_53%)]/30";
  if (days <= 14) return "bg-gold/15 text-gold border-gold/30";
  return "bg-accent/15 text-accent border-accent/30";
}
