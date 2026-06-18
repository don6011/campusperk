export type QualityAffiliateRow = {
  merchant_name?: string | null;
  merchant_logo?: string | null;
  offer_title?: string | null;
  affiliate_url?: string | null;
  destination_url?: string | null;
  discount_value?: string | null;
  coupon_code?: string | null;
  category?: string | null;
  raw_data?: Record<string, unknown> | null;
};

export type QualityDeal = {
  title?: string | null;
  display_title?: string | null;
  description?: string | null;
  discount_value?: string | null;
  category?: string | null;
  affiliate_link_url?: string | null;
  direct_link_url?: string | null;
  status?: string | null;
  deal_quality_score?: number | null;
  stores?: { name?: string | null; logo_url?: string | null; website_url?: string | null } | null;
  affiliateSearch?: QualityAffiliateRow[];
};

export type DealQualityResult = {
  score: number;
  displayTitle: string;
  warnings: string[];
};

const USEFUL_CATEGORIES = new Set([
  "technology",
  "tech",
  "education",
  "learning",
  "books",
  "productivity",
  "career",
  "travel",
  "finance",
  "software",
  "subscriptions",
  "student essentials",
  "local deals",
  "food",
  "clothing",
  "fashion",
  "transportation",
  "dorm living",
  "fitness",
  "entertainment",
]);

const LOW_TRUST_TERMS = [
  "casino",
  "gambling",
  "betting",
  "crypto",
  "forex",
  "adult",
  "payday",
  "loan",
  "sweepstake",
  "miracle",
  "unknown",
  "test",
];

const TITLE_BY_MERCHANT: Record<string, string> = {
  "adguard vpn": "AdGuard VPN Student Privacy Deal",
  "pdffiller": "pdfFiller Document Tools Discount",
  "signnow": "signNow E-Signature Deal",
  "dochub": "DocHub PDF Editing Deal",
  "icevpn": "IceVPN Privacy Deal",
};

const CATEGORY_SUFFIX: Record<string, string> = {
  software: "Software Deal",
  technology: "Tech Deal",
  tech: "Tech Deal",
  productivity: "Productivity Deal",
  education: "Student Learning Deal",
  learning: "Student Learning Deal",
  career: "Career Prep Deal",
  travel: "Student Travel Deal",
  finance: "Student Finance Deal",
  "student essentials": "Student Essentials Deal",
  "local deals": "Local Student Deal",
  food: "Student Food Deal",
  clothing: "Student Style Deal",
  fashion: "Student Style Deal",
};

const normalize = (value: unknown) => String(value ?? "").trim();
const lower = (value: unknown) => normalize(value).toLowerCase();
const hasText = (value: unknown) => normalize(value).length > 0;

const rawValue = (raw: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!raw) return "";
  const entries = Object.entries(raw);
  for (const key of keys) {
    const match = entries.find(([rawKey]) => lower(rawKey) === lower(key));
    if (hasText(match?.[1])) return normalize(match?.[1]);
  }
  return "";
};

export const cleanMerchantName = (deal: QualityDeal, affiliate?: QualityAffiliateRow | null) =>
  normalize(
    deal.stores?.name ||
      affiliate?.merchant_name ||
      rawValue(affiliate?.raw_data, ["Program Name", "Advertiser", "merchant_name", "brand_name", "store_name"]),
  );

export const cleanBaseTitle = (deal: QualityDeal, affiliate?: QualityAffiliateRow | null) =>
  normalize(
    deal.display_title ||
      affiliate?.offer_title ||
      deal.title ||
      rawValue(affiliate?.raw_data, ["Offer Title", "Promotion Name", "Deal Title", "Program Name", "Advertiser"]),
  );

