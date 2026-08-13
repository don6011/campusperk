import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for "how many deals does CampusPerk have".
 *
 * Explore, Categories and Account Settings each used to run their own `deals`
 * query and each reported a different total. The drift came from one filter:
 * Explore selected every row regardless of `status`, so it counted the four
 * non-active rows (expired / coming_soon) that the other two screens excluded.
 *
 * A deal is counted when it is publicly visible to a student right now:
 *   - status = 'active'
 *
 * Any future change to what "counted" means belongs here and nowhere else.
 */
export const ACTIVE_DEAL_STATUS = "active" as const;

/** Apply the shared "counted deal" filter to a deals query builder. */
export function withActiveDealFilter<T extends { eq: (column: string, value: string) => T }>(query: T): T {
  return query.eq("status", ACTIVE_DEAL_STATUS);
}

/** Client-side equivalent of {@link withActiveDealFilter}, for already-fetched rows. */
export function isCountedDeal(deal: { status?: string | null }): boolean {
  return deal.status === ACTIVE_DEAL_STATUS;
}

/** Count deals using the shared filter. Returns 0 rather than throwing. */
export async function fetchActiveDealCount(): Promise<number> {
  const { count, error } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", ACTIVE_DEAL_STATUS);
  if (error) return 0;
  return count ?? 0;
}
