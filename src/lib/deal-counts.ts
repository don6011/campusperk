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
 *   - is_test_fixture = false
 *
 * Any future change to what "counted" means belongs here and nowhere else.
 */
export const ACTIVE_DEAL_STATUS = "active" as const;

/**
 * Flag set by 20260813180000_truth_pass_2_test_fixtures.sql on deals owned by
 * `CampusPerk Security Test Store`. Those rows are status = 'active' and
 * visibility = 'public' because `npm run test:security` has to resolve them, but
 * they are fixtures, not inventory, and must never reach a student.
 *
 * NOTE: that migration has to be applied before this build ships — every public
 * deals query filters on the column.
 */
export const TEST_FIXTURE_COLUMN = "is_test_fixture";

/** Apply the shared "counted deal" filter to a deals query builder. */
export function withActiveDealFilter<T extends { eq: (column: string, value: string) => T }>(query: T): T {
  return query.eq("status", ACTIVE_DEAL_STATUS);
}

/** Client-side equivalent of the fixture filter, for already-fetched rows. */
export function isTestFixtureDeal(deal: { is_test_fixture?: boolean | null }): boolean {
  return deal.is_test_fixture === true;
}

/** Client-side equivalent of {@link withActiveDealFilter}, for already-fetched rows. */
export function isCountedDeal(deal: { status?: string | null; is_test_fixture?: boolean | null }): boolean {
  return deal.status === ACTIVE_DEAL_STATUS && !isTestFixtureDeal(deal);
}

/** Count deals using the shared filter. Returns 0 rather than throwing. */
export async function fetchActiveDealCount(): Promise<number> {
  const { count, error } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", ACTIVE_DEAL_STATUS)
    .eq(TEST_FIXTURE_COLUMN, false);
  if (error) return 0;
  return count ?? 0;
}
