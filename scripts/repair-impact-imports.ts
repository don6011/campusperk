const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminToken = process.env.GROWTH_ADMIN_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
}

const restUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
const authHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${adminToken || supabaseKey}`,
  "Content-Type": "application/json",
};

type AnyRow = Record<string, any>;

function enc(value: string) {
  return encodeURIComponent(value);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${restUrl}/${path}`, {
    ...init,
    headers: { ...authHeaders, ...(init.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

async function select(table: string, query: string) {
  return request<AnyRow[]>(`${table}?${query}`);
}

async function insert(table: string, body: AnyRow) {
  const rows = await request<AnyRow[]>(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return rows[0];
}

async function patch(table: string, query: string, body: AnyRow) {
  await request(`${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

function isBlankTitle(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "-" || normalized === "—";
}

function parseCommission(value: unknown) {
  const text = String(value || "");
  const match = text.replace("%", "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseCommissionType(value: unknown) {
  return String(value || "").includes("$") ? "flat" : "percentage";
}

async function loadCounts() {
  const [partners, deals, affiliateDeals] = await Promise.all([
    select("partners", `select=id,advertiser_id,affiliate_network&affiliate_network=eq.Impact&limit=5000`),
    select("deals", `select=id,title,partner_id,affiliate_network,is_affiliate&affiliate_network=eq.Impact&limit=5000`),
    select("affiliate_deals", `select=id,network,promoted_deal_id&network=eq.Impact&limit=5000`),
  ]);

  return {
    impactMerchants: partners.length,
    impactDeals: deals.length,
    importedAffiliateDeals: affiliateDeals.length,
    blankImpactDeals: deals.filter((deal) => deal.is_affiliate && isBlankTitle(deal.title)).length,
    unlinkedImpactDeals: deals.filter((deal) => deal.is_affiliate && !deal.partner_id).length,
  };
}

async function ensureStore(row: AnyRow) {
  const merchantName = row.merchant_name || "Impact Merchant";
  const existing = await select("stores", `select=id&name=eq.${enc(merchantName)}&limit=1`);
  if (existing[0]?.id) return existing[0].id;

  const created = await insert("stores", {
    name: merchantName,
    logo_url: row.merchant_logo || null,
    website_url: row.destination_url || null,
    categories: row.category ? [row.category] : [],
    student_discount_available: true,
  });
  return created.id;
}

async function ensurePartner(row: AnyRow) {
  const raw = row.raw_data || {};
  const advertiserId = raw.advertiser_id || null;
  const merchantName = row.merchant_name || "Impact Merchant";

  if (advertiserId) {
    const byAdvertiser = await select(
      "partners",
      `select=id&affiliate_network=eq.Impact&advertiser_id=eq.${enc(advertiserId)}&limit=1`
    );
    if (byAdvertiser[0]?.id) return byAdvertiser[0].id;
  }

  const byName = await select("partners", `select=id&partner_name=eq.${enc(merchantName)}&limit=1`);
  if (byName[0]?.id) {
    await patch("partners", `id=eq.${byName[0].id}`, {
      partner_type: "affiliate_network",
      affiliate_network: "Impact",
      advertiser_id: advertiserId,
      commission_percent: parseCommission(raw.commission_text || raw.commission_rate),
      approval_status: raw.approval_status || "approved",
      status: "active",
    });
    return byName[0].id;
  }

  const created = await insert("partners", {
    partner_name: merchantName,
    partner_type: "affiliate_network",
    logo_url: row.merchant_logo || null,
    website_url: row.destination_url || null,
    affiliate_network: "Impact",
    advertiser_id: advertiserId,
    commission_percent: parseCommission(raw.commission_text || raw.commission_rate),
    approval_status: raw.approval_status || "approved",
    status: "active",
  });
  return created.id;
}

async function repairFromAffiliateDeals() {
  const rows = await select("affiliate_deals", `select=*&network=eq.Impact&limit=5000`);
  let merchantsCreatedOrLinked = 0;
  let dealsRepaired = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const storeId = await ensureStore(row);
      const partnerId = await ensurePartner(row);
      merchantsCreatedOrLinked += 1;

      if (row.merchant_id) {
        await patch("affiliate_merchants", `id=eq.${row.merchant_id}`, { store_id: storeId, partner_id: partnerId });
      }

      if (row.promoted_deal_id) {
        const raw = row.raw_data || {};
        const title = isBlankTitle(row.offer_title) ? row.merchant_name : row.offer_title;
        await patch("deals", `id=eq.${row.promoted_deal_id}`, {
          title,
          store_id: storeId,
          partner_id: partnerId,
          partner_offer_id: row.partner_offer_id || null,
          category: row.category || null,
          discount_value: row.discount_value || row.coupon_code || title,
          affiliate_link_url: row.affiliate_url,
          direct_link_url: row.destination_url || null,
          affiliate_network: "Impact",
          commission_rate: parseCommission(raw.commission_text || raw.commission_rate),
          commission_type: parseCommissionType(raw.commission_text || raw.commission_rate),
          is_affiliate: true,
        });
        dealsRepaired += 1;
      }
    } catch (error) {
      errors += 1;
      console.error("Repair row failed", row.id, error instanceof Error ? error.message : error);
    }
  }

  return { merchantsCreatedOrLinked, dealsRepaired, errors };
}

async function repairBlankImpactDealsWithoutImportRows() {
  const deals = await select(
    "deals",
    `select=id,title,store_id,partner_id,stores(name,logo_url,website_url)&affiliate_network=eq.Impact&is_affiliate=eq.true&limit=5000`
  );
  let patched = 0;

  for (const deal of deals) {
    if (!isBlankTitle(deal.title)) continue;
    const store = Array.isArray(deal.stores) ? deal.stores[0] : deal.stores;
    const title = store?.name ? `${store.name} Student Offer` : "Impact Student Offer";
    await patch("deals", `id=eq.${deal.id}`, { title });
    patched += 1;
  }

  return patched;
}

async function main() {
  const before = await loadCounts();
  const repair = await repairFromAffiliateDeals();
  const blankPatched = await repairBlankImpactDealsWithoutImportRows();
  const after = await loadCounts();

  console.log(JSON.stringify({ before, repair, blankPatched, after }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
