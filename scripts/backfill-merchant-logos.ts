import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type AffiliateDeal = {
  id: string;
  merchant_id: string | null;
  promoted_deal_id: string | null;
  merchant_name: string;
  merchant_logo: string | null;
  network: string;
  affiliate_url: string | null;
  destination_url: string | null;
  raw_data: JsonRecord | null;
};

type AffiliateMerchant = {
  id: string;
  merchant_name: string;
  merchant_logo: string | null;
  website_url: string | null;
  store_id: string | null;
};

type Store = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
};

type BackfillResult = {
  beforeMissingLogoCount: number;
  updatedStores: number;
  updatedMerchants: number;
  updatedAffiliateDeals: number;
  updatedDeals: number;
  skippedRows: number;
  errors: string[];
  afterMissingLogoCount: number;
};

type RangeQuery<T> = {
  range: (from: number, to: number) => Promise<{ data: T[] | null; error: { code?: string; message: string } | null }>;
};

const SAFE_RAW_LOGO_KEYS = [
  "Logo URL",
  "Logo",
  "Image URL",
  "Image",
  "Creative URL",
  "Thumbnail URL",
  "merchant_logo",
  "logo_url",
  "image_url",
  "creative_url",
  "thumbnail",
];

const SAFE_RAW_DOMAIN_KEYS = [
  "Advertiser URL",
  "Website URL",
  "Website",
  "Landing Page",
  "Destination URL",
  "Merchant URL",
  "direct_url",
  "destination_url",
  "website_url",
];

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

function isFilled(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanUrl(value: unknown) {
  if (!isFilled(value)) return null;
  const raw = String(value).trim();
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function rootDomain(value: unknown) {
  const url = cleanUrl(value);
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname.includes(".")) return null;
    return hostname;
  } catch {
    return null;
  }
}

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function rawValue(raw: JsonRecord | null | undefined, keys: string[]) {
  if (!raw) return null;
  const entries = Object.entries(raw);
  for (const key of keys) {
    const found = entries.find(([rawKey]) => rawKey.toLowerCase() === key.toLowerCase());
    if (isFilled(found?.[1])) return String(found![1]).trim();
  }
  return null;
}

function bestLogoUrl(deal: AffiliateDeal, merchant?: AffiliateMerchant, store?: Store) {
  const existing = cleanUrl(store?.logo_url) || cleanUrl(merchant?.merchant_logo) || cleanUrl(deal.merchant_logo);
  if (existing) return existing;

  const rawLogo = cleanUrl(rawValue(deal.raw_data, SAFE_RAW_LOGO_KEYS));
  if (rawLogo) return rawLogo;

  const domain = rootDomain(merchant?.website_url)
    || rootDomain(store?.website_url)
    || rootDomain(deal.destination_url)
    || rootDomain(rawValue(deal.raw_data, SAFE_RAW_DOMAIN_KEYS))
    || rootDomain(deal.affiliate_url);

  return domain ? faviconUrl(domain) : null;
}

