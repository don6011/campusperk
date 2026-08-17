import { Link } from "react-router-dom";
import { AlertTriangle, Lock } from "lucide-react";
import { MerchantLogo } from "@/components/MerchantLogo";
import { checkedDateLabel } from "@/lib/deal-utils";
import { cn } from "@/lib/utils";

/**
 * The atom of the product. Built at 375px; desktop is the same card with more
 * room.
 *
 * One row: logo tile, then a text column, then the value. What changed from the
 * card this replaces, and why:
 *
 *  - `watch_out` is on the card. "Price DOUBLES to $39.99/mo after the first
 *    year" is the most useful sentence in the catalogue and it used to take two
 *    clicks to reach. A student choosing between offers needs it while
 *    choosing, not after.
 *  - One badge, and only when it distinguishes something. Every card carried an
 *    "Active Deal" chip, which every deal is by definition — it cost a line of
 *    vertical space to say nothing. "Featured" survives only because it is an
 *    editor-set column, not a computed one.
 *  - No button. The old card had a full-width "Get This Deal" button, so the
 *    card had two competing targets and the button was the smaller one. The
 *    whole card is the link now; the button stays on the detail page where
 *    there is a single clear action.
 *  - No discount figure when there is none. `discount_value` is null on every
 *    active deal, which is what produced "Special" and "Special Offer".
 *
 * Spacing is the 4px scale, type is the six-step scale, and there is exactly one
 * surface: a hairline border at 12px radius. No nested bordered boxes.
 */
export interface DealCardDeal {
  id: string;
  title: string;
  description?: string | null;
  discount_value?: string | null;
  watch_out?: string | null;
  last_checked_at?: string | null;
  featured?: boolean | null;
  stores?: { name?: string | null; logo_url?: string | null } | null;
}

interface DealCardProps {
  deal: DealCardDeal;
  className?: string;
  /**
   * Set when the deal is locked. The merchant and title still render — a
   * student should know which offer is behind the gate — but the offer detail,
   * caveat, value and checked date are replaced by this message.
   *
   * It renders in normal flow rather than as an overlay. An absolutely
   * positioned scrim escaped the card box on short cards, and an opaque one
   * covering the whole card left a blank bordered rectangle that read as a
   * rendering failure.
   */
  gate?: { label: string; hint: string } | null;
}

export function DealCard({ deal, className, gate }: DealCardProps) {
  const checked = checkedDateLabel(deal.last_checked_at);
  const merchant = deal.stores?.name;

  return (
    <Link
      to={`/deals/${deal.id}`}
      // The entire card is the target. 44px minimum is satisfied by the 48px
      // logo tile plus padding, so this clears the tap-target floor on mobile.
      className={cn(
        "flex items-start gap-3 rounded-card border border-border p-4",
        "transition-colors hover:border-foreground/20 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <MerchantLogo
        name={merchant}
        logoUrl={deal.stores?.logo_url}
        fallbackName={deal.title}
        // 48px tile, 8px radius, subtle surface, hairline border.
        className="h-12 w-12 rounded-tile border border-border bg-secondary p-2 text-foreground"
        monogramClassName="text-body"
      />

      <div className="min-w-0 flex-1">
        {merchant && <p className="text-caption text-muted-faint">{merchant}</p>}

        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 truncate text-body font-medium text-foreground">
            {deal.title}
          </p>
          {/* Right-aligned value. Absent rather than invented when null, and
              never shown on a gated card. */}
          {!gate && deal.discount_value && (
            <span className="shrink-0 text-body font-medium text-accent">
              {deal.discount_value}
            </span>
          )}
        </div>

        {gate ? (
          <>
            <p className="mt-1 flex items-center gap-1.5 text-small font-medium text-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {gate.label}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">{gate.hint}</p>
          </>
        ) : (
          <>
            {deal.description && (
              <p className="mt-1 line-clamp-2 text-small text-muted-foreground">
                {deal.description}
              </p>
            )}

            {deal.watch_out && (
              <p className="mt-2 flex items-start gap-1.5 text-caption text-caveat">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">{deal.watch_out}</span>
              </p>
            )}

            {checked && <p className="mt-2 text-caption text-muted-faint">{checked}</p>}
          </>
        )}
      </div>
    </Link>
  );
}

/**
 * Editor-set only. `featured` is a column an admin sets; the badge the old card
 * showed was computed from list position, so the first card was always
 * "Featured" regardless of what anyone had decided.
 */
export function DealCardBadge({ featured }: { featured?: boolean | null }) {
  if (!featured) return null;
  return (
    <span className="rounded-tile border border-border px-2 py-0.5 text-caption text-muted-foreground">
      Featured
    </span>
  );
}

export default DealCard;
