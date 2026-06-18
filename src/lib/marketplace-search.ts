export type AffiliateSearchFields = {
  merchant_name?: string | null;
  offer_title?: string | null;
  category?: string | null;
  raw_data?: Record<string, unknown> | null;
};

export type MarketplaceSearchableDeal = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  stores?: { name?: string | null } | null;
  store_name?: string | null;
  merchant_name?: string | null;
  merchant_display_name?: string | null;
  brand_name?: string | null;
  affiliateSearch?: AffiliateSearchFields[];
};

export type AffiliateSearchRow = AffiliateSearchFields & {
  promoted_deal_id?: string | null;
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const compact = (values: unknown[]) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

const rawValue = (raw: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!raw) return "";
  const entries = Object.entries(raw);
  for (const key of keys) {
    const match = entries.find(([rawKey]) => normalize(rawKey) === normalize(key));
    if (match?.[1]) return String(match[1]);
  }
  return "";
};

export function attachAffiliateSearchFields<T extends MarketplaceSearchableDeal>(
  deals: T[],
  affiliateRows: AffiliateSearchRow[],
): T[] {
  const byDealId = new Map<string, AffiliateSearchFields[]>();
  affiliateRows.forEach((row) => {
    if (!row.promoted_deal_id) return;
    const current = byDealId.get(row.promoted_deal_id) ?? [];
    current.push({
      merchant_name: row.merchant_name,
      offer_title: row.offer_title,
      category: row.category,
      raw_data: row.raw_data,
    });
    byDealId.set(row.promoted_deal_id, current);
  });

  return deals.map((deal) => ({
    ...deal,
    affiliateSearch: byDealId.get(deal.id) ?? deal.affiliateSearch ?? [],
  }));
}

function searchFields(deal: MarketplaceSearchableDeal) {
  const affiliate = deal.affiliateSearch ?? [];
  const affiliateRaw = affiliate.map((row) => row.raw_data).filter(Boolean) as Record<string, unknown>[];

  const merchant = compact([
    deal.merchant_name,
    deal.merchant_display_name,
    deal.brand_name,
    deal.store_name,
    deal.stores?.name,
    affiliate.map((row) => row.merchant_name),
    affiliateRaw.map((raw) => rawValue(raw, ["merchant_name", "merchant_display_name", "brand_name", "brand", "store_name", "Program Name", "Advertiser"])),
  ]);

  const title = compact([
    deal.title,
    affiliate.map((row) => row.offer_title),
    affiliateRaw.map((raw) => rawValue(raw, ["deal_title", "offer_title", "title", "Offer Title", "Promotion Name", "Deal Title", "Program Name", "Advertiser"])),
  ]);

  const category = compact([
    deal.category,
    affiliate.map((row) => row.category),
    affiliateRaw.map((raw) => rawValue(raw, ["category", "category_primary", "Advertiser Category"])),
  ]);

  const tags = compact([
    deal.tags,
    affiliateRaw.map((raw) => rawValue(raw, ["tags", "tag", "keywords"])),
  ]);

  const supporting = compact([
    deal.description,
    affiliateRaw.map((raw) => rawValue(raw, ["description", "offer_description", "brand_name", "brand", "store_name"])),
  ]);

  return { merchant, title, category, tags, supporting };
}

export function marketplaceSearchRank(deal: MarketplaceSearchableDeal, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  const fields = searchFields(deal);
  const exactMerchant = fields.merchant.some((value) => normalize(value) === q);
  if (exactMerchant) return 1;

  const exactTitle = fields.title.some((value) => normalize(value) === q);
  if (exactTitle) return 2;

  const partialMerchant = fields.merchant.some((value) => normalize(value).includes(q));
  if (partialMerchant) return 3;

  const partialTitle = fields.title.some((value) => normalize(value).includes(q));
  if (partialTitle) return 4;

  const categoryMatch = fields.category.some((value) => normalize(value).includes(q));
  if (categoryMatch) return 5;

  const tagMatch = fields.tags.some((value) => normalize(value).includes(q));
  if (tagMatch) return 6;

  const supportingMatch = fields.supporting.some((value) => normalize(value).includes(q));
  if (supportingMatch) return 7;

  return Number.POSITIVE_INFINITY;
}

export function filterAndRankDeals<T extends MarketplaceSearchableDeal>(deals: T[], query: string) {
  const q = query.trim();
  if (!q) return deals;

  return deals
    .map((deal, index) => ({ deal, index, rank: marketplaceSearchRank(deal, q) }))
    .filter((result) => Number.isFinite(result.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((result) => result.deal);
}