async function maybeUpdateDealLogoFields(supabase: ReturnType<typeof createClient>, dealId: string, logoUrl: string) {
  const { error } = await supabase.from("deals").update({ image_url: logoUrl, logo_url: logoUrl } as never).eq("id", dealId);
  if (!error) return { updated: 1, skipped: 0, error: null };

  const missingColumn = error.message.includes("image_url") || error.message.includes("logo_url") || error.code === "PGRST204";
  if (missingColumn) return { updated: 0, skipped: 1, error: null };
  return { updated: 0, skipped: 0, error: error.message };
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

async function runBackfill() {
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

  const result: BackfillResult = {
    beforeMissingLogoCount: 0,
    updatedStores: 0,
    updatedMerchants: 0,
    updatedAffiliateDeals: 0,
    updatedDeals: 0,
    skippedRows: 0,
    errors: [],
    afterMissingLogoCount: 0,
  };

  const affiliateDeals = await loadAll<AffiliateDeal>(
    supabase
      .from("affiliate_deals")
      .select("id, merchant_id, promoted_deal_id, merchant_name, merchant_logo, network, affiliate_url, destination_url, raw_data")
      .eq("network", "Impact"),
  );

  const merchantIds = [...new Set(affiliateDeals.map((deal) => deal.merchant_id).filter(Boolean) as string[])];
  const dealIds = [...new Set(affiliateDeals.map((deal) => deal.promoted_deal_id).filter(Boolean) as string[])];

  const affiliateMerchants = merchantIds.length
    ? await loadAll<AffiliateMerchant>(
      supabase
        .from("affiliate_merchants")
        .select("id, merchant_name, merchant_logo, website_url, store_id")
        .in("id", merchantIds),
    )
    : [];

  const merchantById = new Map(affiliateMerchants.map((merchant) => [merchant.id, merchant]));
  const storeIds = [...new Set(affiliateMerchants.map((merchant) => merchant.store_id).filter(Boolean) as string[])];
  const stores = storeIds.length
    ? await loadAll<Store>(
      supabase
        .from("stores")
        .select("id, name, logo_url, website_url")
        .in("id", storeIds),
    )
    : [];
  const storeById = new Map(stores.map((store) => [store.id, store]));

  result.beforeMissingLogoCount = affiliateDeals.filter((deal) => {
    const merchant = deal.merchant_id ? merchantById.get(deal.merchant_id) : undefined;
    const store = merchant?.store_id ? storeById.get(merchant.store_id) : undefined;
    return !store?.logo_url || !merchant?.merchant_logo || !deal.merchant_logo;
  }).length;

  for (const deal of affiliateDeals) {
    const merchant = deal.merchant_id ? merchantById.get(deal.merchant_id) : undefined;
    const store = merchant?.store_id ? storeById.get(merchant.store_id) : undefined;
    const logoUrl = bestLogoUrl(deal, merchant, store);

    if (!logoUrl) {
      result.skippedRows += 1;
      continue;
    }

    try {
      if (store && !store.logo_url) {
        const { error } = await supabase.from("stores").update({ logo_url: logoUrl }).eq("id", store.id);
        if (error) throw error;
        store.logo_url = logoUrl;
        result.updatedStores += 1;
      }

      if (merchant && !merchant.merchant_logo) {
        const { error } = await supabase.from("affiliate_merchants").update({ merchant_logo: logoUrl }).eq("id", merchant.id);
        if (error) throw error;
        merchant.merchant_logo = logoUrl;
        result.updatedMerchants += 1;
      }

      if (!deal.merchant_logo) {
        const { error } = await supabase.from("affiliate_deals").update({ merchant_logo: logoUrl }).eq("id", deal.id);
        if (error) throw error;
        deal.merchant_logo = logoUrl;
        result.updatedAffiliateDeals += 1;
      }

      if (deal.promoted_deal_id && dealIds.includes(deal.promoted_deal_id)) {
        const dealUpdate = await maybeUpdateDealLogoFields(supabase, deal.promoted_deal_id, logoUrl);
        result.updatedDeals += dealUpdate.updated;
        result.skippedRows += dealUpdate.skipped;
        if (dealUpdate.error) result.errors.push(`${deal.merchant_name}: ${dealUpdate.error}`);
      }
    } catch (error) {
      result.errors.push(`${deal.merchant_name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  result.afterMissingLogoCount = affiliateDeals.filter((deal) => {
    const merchant = deal.merchant_id ? merchantById.get(deal.merchant_id) : undefined;
    const store = merchant?.store_id ? storeById.get(merchant.store_id) : undefined;
    return !store?.logo_url || !merchant?.merchant_logo || !deal.merchant_logo;
  }).length;

  return result;
}

runBackfill()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("JWT expired") || (typeof error === "object" && error && "code" in error && error.code === "PGRST303")) {
      console.error("GROWTH_ADMIN_ACCESS_TOKEN is expired. Retrieve a fresh admin access token from the current browser session, set it locally, then rerun: bun run backfill:merchant-logos");
    } else {
      console.error(message);
    }
    process.exit(1);
  });
