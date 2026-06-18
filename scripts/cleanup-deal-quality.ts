import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeDealQuality, type QualityAffiliateRow, type QualityDeal } from "../src/lib/deal-quality";

type JsonRecord = Record<string, unknown>;

type DealRow = QualityDeal & {
  id: string;
  title: string;
  store_id: string | null;
  affiliate_link_url?: string | null;
  direct_link_url?: string | null;
};

type AffiliateDealRow = QualityAffiliateRow & {
  id: string;
  promoted_deal_id: string | null;
  display_title?: string | null;
  deal_quality_score?: number | null;
};

type CountSummary = {
  totalDeals: number;
  homepageEligibleDeals: number;
  lowQualityDeals: number;
  dealsMissingLogos: number;
  dealsMissingCleanTitles: number;
};

type CleanupResult = {
  before: CountSummary;
  updatedDeals: number;
  updatedAffiliateDeals: number;
  skippedRows: number;
  errors: string[];
  after: CountSummary;
};

type RangeQuery<T> = {
  range: (from: number, to: number) => Promise<{ data: T[] | null; error: { code?: string; message: string } | null }>;
};

function readEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (!fs.existsSync(".env")) return env;

  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, index).trim()] = value;
  }
  return env;
}

async function loadAll<T>(query: RangeQuery<T>): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function isMissingTitle(deal: QualityDeal, affiliate?: QualityAffiliateRow | null) {
  const title = String(deal.title || affiliate?.offer_title || "").trim();
  return !title || title === "Missing title" || title === "—";
}

function summarize(deals: DealRow[], affiliateByDealId: Map<string, AffiliateDealRow>): CountSummary {
  let homepageEligibleDeals = 0;
  let lowQualityDeals = 0;
  let dealsMissingLogos = 0;
  let dealsMissingCleanTitles = 0;

  for (const deal of deals) {
    const affiliate = affiliateByDealId.get(deal.id);
    const score = typeof deal.deal_quality_score === "number" && deal.deal_quality_score > 0
      ? deal.deal_quality_score
      : computeDealQuality(deal, affiliate).score;
    const hasLogo = Boolean(deal.stores?.logo_url || affiliate?.merchant_logo);

    if (deal.status === "active" && hasLogo && score >= 70) homepageEligibleDeals += 1;
    if (score < 70) lowQualityDeals += 1;
    if (!hasLogo) dealsMissingLogos += 1;
    if (isMissingTitle(deal, affiliate)) dealsMissingCleanTitles += 1;
  }

  return {
    totalDeals: deals.length,
    homepageEligibleDeals,
    lowQualityDeals,
    dealsMissingLogos,
    dealsMissingCleanTitles,
  };
}

async function runCleanup() {
  const env = readEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const token = env.GROWTH_ADMIN_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;

  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
  if (!token) throw new Error("Missing GROWTH_ADMIN_ACCESS_TOKEN. Set a fresh admin JWT locally before running this script.");

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const deals = await loadAll<DealRow>(
    supabase
      .from("deals")
      .select("*, stores(name, logo_url, website_url)")
      .order("updated_at", { ascending: false }),
  );

  const dealIds = deals.map((deal) => deal.id);
  const affiliateDeals = dealIds.length
    ? await loadAll<AffiliateDealRow>(
      supabase
        .from("affiliate_deals")
        .select("*")
        .in("promoted_deal_id", dealIds),
    )
    : [];

  const affiliateByDealId = new Map(
    affiliateDeals
      .filter((row) => row.promoted_deal_id)
      .map((row) => [row.promoted_deal_id as string, row]),
  );

  const result: CleanupResult = {
    before: summarize(deals, affiliateByDealId),
    updatedDeals: 0,
    updatedAffiliateDeals: 0,
    skippedRows: 0,
    errors: [],
    after: {
      totalDeals: 0,
      homepageEligibleDeals: 0,
      lowQualityDeals: 0,
      dealsMissingLogos: 0,
      dealsMissingCleanTitles: 0,
    },
  };

  for (const deal of deals) {
    const affiliate = affiliateByDealId.get(deal.id);
    const quality = computeDealQuality(deal, affiliate);

    try {
      const { error } = await supabase
        .from("deals")
        .update({
          display_title: quality.displayTitle,
          deal_quality_score: quality.score,
          quality_warnings: quality.warnings,
          quality_reviewed_at: new Date().toISOString(),
        })
        .eq("id", deal.id);
      if (error) throw error;
      deal.display_title = quality.displayTitle;
      deal.deal_quality_score = quality.score;
      result.updatedDeals += 1;

      if (affiliate?.id) {
        const { error: affiliateError } = await supabase
          .from("affiliate_deals")
          .update({
            display_title: quality.displayTitle,
            deal_quality_score: quality.score,
            quality_warnings: quality.warnings,
            quality_reviewed_at: new Date().toISOString(),
          })
          .eq("id", affiliate.id);
        if (affiliateError) throw affiliateError;
        affiliate.display_title = quality.displayTitle;
        affiliate.deal_quality_score = quality.score;
        result.updatedAffiliateDeals += 1;
      }
    } catch (error) {
      result.skippedRows += 1;
      result.errors.push(`${deal.title}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  result.after = summarize(deals, affiliateByDealId);
  return result;
}

runCleanup()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("JWT expired") || (typeof error === "object" && error && "code" in error && error.code === "PGRST303")) {
      console.error("GROWTH_ADMIN_ACCESS_TOKEN is expired. Retrieve a fresh admin access token from the current browser session, set it locally, then rerun: bun run cleanup:deal-quality");
    } else if (message.includes("deal_quality_score") || message.includes("display_title") || message.includes("quality_warnings")) {
      console.error("Deal quality columns are missing. Apply supabase/migrations/20260618020242_deal_quality_cleanup.sql, then rerun: bun run cleanup:deal-quality");
    } else {
      console.error(message);
    }
    process.exit(1);
  });