export function buildDisplayTitle(deal: QualityDeal, affiliate?: QualityAffiliateRow | null) {
  const merchantName = cleanMerchantName(deal, affiliate);
  const baseTitle = cleanBaseTitle(deal, affiliate);
  const merchantKey = lower(merchantName);
  if (TITLE_BY_MERCHANT[merchantKey]) return TITLE_BY_MERCHANT[merchantKey];

  const titleKey = lower(baseTitle);
  if (TITLE_BY_MERCHANT[titleKey]) return TITLE_BY_MERCHANT[titleKey];

  if (merchantName && (!baseTitle || lower(baseTitle) === merchantKey)) {
    const suffix = CATEGORY_SUFFIX[lower(deal.category || affiliate?.category)] || "Student Deal";
    return `${merchantName} ${suffix}`;
  }

  return baseTitle || merchantName || "Student Deal";
}

function validHttpUrl(value: unknown) {
  if (!hasText(value)) return false;
  try {
    const parsed = new URL(normalize(value).startsWith("http") ? normalize(value) : `https://${normalize(value)}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasClearSavings(deal: QualityDeal, affiliate?: QualityAffiliateRow | null) {
  const savings = `${deal.discount_value || ""} ${affiliate?.discount_value || ""} ${affiliate?.coupon_code || ""}`;
  return /(\d+%|\$\d+|\bfree\b|\boff\b|\btrial\b|\bcredit\b|\bdeal\b|\bdiscount\b)/i.test(savings);
}

function readableName(value: string) {
  if (!value) return false;
  if (value.length < 2 || value.length > 80) return false;
  if (/^[\d\W_]+$/.test(value)) return false;
  if (/[{}[\]<>]/.test(value)) return false;
  return true;
}

export function computeDealQuality(deal: QualityDeal, affiliate?: QualityAffiliateRow | null): DealQualityResult {
  const warnings: string[] = [];
  let score = 0;
  const title = cleanBaseTitle(deal, affiliate);
  const displayTitle = buildDisplayTitle(deal, affiliate);
  const merchantName = cleanMerchantName(deal, affiliate);
  const logo = deal.stores?.logo_url || affiliate?.merchant_logo;
  const affiliateUrl = deal.affiliate_link_url || deal.direct_link_url || affiliate?.affiliate_url || affiliate?.destination_url;
  const category = lower(deal.category || affiliate?.category);
  const trustText = lower(`${merchantName} ${title} ${displayTitle}`);

  if (title && title !== "Missing title" && title.length >= 3) score += 18;
  else warnings.push("Missing clean title");

  if (displayTitle && displayTitle !== title) score += 8;

  if (logo && validHttpUrl(logo)) score += 18;
  else warnings.push("Missing logo");

  if (validHttpUrl(affiliateUrl)) score += 18;
  else warnings.push("Missing valid affiliate URL");

  if (hasClearSavings(deal, affiliate)) score += 14;
  else warnings.push("No clear savings");

  if (USEFUL_CATEGORIES.has(category)) score += 10;
  else warnings.push("Weak category");

  if (readableName(merchantName)) score += 8;
  else warnings.push("Unreadable merchant name");

  if (LOW_TRUST_TERMS.some((term) => trustText.includes(term))) {
    score -= 20;
    warnings.push("Low-trust merchant signal");
  } else {
    score += 6;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    displayTitle,
    warnings,
  };
}

export function getDealDisplayTitle(deal: QualityDeal) {
  return normalize(deal.display_title) || buildDisplayTitle(deal, deal.affiliateSearch?.[0]);
}

export function getStoredOrComputedQualityScore(deal: QualityDeal) {
  return typeof deal.deal_quality_score === "number" && deal.deal_quality_score > 0
    ? deal.deal_quality_score
    : computeDealQuality(deal, deal.affiliateSearch?.[0]).score;
}

export function isHomepageQualityEligible(deal: QualityDeal) {
  const score = getStoredOrComputedQualityScore(deal);
  const hasLogo = hasText(deal.stores?.logo_url || deal.affiliateSearch?.[0]?.merchant_logo);
  return deal.status === "active" && hasLogo && score >= 70;
}
