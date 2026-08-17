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

/**
 * Count deals using the shared filter.
 *
 * This used to be `.select("id", { count: "exact", head: true })` with
 * `if (error) return 0; return count ?? 0`. Both exits reported "0 deals" for a
 * catalogue of seven, and neither left any trace: a failure and a genuinely
 * empty catalogue produced identical output, which is why the wrong number
 * survived several passes.
 *
 * The HTTP layer was never at fault — a HEAD with `Prefer: count=exact` returns
 * `content-range: 0-6/7` for both the anon and authenticated roles, and CORS
 * exposes Content-Range — so `count` was arriving null in the browser and being
 * silently floored. Rather than keep depending on a header, this reads the rows
 * and counts them, and throws on error so a caller can distinguish "failed"
 * from "none".
 *
 * Prefer deriving totals from data already on screen where possible; see
 * ExploreDeals, which counts its own grid rather than issuing this second query
 * that could disagree with it.
 */
export async function fetchActiveDealCount(): Promise<number> {
  const { data, error } = await supabase
    .from("deals")
    .select("id")
    .eq("status", ACTIVE_DEAL_STATUS)
    .eq(TEST_FIXTURE_COLUMN, false);
  if (error) throw error;
  return data?.length ?? 0;
}
