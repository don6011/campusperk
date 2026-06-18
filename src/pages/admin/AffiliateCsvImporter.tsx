import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, Check, Download, FileSpreadsheet, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { computeDealQuality } from "@/lib/deal-quality";

type NetworkName = "CJ" | "Impact" | "Awin" | "ShareASale" | "Rakuten" | "Local Merchant";
type ImportMode = "merchants" | "deals";
type DuplicateMode = "skip" | "replace" | "merge";
type DealCategory = "Technology" | "Education" | "Productivity" | "Career" | "Travel" | "Finance" | "Software" | "Student Essentials" | "Local Deals";
type ImportField =
  | "merchant_name"
  | "deal_title"
  | "description"
  | "category"
  | "affiliate_network"
  | "advertiser_id"
  | "commission_rate"
  | "commission_text"
  | "coupon_code"
  | "affiliate_url"
  | "direct_url"
  | "image_url"
  | "expiration_date"
  | "discount_value"
  | "approval_status"
  | "deep_link_enabled";
type MerchantField =
  | "merchant_name"
  | "merchant_logo"
  | "merchant_description"
  | "affiliate_network"
  | "advertiser_id"
  | "website_url"
  | "status";

type DuplicateMatch = {
  id: string;
  title: string;
  reason: string;
  partner_offer_id?: string | null;
};

type ColumnDetection = {
  field: ImportField | MerchantField;
  label: string;
  header: string | null;
  required: boolean;
};

type NormalizedDeal = {
  id: string;
  merchant_name: string;
  deal_title: string;
  description: string;
  category: DealCategory;
  affiliate_network: NetworkName;
  advertiser_id: string;
  commission_rate: number | null;
  commission_text: string;
  coupon_code: string;
  affiliate_url: string;
  direct_url: string;
  image_url: string;
  expiration_date: string | null;
  source_file: string;
  import_date: string;
  active_status: "active" | "approved" | "expired" | "pending_review" | "rejected" | "unpublished";
  selected: boolean;
  approval_status: string;
  deep_link_enabled: boolean | null;
  quality_errors: string[];
  duplicate_matches: DuplicateMatch[];
};

type NormalizedMerchant = {
  id: string;
  merchant_name: string;
  merchant_logo: string;
  merchant_description: string;
  affiliate_network: NetworkName;
  advertiser_id: string;
  website_url: string;
  status: "active" | "paused" | "pending" | "archived" | "rejected";
  source_file: string;
  selected: boolean;
  quality_errors: string[];
  duplicate_matches: DuplicateMatch[];
};

type ImportSummary = {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
  replaced: number;
  merged: number;
  failed: number;
  rolledBack: boolean;
};

const NETWORKS: NetworkName[] = ["Impact", "ShareASale", "Awin", "CJ", "Rakuten", "Local Merchant"];
const CATEGORIES: DealCategory[] = ["Technology", "Education", "Productivity", "Career", "Travel", "Finance", "Software", "Student Essentials", "Local Deals"];
const APPROVED_TEMPLATE_NETWORKS: NetworkName[] = ["Impact", "ShareASale", "Awin", "CJ", "Rakuten"];

const TEMPLATE_HEADERS = [
  "merchant_name",
  "network",
  "advertiser_id",
  "deal_title",
  "description",
  "category",
  "discount_value",
  "coupon_code",
  "affiliate_url",
  "direct_url",
  "image_url",
  "commission_rate",
  "expiration_date",
];

const NETWORK_TEMPLATE_HEADERS: Partial<Record<NetworkName, string[]>> = {
  Impact: ["Advertiser", "Campaign ID", "Ad Name", "Description", "Category", "Tracking Link", "Landing Page", "Logo URL", "End Date", "Payout", "Promo Code"],
  ShareASale: ["Merchant", "Merchant ID", "Deal Title", "Deal Description", "Category", "Tracking Link", "Landing Page URL", "Logo URL", "End Date", "Commission", "Coupon Code"],
  Awin: ["Advertiser", "Programme ID", "Promotion Title", "Description", "Category", "Tracking URL", "Landing Page", "Logo URL", "Valid To", "Commission", "Voucher Code"],
  CJ: ["Advertiser", "Advertiser ID", "Link Name", "Description", "Category", "Click URL", "Destination URL", "Logo URL", "Promotion End Date", "Commission", "Coupon Code"],
  Rakuten: ["Advertiser", "MID", "Offer Name", "Description", "Category", "Tracking URL", "Landing Page URL", "Logo URL", "End Date", "Commission", "Coupon Code"],
};

const FIELD_LABELS: Record<ImportField, string> = {
  merchant_name: "Merchant name",
  deal_title: "Offer title",
  description: "Description",
  category: "Category",
  affiliate_network: "Affiliate network",
  advertiser_id: "Advertiser ID",
  commission_rate: "Commission",
  commission_text: "Commission text",
  coupon_code: "Coupon code",
  affiliate_url: "Affiliate tracking URL",
  direct_url: "Destination URL",
  image_url: "Merchant logo / creative",
  expiration_date: "Expiration date",
  discount_value: "Savings / discount",
  approval_status: "Approval status",
  deep_link_enabled: "Deep linking",
};

const MERCHANT_FIELD_LABELS: Record<MerchantField, string> = {
  merchant_name: "Merchant name",
  merchant_logo: "Merchant logo",
  merchant_description: "Description",
  affiliate_network: "Affiliate network",
  advertiser_id: "Advertiser ID",
  website_url: "Website URL",
  status: "Status",
};

const REQUIRED_IMPORT_FIELDS: ImportField[] = ["merchant_name", "deal_title", "affiliate_url"];
const REQUIRED_MERCHANT_FIELDS: MerchantField[] = ["merchant_name"];

const FIELD_ALIASES: Record<ImportField, string[]> = {
  merchant_name: ["merchant_name", "merchant", "advertiser", "advertiser_name", "brand", "brand_name", "store", "store_name", "program_name"],
  deal_title: ["deal_title", "title", "offer", "offer_name", "promotion", "promotion_name", "link_name", "text"],
  description: ["description", "offer_description", "promotion_description", "details", "terms", "short_description"],
  category: ["category", "vertical", "primary_category", "advertiser_category"],
  affiliate_network: ["network", "affiliate_network", "source", "network_name"],
  advertiser_id: ["advertiser_id", "advertiserid", "program_id", "campaign_id", "merchant_id", "sid"],
  commission_rate: ["commission_rate", "commission_percent", "commission", "payout", "default_commission"],
  commission_text: ["commission_text", "commission_rate", "commission_percent", "commission", "payout", "default_commission"],
  coupon_code: ["coupon_code", "coupon", "promo_code", "code", "voucher_code"],
  affiliate_url: ["affiliate_url", "affiliate_link", "affiliate_link_url", "tracking_link", "tracking_url", "click_url", "deeplink", "link_url"],
  direct_url: ["direct_url", "direct_link_url", "destination_url", "landing_page", "merchant_url", "url"],
  image_url: ["image_url", "logo_url", "creative_url", "image", "thumbnail", "banner_url"],
  expiration_date: ["expiration_date", "expires_at", "end_date", "valid_to", "date_end", "promotion_end_date"],
  discount_value: ["discount_value", "discount", "offer_value", "savings", "amount"],
  approval_status: ["approval_status", "contract_status", "status", "relationship_status"],
  deep_link_enabled: ["deep_link_enabled", "allows_deep_linking", "allow_deep_linking", "deep_linking"],
};

const MERCHANT_FIELD_ALIASES: Record<MerchantField, string[]> = {
  merchant_name: ["merchant_name", "merchant", "advertiser", "advertiser_name", "brand", "brand_name", "store", "store_name", "program_name", "program name", "name"],
  merchant_logo: ["merchant_logo", "logo", "logo_url", "image_url", "brand_logo", "creative_url"],
  merchant_description: ["merchant_description", "description", "about", "summary", "program_description"],
  affiliate_network: ["network", "affiliate_network", "source", "network_name"],
  advertiser_id: ["advertiser_id", "advertiserid", "program_id", "program id", "campaign_id", "merchant_id", "mid", "sid"],
  website_url: ["website_url", "website", "merchant_url", "advertiser_url", "destination_url", "landing_page", "url"],
  status: ["status", "approval_status", "contract_status", "contract status", "merchant_status"],
};

const NETWORK_FIELD_ALIASES: Partial<Record<NetworkName, Partial<Record<ImportField, string[]>>>> = {
  Impact: {
    merchant_name: ["Program Name", "Advertiser", "Advertiser Name", "Campaign", "Campaign Name", "Brand"],
    advertiser_id: ["Advertiser Program ID", "Program ID", "Advertiser ID", "Campaign ID", "CampaignId", "Id"],
    deal_title: ["Offer Title", "Promotion Name", "Deal Title", "Program Name", "Advertiser", "Ad Name", "Promotion Title", "Deal Name", "Name", "Title"],
    description: ["Description", "Promotion Description", "Terms", "Ad Description"],
    category: ["Advertiser Category", "Category", "Vertical", "Campaign Category"],
    affiliate_url: ["Tracking Link", "Tracking URL", "Click URL", "Ad URL", "Landing Page Tracking URL"],
    direct_url: ["Landing Page", "Destination URL", "Advertiser URL"],
    image_url: ["Logo", "Logo URL", "Image URL", "Creative URL", "Thumbnail URL"],
    expiration_date: ["End Date", "Expiration Date", "Promotion End Date"],
    commission_rate: ["Payout", "Commission", "Default Payout"],
    commission_text: ["Payout", "Commission", "Default Payout"],
    coupon_code: ["Promo Code", "Coupon Code", "Code"],
    approval_status: ["Contract Status", "Approval Status", "Status"],
    deep_link_enabled: ["Allows Deep Linking", "Allow Deep Linking", "Deep Linking"],
  },
  ShareASale: {
    merchant_name: ["Merchant", "Merchant Name", "Program Name"],
    advertiser_id: ["Merchant ID", "MerchantID", "Program ID"],
    deal_title: ["Deal Title", "Coupon Title", "Title", "Name"],
    description: ["Deal Description", "Description", "Restrictions", "Terms"],
    category: ["Category", "Merchant Category"],
    affiliate_url: ["Link", "Tracking Link", "Affiliate Link", "Click URL"],
    direct_url: ["Landing Page URL", "Merchant URL", "URL"],
    image_url: ["Banner URL", "Logo URL", "Image URL"],
    expiration_date: ["End Date", "Expires", "Expiration Date"],
    commission_rate: ["Commission", "Sale Commission", "Payout"],
    coupon_code: ["Coupon Code", "Code"],
  },
  Awin: {
    merchant_name: ["Advertiser", "Advertiser Name", "Programme Name", "Program Name"],
    advertiser_id: ["Advertiser ID", "Programme ID", "Program ID"],
    deal_title: ["Promotion", "Promotion Title", "Offer Title", "Name", "Title"],
    description: ["Description", "Terms", "Voucher Description"],
    category: ["Category", "Sector", "Vertical"],
    affiliate_url: ["Tracking URL", "Deeplink", "Click URL", "AW Deep Link"],
    direct_url: ["Landing Page", "Destination URL", "URL"],
    image_url: ["Logo URL", "Image URL", "Creative URL"],
    expiration_date: ["End Date", "Valid To", "Expiry Date"],
    commission_rate: ["Commission", "Default Commission", "Payout"],
    coupon_code: ["Voucher Code", "Code", "Coupon"],
  },
  CJ: {
    merchant_name: ["Advertiser", "Advertiser Name", "Program Name"],
    advertiser_id: ["Advertiser ID", "CID", "Program ID"],
    deal_title: ["Link Name", "Promotion", "Offer", "Title", "Name"],
    description: ["Description", "Promotion Description", "Link Description"],
    category: ["Category", "Advertiser Category"],
    affiliate_url: ["Click URL", "Tracking URL", "Link URL", "Buy URL"],
    direct_url: ["Destination URL", "Advertiser URL", "Landing Page"],
    image_url: ["Logo URL", "Image URL", "Creative URL"],
    expiration_date: ["End Date", "Promotion End Date", "Expires"],
    commission_rate: ["Commission", "Payout", "Action Commission"],
    coupon_code: ["Coupon Code", "Promotion Code", "Code"],
  },
  Rakuten: {
    merchant_name: ["Advertiser", "Advertiser Name", "Merchant", "Merchant Name", "Program Name"],
    advertiser_id: ["MID", "Merchant ID", "Advertiser ID", "Program ID"],
    deal_title: ["Offer Name", "Link Name", "Promotion", "Title", "Name"],
    description: ["Description", "Offer Description", "Terms"],
    category: ["Category", "Advertiser Category", "Vertical"],
    affiliate_url: ["Tracking URL", "Click URL", "Affiliate Link", "Link URL"],
    direct_url: ["Landing Page URL", "Destination URL", "Advertiser URL"],
    image_url: ["Logo URL", "Image URL", "Creative URL"],
    expiration_date: ["End Date", "Expiration Date", "Expires"],
    commission_rate: ["Commission", "Payout", "Default Commission"],
    coupon_code: ["Coupon Code", "Promo Code", "Code"],
  },
};

const CATEGORY_KEYWORDS: Record<DealCategory, string[]> = {
  Technology: ["laptop", "computer", "tablet", "phone", "tech", "hardware", "electronics", "device", "gadget"],
  Education: ["course", "learn", "textbook", "book", "tutor", "education", "study", "exam", "certification"],
  Productivity: ["productivity", "notes", "notion", "calendar", "planner", "workspace", "project", "task"],
  Career: ["career", "resume", "job", "internship", "interview", "linkedin", "portfolio", "professional"],
  Travel: ["travel", "flight", "hotel", "train", "amtrak", "trip", "luggage", "rental"],
  Finance: ["bank", "credit", "finance", "loan", "budget", "invest", "tax", "insurance"],
  Software: ["software", "app", "saas", "cloud", "developer", "code", "design", "adobe", "github"],
  "Student Essentials": ["student", "dorm", "food", "meal", "clothing", "backpack", "supplies", "subscription"],
  "Local Deals": ["local", "restaurant", "coffee", "campus", "city", "salon", "gym", "pizza"],
};

function canonical(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function duplicateKeyFor(row: Pick<NormalizedDeal, "merchant_name" | "deal_title" | "coupon_code" | "affiliate_url" | "direct_url">) {
  return canonical(`${row.merchant_name}|${row.deal_title}|${row.coupon_code}|${row.affiliate_url || row.direct_url}`);
}

function aliasesFor(network: NetworkName, key: ImportField) {
  return [...(NETWORK_FIELD_ALIASES[network]?.[key] || []), ...FIELD_ALIASES[key]];
}

function merchantAliasesFor(key: MerchantField) {
  return MERCHANT_FIELD_ALIASES[key];
}

function valueForHeader(row: Record<string, string>, headerName: string) {
  const canonicalHeader = canonical(headerName);
  const found = Object.entries(row).find(([header]) => canonical(header) === canonicalHeader);
  return found?.[1]?.trim() || "";
}

function firstValue(row: Record<string, string>, key: ImportField, network: NetworkName) {
  for (const alias of aliasesFor(network, key)) {
    const value = valueForHeader(row, alias);
    if (value) return value;
  }
  return "";
}

function firstRawValue(row: Record<string, string>, headers: string[]) {
  for (const header of headers) {
    const value = valueForHeader(row, header);
    if (value) return value;
  }
  return "";
}

function impactDealTitle(row: Record<string, string>) {
  const explicitTitle = firstRawValue(row, ["Offer Title", "Promotion Name", "Deal Title"]);
  if (explicitTitle) return explicitTitle;

  const programName = firstRawValue(row, ["Program Name"]);
  if (programName) return programName;

  const advertiser = firstRawValue(row, ["Advertiser"]);
  if (advertiser) return advertiser;

  return "Impact Affiliate Offer";
}

function dealTitleFallback(row: Record<string, string>, networkName: NetworkName) {
  const explicitTitle = firstRawValue(row, ["Offer Title", "Promotion Name", "Deal Title"]);
  if (explicitTitle) return explicitTitle;

  const mappedTitle = firstValue(row, "deal_title", networkName);
  if (mappedTitle) return mappedTitle;

  const programName = firstRawValue(row, ["Program Name"]);
  if (programName) return programName;

  const advertiser = firstRawValue(row, ["Advertiser"]);
  if (advertiser) return advertiser;

  return programName ? `${programName} Affiliate Offer` : "";
}

function firstMerchantValue(row: Record<string, string>, key: MerchantField) {
  for (const alias of merchantAliasesFor(key)) {
    const value = valueForHeader(row, alias);
    if (value) return value;
  }
  return "";
}

function detectedHeader(headers: string[], key: ImportField, network: NetworkName) {
  const aliases = aliasesFor(network, key).map(canonical);
  return headers.find((header) => aliases.includes(canonical(header))) || null;
}

function detectedMerchantHeader(headers: string[], key: MerchantField) {
  const aliases = merchantAliasesFor(key).map(canonical);
  return headers.find((header) => aliases.includes(canonical(header))) || null;
}

function hasHeaders(headers: string[], required: string[]) {
  const normalizedHeaders = new Set(headers.map(canonical));
  return required.every((header) => normalizedHeaders.has(canonical(header)));
}

function isImpactAdvertiserExport(headers: string[]) {
  return (
    hasHeaders(headers, ["Advertiser", "Program ID", "Program Name", "Tracking Link", "Payout"]) ||
    hasHeaders(headers, ["Advertiser Program ID", "Program Name", "Tracking Link", "Payout"])
  );
}

function detectTemplate(headers: string[], fallback: NetworkName): NetworkName {
  if (isImpactAdvertiserExport(headers)) return "Impact";

  const scores = APPROVED_TEMPLATE_NETWORKS.map((networkName) => {
    const score = (Object.keys(FIELD_ALIASES) as ImportField[]).filter((field) => detectedHeader(headers, field, networkName)).length;
    return { networkName, score };
  }).sort((a, b) => b.score - a.score);
  return scores[0]?.score >= 3 ? scores[0].networkName : fallback;
}

function buildColumnDetection(headers: string[], network: NetworkName): ColumnDetection[] {
  return (Object.keys(FIELD_LABELS) as ImportField[]).map((field) => ({
    field,
    label: FIELD_LABELS[field],
    header: detectedHeader(headers, field, network),
    required: REQUIRED_IMPORT_FIELDS.includes(field),
  }));
}

function buildMerchantColumnDetection(headers: string[]): ColumnDetection[] {
  return (Object.keys(MERCHANT_FIELD_LABELS) as MerchantField[]).map((field) => ({
    field,
    label: MERCHANT_FIELD_LABELS[field],
    header: detectedMerchantHeader(headers, field),
    required: REQUIRED_MERCHANT_FIELDS.includes(field),
  }));
}

export function parseAffiliateCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (values[index] || "").trim();
    });
    return record;
  });
}

function parseWorkbook(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), value instanceof Date ? value.toISOString() : String(value ?? "").trim()]))
  );
}

function parseImportFile(file: File): Promise<Record<string, string>[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.onload = () => {
      try {
        if (extension === "xlsx" || extension === "xls") {
          resolve(parseWorkbook(reader.result as ArrayBuffer));
        } else {
          resolve(parseAffiliateCSV(String(reader.result || "")));
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Unable to parse file."));
      }
    };
    if (extension === "xlsx" || extension === "xls") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

function inferNetwork(raw: string, fallback: NetworkName): NetworkName {
  const value = raw.toLowerCase();
  if (value.includes("impact")) return "Impact";
  if (value.includes("awin")) return "Awin";
  if (value.includes("share")) return "ShareASale";
  if (value.includes("rakuten") || value.includes("linkshare")) return "Rakuten";
  if (value.includes("cj") || value.includes("commission junction")) return "CJ";
  return fallback;
}

function isValidUrl(value: string) {
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidImageUrl(value: string) {
  if (!value.trim()) return true;
  if (!isValidUrl(value)) return false;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(value) || value.includes("image") || value.includes("logo");
}

function parseCommission(value: string) {
  const match = value.replace("%", "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseCommissionType(value: string) {
  return value.includes("$") ? "flat" : "percentage";
}

function normalizeApprovalStatus(value: string) {
  const status = value.toLowerCase();
  if (status.includes("approved") || status.includes("active") || status.includes("joined")) return "approved";
  if (status.includes("reject") || status.includes("declined")) return "rejected";
  if (status.includes("pending") || status.includes("applied")) return "pending";
  return value.trim() ? status.replace(/\s+/g, "_") : "approved";
}

function parseBooleanLike(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "y", "1", "enabled", "allowed"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "disabled", "not allowed"].includes(normalized)) return false;
  return null;
}

function parseExpiration(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function inferCategory(row: Pick<NormalizedDeal, "merchant_name" | "deal_title" | "description">, rawCategory: string): DealCategory {
  const combined = `${rawCategory} ${row.merchant_name} ${row.deal_title} ${row.description}`.toLowerCase();
  let best: { category: DealCategory; score: number } = { category: "Student Essentials", score: 0 };
  CATEGORIES.forEach((category) => {
    const score = CATEGORY_KEYWORDS[category].filter((word) => combined.includes(word)).length;
    if (score > best.score) best = { category, score };
  });
  return best.category;
}

function normalizeDeal(raw: Record<string, string>, index: number, sourceFile: string, selectedNetwork: NetworkName): NormalizedDeal {
  const effectiveNetwork = isImpactAdvertiserExport(Object.keys(raw)) ? "Impact" : selectedNetwork;
  const merchantName = firstValue(raw, "merchant_name", effectiveNetwork);
  const programName = firstRawValue(raw, ["Program Name"]) || merchantName || firstRawValue(raw, ["Advertiser"]);
  const advertiserName = firstRawValue(raw, ["Advertiser"]);
  const mappedTitle = effectiveNetwork === "Impact"
    ? impactDealTitle(raw)
    : dealTitleFallback(raw, effectiveNetwork);
  const base = {
    merchant_name: merchantName || programName,
    deal_title: mappedTitle || programName || merchantName || advertiserName || "Impact Affiliate Offer",
    description: firstValue(raw, "description", effectiveNetwork),
  };
  const affiliate_url = firstValue(raw, "affiliate_url", effectiveNetwork);
  const direct_url = firstValue(raw, "direct_url", effectiveNetwork);
  const expiration_date = parseExpiration(firstValue(raw, "expiration_date", effectiveNetwork));
  const image_url = firstValue(raw, "image_url", effectiveNetwork);
  const category = inferCategory(base, firstValue(raw, "category", effectiveNetwork));
  const commissionText = firstValue(raw, "commission_text", effectiveNetwork) || firstValue(raw, "commission_rate", effectiveNetwork);
  const quality_errors: string[] = [];

  if (!base.merchant_name) quality_errors.push("Blank merchant");
  if (!base.deal_title) quality_errors.push("Blank title");
  if (!affiliate_url) quality_errors.push("Missing affiliate tracking URL");
  if (affiliate_url && !isValidUrl(affiliate_url)) quality_errors.push("Malformed affiliate link");
  if (direct_url && !isValidUrl(direct_url)) quality_errors.push("Malformed destination URL");
  if (!isValidImageUrl(image_url)) quality_errors.push("Invalid image URL");
  if (expiration_date && new Date(expiration_date).getTime() < Date.now()) quality_errors.push("Expired deal");

  return {
    id: `deal-${Date.now()}-${index}`,
    ...base,
    category,
    affiliate_network: inferNetwork(firstValue(raw, "affiliate_network", effectiveNetwork), effectiveNetwork),
    advertiser_id: firstValue(raw, "advertiser_id", effectiveNetwork),
    commission_rate: parseCommission(commissionText),
    commission_text: commissionText,
    coupon_code: firstValue(raw, "coupon_code", effectiveNetwork) || firstValue(raw, "discount_value", effectiveNetwork),
    affiliate_url,
    direct_url,
    image_url,
    expiration_date,
    source_file: sourceFile,
    import_date: new Date().toISOString(),
    active_status: quality_errors.length ? "rejected" : "approved",
    selected: true,
    approval_status: normalizeApprovalStatus(firstValue(raw, "approval_status", effectiveNetwork)),
    deep_link_enabled: parseBooleanLike(firstValue(raw, "deep_link_enabled", effectiveNetwork)),
    quality_errors,
    duplicate_matches: [],
  };
}

function ensurePreviewTitle(row: NormalizedDeal): NormalizedDeal {
  const fallbackTitle = row.deal_title || row.merchant_name || "Impact Affiliate Offer";
  if (fallbackTitle === row.deal_title) return row;

  const quality_errors = row.quality_errors.filter((error) => error !== "Blank title");
  return {
    ...row,
    deal_title: fallbackTitle,
    active_status: quality_errors.length ? "rejected" : "approved",
    quality_errors,
  };
}

function normalizeStatus(value: string): NormalizedMerchant["status"] {
  const status = value.toLowerCase();
  if (status.includes("pause")) return "paused";
  if (status.includes("archive")) return "archived";
  if (status.includes("pending")) return "pending";
  if (status.includes("reject")) return "rejected";
  return "active";
}

function normalizeMerchant(raw: Record<string, string>, index: number, sourceFile: string, selectedNetwork: NetworkName): NormalizedMerchant {
  const merchant_name = firstMerchantValue(raw, "merchant_name");
  const merchant_logo = firstMerchantValue(raw, "merchant_logo");
  const website_url = firstMerchantValue(raw, "website_url");
  const quality_errors: string[] = [];

  if (!merchant_name) quality_errors.push("Blank merchant");
  if (merchant_logo && !isValidImageUrl(merchant_logo)) quality_errors.push("Invalid logo URL");
  if (website_url && !isValidUrl(website_url)) quality_errors.push("Invalid website URL");

  return {
    id: `merchant-${Date.now()}-${index}`,
    merchant_name,
    merchant_logo,
    merchant_description: firstMerchantValue(raw, "merchant_description"),
    affiliate_network: inferNetwork(firstMerchantValue(raw, "affiliate_network"), selectedNetwork),
    advertiser_id: firstMerchantValue(raw, "advertiser_id"),
    website_url,
    status: quality_errors.length ? "rejected" : normalizeStatus(firstMerchantValue(raw, "status")),
    source_file: sourceFile,
    selected: true,
    quality_errors,
    duplicate_matches: [],
  };
}

function downloadTemplate(networkName: NetworkName) {
  const headers = NETWORK_TEMPLATE_HEADERS[networkName] || TEMPLATE_HEADERS;
  const sampleValues = headers.map((header) => {
    const key = canonical(header);
    if (key.includes("merchant") || key.includes("advertiser")) return "Example Merchant";
    if (key.includes("id") || key.includes("campaign") || key.includes("programme")) return "ADV-123";
    if (key.includes("name") || key.includes("title") || key.includes("promotion") || key.includes("link")) return "Student Exclusive Offer";
    if (key.includes("description") || key.includes("terms")) return "20% off for verified students";
    if (key.includes("category")) return "Software";
    if (key.includes("tracking") || key.includes("click") || key.includes("affiliate")) return "https://example.com/affiliate";
    if (key.includes("landing") || key.includes("destination")) return "https://example.com";
    if (key.includes("logo") || key.includes("image")) return "https://example.com/logo.png";
    if (key.includes("date") || key.includes("valid") || key.includes("expires")) return "2026-12-31";
    if (key.includes("commission") || key.includes("payout")) return "8%";
    if (key.includes("code") || key.includes("coupon") || key.includes("voucher")) return "STUDENT20";
    return "";
  });
  const sample = [headers.join(","), sampleValues.map((value) => `"${value}"`).join(",")].join("\n");
  const blob = new Blob([sample], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `campusperk-${networkName.toLowerCase().replace(/\s+/g, "-")}-affiliate-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildDealDescription(row: NormalizedDeal) {
  const pieces = [row.description];
  if (row.coupon_code) pieces.push(`Coupon code: ${row.coupon_code}`);
  pieces.push(`Source: ${row.affiliate_network}${row.source_file ? ` / ${row.source_file}` : ""}`);
  return pieces.filter(Boolean).join("\n\n");
}

export default function AffiliateCsvImporter() {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [importMode, setImportMode] = useState<ImportMode>("deals");
  const [rows, setRows] = useState<NormalizedDeal[]>([]);
  const [merchantRows, setMerchantRows] = useState<NormalizedMerchant[]>([]);
  const [network, setNetwork] = useState<NetworkName>("Impact");
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [sourceFile, setSourceFile] = useState<string>("");
  const [columnDetection, setColumnDetection] = useState<ColumnDetection[]>([]);
  const [detectedNetwork, setDetectedNetwork] = useState<NetworkName | null>(null);

  const readyRows = rows.filter((row) => row.selected && row.active_status === "approved" && row.quality_errors.length === 0 && (duplicateMode !== "skip" || row.duplicate_matches.length === 0));
  const duplicateRows = rows.filter((row) => row.duplicate_matches.length > 0);
  const rejectedRows = rows.filter((row) => row.quality_errors.length > 0);
  const approvedRows = rows.filter((row) => row.active_status === "approved");
  const pendingRows = rows.filter((row) => row.active_status === "pending_review");
  const selectedRows = rows.filter((row) => row.selected);
  const successRate = selectedRows.length ? Math.round((readyRows.length / selectedRows.length) * 100) : 0;
  const selectedMerchantRows = merchantRows.filter((row) => row.selected);
  const merchantDuplicateRows = merchantRows.filter((row) => row.duplicate_matches.length > 0);
  const merchantRejectedRows = merchantRows.filter((row) => row.quality_errors.length > 0);
  const readyMerchantRows = merchantRows.filter((row) => row.selected && row.quality_errors.length === 0 && row.status !== "rejected" && (duplicateMode !== "skip" || row.duplicate_matches.length === 0));
  const activePreviewRows = importMode === "deals" ? rows.length : merchantRows.length;

  const { data: importHistory = [] } = useQuery({
    queryKey: ["affiliate-import-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_import_logs" as any)
        .select("id, network, source_file, status, total_rows, approved_rows, published_rows, duplicate_rows, rejected_rows, error_message, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data || []) as {
        id: string;
        network: string;
        source_file: string | null;
        status: string;
        total_rows: number;
        approved_rows: number;
        published_rows: number;
        duplicate_rows: number;
        rejected_rows: number;
        error_message: string | null;
        created_at: string;
        completed_at: string | null;
      }[];
    },
  });

  const analytics = useMemo(() => {
    const by = (key: keyof Pick<NormalizedDeal, "affiliate_network" | "merchant_name" | "category">) => {
      const map = new Map<string, number>();
      rows.forEach((row) => map.set(String(row[key] || "Unknown"), (map.get(String(row[key] || "Unknown")) || 0) + 1));
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    };
    return {
      byNetwork: by("affiliate_network"),
      byMerchant: by("merchant_name"),
      byCategory: by("category"),
    };
  }, [rows]);

  const merchantAnalytics = useMemo(() => {
    const map = new Map<string, number>();
    merchantRows.forEach((row) => map.set(row.affiliate_network, (map.get(row.affiliate_network) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [merchantRows]);

  const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    parseImportFile(file)
      .then(async (parsed) => {
      const headers = Object.keys(parsed[0] || {});
      const templateNetwork = detectTemplate(headers, network);
      if (importMode === "merchants") {
        const normalizedMerchants = parsed.map((row, index) => normalizeMerchant(row, index, file.name, templateNetwork));
        await detectMerchantDuplicates(normalizedMerchants);
        setMerchantRows(normalizedMerchants);
        setRows([]);
        setColumnDetection(buildMerchantColumnDetection(headers));
        toast({ title: "Merchant file loaded", description: `${normalizedMerchants.length} merchants previewed from ${file.name}.` });
      } else {
        const normalized = parsed.map((row, index) => ensurePreviewTitle(normalizeDeal(row, index, file.name, templateNetwork)));
        await detectDuplicates(normalized);
        setRows(normalized);
        setMerchantRows([]);
        setColumnDetection(buildColumnDetection(headers, templateNetwork));
        toast({ title: "Deal file loaded", description: `${normalized.length} offers normalized from ${file.name} using the ${templateNetwork} template.` });
      }
      setNetwork(templateNetwork);
      setDetectedNetwork(templateNetwork);
      setSourceFile(file.name);
      setSummary(null);
      })
      .catch((error: Error) => {
        toast({ title: "File import failed", description: error.message, variant: "destructive" });
      });
    event.target.value = "";
  };

  const detectMerchantDuplicates = async (normalized: NormalizedMerchant[]) => {
    const [{ data: stores }, { data: partners }, { data: affiliateMerchants }] = await Promise.all([
      supabase.from("stores").select("id, name").limit(2000),
      supabase.from("partners" as any).select("id, partner_name, affiliate_network").limit(2000),
      supabase.from("affiliate_merchants" as any).select("id, merchant_name, network, advertiser_id").limit(2000),
    ]);
    const storeRows = (stores || []) as any[];
    const partnerRows = (partners || []) as any[];
    const affiliateRows = (affiliateMerchants || []) as any[];

    normalized.forEach((row) => {
      const merchant = canonical(row.merchant_name);
      const advertiser = canonical(row.advertiser_id);
      const matches: DuplicateMatch[] = [];
      storeRows.forEach((store) => {
        if (merchant && canonical(store.name || "") === merchant) matches.push({ id: store.id, title: store.name, reason: "existing store" });
      });
      partnerRows.forEach((partner) => {
        if (merchant && canonical(partner.partner_name || "") === merchant) matches.push({ id: partner.id, title: partner.partner_name, reason: "existing partner" });
      });
      affiliateRows.forEach((existing) => {
        const sameName = merchant && canonical(existing.merchant_name || "") === merchant && existing.network === row.affiliate_network;
        const sameAdvertiser = advertiser && canonical(existing.advertiser_id || "") === advertiser && existing.network === row.affiliate_network;
        if (sameName || sameAdvertiser) matches.push({ id: existing.id, title: existing.merchant_name, reason: sameAdvertiser ? "advertiser ID" : "network + merchant" });
      });
      row.duplicate_matches = matches;
    });
  };

  const detectDuplicates = async (normalized: NormalizedDeal[]) => {
    const [{ data: existingDeals }, { data: existingAffiliateDeals }] = await Promise.all([
      supabase
        .from("deals")
        .select("id, title, partner_offer_id, affiliate_link_url, direct_link_url, discount_value, stores(name)")
        .limit(2000),
      supabase
        .from("affiliate_deals" as any)
        .select("id, promoted_deal_id, partner_offer_id, merchant_name, offer_title, coupon_code, affiliate_url, destination_url, duplicate_key")
        .limit(2000),
    ]);
    const existing = (existingDeals || []) as any[];
    const existingImports = (existingAffiliateDeals || []) as any[];

    normalized.forEach((row) => {
      const merchant = canonical(row.merchant_name);
      const title = canonical(row.deal_title);
      const coupon = canonical(row.coupon_code || row.deal_title);
      const urls = [row.affiliate_url, row.direct_url].filter(Boolean).map((url) => url.toLowerCase());
      const marketplaceMatches = existing
        .map((deal) => {
          const dealMerchant = canonical(deal.stores?.name || "");
          const dealTitle = canonical(deal.title || "");
          const dealUrls = [deal.affiliate_link_url, deal.direct_link_url].filter(Boolean).map((url: string) => url.toLowerCase());
          const reasons: string[] = [];
          if (merchant && dealMerchant && merchant === dealMerchant && title && title === dealTitle) reasons.push("merchant + title");
          if (urls.some((url) => dealUrls.includes(url))) reasons.push("destination URL");
          if (coupon && canonical(deal.discount_value || "") === coupon) reasons.push("coupon");
          return reasons.length ? { id: deal.id, title: deal.title, reason: reasons.join(", "), partner_offer_id: deal.partner_offer_id } : null;
        })
        .filter(Boolean) as DuplicateMatch[];
      const importMatches = existingImports
        .map((deal) => {
          const reasons: string[] = [];
          const dealUrls = [deal.affiliate_url, deal.destination_url].filter(Boolean).map((url: string) => url.toLowerCase());
          if (duplicateKeyFor(row) && deal.duplicate_key === duplicateKeyFor(row)) reasons.push("import duplicate key");
          if (merchant && canonical(deal.merchant_name || "") === merchant && title && canonical(deal.offer_title || "") === title) reasons.push("merchant + title");
          if (urls.some((url) => dealUrls.includes(url))) reasons.push("destination URL");
          if (coupon && canonical(deal.coupon_code || "") === coupon) reasons.push("coupon");
          return reasons.length ? { id: deal.promoted_deal_id || deal.id, title: deal.offer_title, reason: reasons.join(", "), partner_offer_id: deal.partner_offer_id } : null;
        })
        .filter(Boolean) as DuplicateMatch[];
      row.duplicate_matches = [...marketplaceMatches, ...importMatches];
    });
  };

  const setRowCategory = (id: string, category: DealCategory) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, category } : row)));
  };

  const toggleRow = (id: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };

  const bulkApproveRows = () => {
    setRows((current) =>
      current.map((row) =>
        row.selected && row.quality_errors.length === 0 && (duplicateMode !== "skip" || row.duplicate_matches.length === 0)
          ? { ...row, active_status: "approved" }
          : row
      )
    );
    toast({ title: "Rows approved", description: "Approved rows are ready to publish into active marketplace inventory." });
  };

  const unpublishSelectedRows = () => {
    setRows((current) => current.map((row) => (row.selected ? { ...row, active_status: "unpublished" } : row)));
    toast({ title: "Rows marked unpublished", description: "These preview rows will not be published." });
  };

  const toggleMerchantRow = (id: string) => {
    setMerchantRows((current) => current.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };

  const merchantImportMutation = useMutation({
    mutationFn: async () => {
      const result: ImportSummary = { imported: 0, skipped: 0, duplicates: 0, errors: 0, replaced: 0, merged: 0, failed: 0, rolledBack: false };
      const { data: authData } = await supabase.auth.getUser();
      const { data: importLog, error: importLogError } = await supabase
        .from("affiliate_import_logs" as any)
        .insert({
          network,
          source_file: sourceFile || null,
          status: "publishing",
          uploaded_by: authData.user?.id || null,
          total_rows: merchantRows.length,
          preview_rows: merchantRows.length,
          approved_rows: readyMerchantRows.length,
          duplicate_rows: merchantDuplicateRows.length,
          rejected_rows: merchantRejectedRows.length,
          metadata: { import_mode: "merchants", duplicate_mode: duplicateMode },
        })
        .select("id")
        .single();
      if (importLogError) throw importLogError;

      try {
        for (const row of selectedMerchantRows) {
          if (row.quality_errors.length > 0 || row.status === "rejected") {
            result.errors += 1;
            result.skipped += 1;
            continue;
          }
          if (row.duplicate_matches.length > 0 && duplicateMode === "skip") {
            result.duplicates += 1;
            result.skipped += 1;
            continue;
          }

          const { data: existingStore } = await supabase.from("stores").select("id").eq("name", row.merchant_name).maybeSingle();
          let storeId = existingStore?.id;
          const storePayload = {
            name: row.merchant_name,
            logo_url: row.merchant_logo || null,
            website_url: row.website_url || null,
            student_discount_available: true,
          };
          if (storeId) {
            if (duplicateMode === "merge" || duplicateMode === "replace") await supabase.from("stores").update(storePayload).eq("id", storeId);
          } else {
            const { data: store, error } = await supabase.from("stores").insert(storePayload).select("id").single();
            if (error) throw error;
            storeId = store.id;
          }

          const { data: partnerByAdvertiser } = row.advertiser_id
            ? await supabase
                .from("partners" as any)
                .select("id")
                .eq("affiliate_network", row.affiliate_network)
                .eq("advertiser_id", row.advertiser_id)
                .maybeSingle()
            : { data: null };
          const { data: partnerByName } = !partnerByAdvertiser?.id
            ? await supabase.from("partners" as any).select("id").eq("partner_name", row.merchant_name).maybeSingle()
            : { data: null };
          const partner = partnerByAdvertiser || partnerByName;
          let partnerId = partner?.id;
          const partnerPayload = {
            partner_name: row.merchant_name,
            partner_type: "affiliate_network",
            logo_url: row.merchant_logo || null,
            website_url: row.website_url || null,
            affiliate_network: row.affiliate_network,
            advertiser_id: row.advertiser_id || null,
            approval_status: "approved",
            status: row.status === "active" ? "active" : "pending",
          };
          if (partnerId) {
            if (duplicateMode === "merge" || duplicateMode === "replace") await supabase.from("partners" as any).update(partnerPayload).eq("id", partnerId);
          } else {
            const { data: newPartner, error } = await supabase.from("partners" as any).insert(partnerPayload).select("id").single();
            if (error) throw error;
            partnerId = newPartner.id;
          }

          const { data: existingAffiliateMerchantByAdvertiser } = row.advertiser_id
            ? await supabase
                .from("affiliate_merchants" as any)
                .select("id")
                .eq("network", row.affiliate_network)
                .eq("advertiser_id", row.advertiser_id)
                .maybeSingle()
            : { data: null };
          const { data: existingAffiliateMerchantByName } = !existingAffiliateMerchantByAdvertiser?.id
            ? await supabase
                .from("affiliate_merchants" as any)
                .select("id")
                .eq("network", row.affiliate_network)
                .ilike("merchant_name", row.merchant_name)
                .maybeSingle()
            : { data: null };
          const existingAffiliateMerchant = existingAffiliateMerchantByAdvertiser || existingAffiliateMerchantByName;
          const affiliateMerchantPayload = {
            network: row.affiliate_network,
            merchant_name: row.merchant_name,
            merchant_logo: row.merchant_logo || null,
            merchant_description: row.merchant_description || null,
            advertiser_id: row.advertiser_id || null,
            website_url: row.website_url || null,
            status: row.status === "rejected" ? "pending" : row.status,
            store_id: storeId,
            partner_id: partnerId,
            metadata: { source_file: row.source_file },
          };
          if (existingAffiliateMerchant?.id) {
            if (duplicateMode === "merge" || duplicateMode === "replace") {
              const { error } = await supabase.from("affiliate_merchants" as any).update(affiliateMerchantPayload).eq("id", existingAffiliateMerchant.id);
              if (error) throw error;
              result.merged += duplicateMode === "merge" ? 1 : 0;
              result.replaced += duplicateMode === "replace" ? 1 : 0;
            } else {
              result.skipped += 1;
            }
          } else {
            const { error } = await supabase.from("affiliate_merchants" as any).insert(affiliateMerchantPayload);
            if (error) throw error;
            result.imported += 1;
          }
        }

        await supabase
          .from("affiliate_import_logs" as any)
          .update({
            status: "published",
            published_rows: result.imported + result.merged + result.replaced,
            completed_at: new Date().toISOString(),
          })
          .eq("id", importLog.id);
        return result;
      } catch (error) {
        result.failed += 1;
        await supabase
          .from("affiliate_import_logs" as any)
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Merchant import failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", importLog.id);
        throw error;
      }
    },
    onSuccess: (result) => {
      setSummary(result);
      queryClient.invalidateQueries({ queryKey: ["affiliate-import-history"] });
      toast({ title: "Merchant import complete", description: `${result.imported} imported, ${result.skipped} skipped, ${result.duplicates} duplicates.` });
      setMerchantRows([]);
    },
    onError: (error: Error) => {
      setSummary({ imported: 0, skipped: 0, duplicates: 0, errors: 1, replaced: 0, merged: 0, failed: 1, rolledBack: false });
      queryClient.invalidateQueries({ queryKey: ["affiliate-import-history"] });
      toast({ title: "Merchant import failed", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const createdDealIds: string[] = [];
      const createdPartnerIds: string[] = [];
      const createdStoreIds: string[] = [];
      const createdAffiliateMerchantIds: string[] = [];
      const createdAffiliateDealIds: string[] = [];
      const result: ImportSummary = { imported: 0, skipped: 0, duplicates: 0, errors: 0, replaced: 0, merged: 0, failed: 0, rolledBack: false };
      const { data: authData } = await supabase.auth.getUser();
      let importLogId: string | null = null;

      try {
        const { data: importLog, error: importLogError } = await supabase
          .from("affiliate_import_logs" as any)
          .insert({
            network,
            source_file: sourceFile || null,
            status: "publishing",
            uploaded_by: authData.user?.id || null,
            total_rows: rows.length,
            preview_rows: rows.length,
            approved_rows: readyRows.length,
            duplicate_rows: duplicateRows.length,
            rejected_rows: rejectedRows.length,
            metadata: {
              duplicate_mode: duplicateMode,
              detected_network: detectedNetwork || network,
            },
          })
          .select("id")
          .single();
        if (importLogError) throw importLogError;
        importLogId = importLog.id;

        for (const row of selectedRows) {
          if (row.active_status !== "approved" || row.quality_errors.length > 0) {
            if (row.quality_errors.length > 0) result.errors += 1;
            result.skipped += 1;
            continue;
          }
          const existingId = row.duplicate_matches[0]?.id;
          if (existingId && duplicateMode === "skip") {
            result.duplicates += 1;
            result.skipped += 1;
            continue;
          }

          const { data: existingStore } = await supabase.from("stores").select("id").eq("name", row.merchant_name).maybeSingle();
          let storeId = existingStore?.id;
          if (!storeId) {
            const { data: store, error } = await supabase
              .from("stores")
              .insert({ name: row.merchant_name, logo_url: row.image_url || null, website_url: row.direct_url || null, categories: [row.category], student_discount_available: true })
              .select("id")
              .single();
            if (error) throw error;
            storeId = store.id;
            createdStoreIds.push(storeId);
          }

          const { data: partnerByAdvertiser } = row.advertiser_id
            ? await supabase
                .from("partners" as any)
                .select("id")
                .eq("affiliate_network", row.affiliate_network)
                .eq("advertiser_id", row.advertiser_id)
                .maybeSingle()
            : { data: null };
          const { data: partnerByName } = !partnerByAdvertiser?.id
            ? await supabase.from("partners" as any).select("id").eq("partner_name", row.merchant_name).maybeSingle()
            : { data: null };
          const partner = partnerByAdvertiser || partnerByName;
          let partnerId = partner?.id;
          const partnerPayload = {
            partner_name: row.merchant_name,
            partner_type: "affiliate_network",
            logo_url: row.image_url || null,
            website_url: row.direct_url || null,
            affiliate_network: row.affiliate_network,
            advertiser_id: row.advertiser_id || null,
            commission_percent: row.commission_rate,
            approval_status: row.approval_status,
            status: row.approval_status === "approved" ? "active" : "lead",
          };
          if (partnerId) {
            await supabase.from("partners" as any).update(partnerPayload).eq("id", partnerId);
          } else {
            const { data: newPartner, error } = await supabase.from("partners" as any).insert(partnerPayload).select("id").single();
            if (error) throw error;
            partnerId = newPartner.id;
            createdPartnerIds.push(partnerId);
          }

          const { data: existingAffiliateMerchantByAdvertiser } = row.advertiser_id
            ? await supabase
                .from("affiliate_merchants" as any)
                .select("id")
                .eq("network", row.affiliate_network)
                .eq("advertiser_id", row.advertiser_id)
                .maybeSingle()
            : { data: null };
          const { data: existingAffiliateMerchantByName } = !existingAffiliateMerchantByAdvertiser?.id
            ? await supabase
                .from("affiliate_merchants" as any)
                .select("id")
                .eq("network", row.affiliate_network)
                .ilike("merchant_name", row.merchant_name)
                .maybeSingle()
            : { data: null };
          const existingAffiliateMerchant = existingAffiliateMerchantByAdvertiser || existingAffiliateMerchantByName;
          let affiliateMerchantId = existingAffiliateMerchant?.id;
          const affiliateMerchantPayload = {
            network: row.affiliate_network,
            merchant_name: row.merchant_name,
            merchant_logo: row.image_url || null,
            advertiser_id: row.advertiser_id || null,
            website_url: row.direct_url || null,
            status: "active",
            store_id: storeId,
            partner_id: partnerId,
            metadata: {
              commission_rate: row.commission_rate,
              source_file: row.source_file,
            },
          };
          if (affiliateMerchantId) {
            const { error } = await supabase.from("affiliate_merchants" as any).update(affiliateMerchantPayload).eq("id", affiliateMerchantId);
            if (error) throw error;
          } else {
            const { data: merchant, error } = await supabase.from("affiliate_merchants" as any).insert(affiliateMerchantPayload).select("id").single();
            if (error) throw error;
            affiliateMerchantId = merchant.id;
            createdAffiliateMerchantIds.push(affiliateMerchantId);
          }

          let partnerOfferId = row.duplicate_matches[0]?.partner_offer_id || null;
          const offerPayload = {
            partner_id: partnerId,
            offer_title: row.deal_title,
            offer_description: row.description || null,
            deal_type: "other",
            discount_value: row.coupon_code || row.deal_title,
            redemption_instructions: row.affiliate_url ? "Claim through CampusPerk secure redirect." : null,
            terms: buildDealDescription(row),
            end_at: row.expiration_date,
            status: "active",
          } as any;

          if (partnerOfferId && existingId && duplicateMode === "merge") {
            const { error } = await supabase.from("partner_offers").update(offerPayload).eq("id", partnerOfferId);
            if (error) throw error;
          } else {
            const { data: offer, error } = await supabase.from("partner_offers").insert(offerPayload).select("id").single();
            if (error) throw error;
            partnerOfferId = offer.id;
          }

          const quality = computeDealQuality(
            {
              title: row.deal_title,
              description: buildDealDescription(row),
              discount_value: row.coupon_code || row.deal_title,
              category: row.category,
              affiliate_link_url: row.affiliate_url || null,
              direct_link_url: row.direct_url || null,
              status: "active",
              stores: { name: row.merchant_name, logo_url: row.image_url || null, website_url: row.direct_url || null },
            },
            {
              merchant_name: row.merchant_name,
              merchant_logo: row.image_url || null,
              offer_title: row.deal_title,
              affiliate_url: row.affiliate_url,
              destination_url: row.direct_url || null,
              discount_value: row.coupon_code || row.deal_title,
              coupon_code: row.coupon_code || null,
              category: row.category,
            },
          );

          const dealPayload = {
            store_id: storeId,
            partner_id: partnerId,
            partner_offer_id: partnerOfferId,
            title: row.deal_title,
            display_title: quality.displayTitle,
            deal_quality_score: quality.score,
            quality_warnings: quality.warnings,
            quality_reviewed_at: new Date().toISOString(),
            description: buildDealDescription(row),
            category: row.category,
            discount_value: row.coupon_code || row.deal_title,
            affiliate_link_url: row.affiliate_url || null,
            direct_link_url: row.direct_url || null,
            affiliate_network: row.affiliate_network,
            commission_rate: row.commission_rate,
            commission_type: parseCommissionType(row.commission_text),
            is_affiliate: !!row.affiliate_url,
            status: "active" as any,
            expires_at: row.expiration_date,
            featured: false,
            last_checked_at: row.import_date,
          } as any;

          let promotedDealId = existingId || null;
          if (existingId && duplicateMode === "merge") {
            const { error } = await supabase.from("deals").update(dealPayload).eq("id", existingId);
            if (error) throw error;
            promotedDealId = existingId;
            result.merged += 1;
          } else {
            if (existingId && duplicateMode === "replace") {
              const { error } = await supabase.from("deals").delete().eq("id", existingId);
              if (error) throw error;
              result.replaced += 1;
            }
            const { data: newDeal, error } = await supabase.from("deals").insert(dealPayload).select("id").single();
            if (error) throw error;
            createdDealIds.push(newDeal.id);
            promotedDealId = newDeal.id;
            result.imported += 1;
          }

          const affiliateDealPayload = {
            merchant_id: affiliateMerchantId,
            promoted_deal_id: promotedDealId,
            partner_offer_id: partnerOfferId,
            merchant_name: row.merchant_name,
            merchant_logo: row.image_url || null,
            network: row.affiliate_network,
            offer_title: row.deal_title,
            display_title: quality.displayTitle,
            deal_quality_score: quality.score,
            quality_warnings: quality.warnings,
            quality_reviewed_at: new Date().toISOString(),
            offer_description: row.description || null,
            coupon_code: row.coupon_code || null,
            discount_value: row.coupon_code || row.deal_title,
            category: row.category,
            affiliate_url: row.affiliate_url,
            destination_url: row.direct_url || null,
            end_date: row.expiration_date,
            status: "active",
            source_file: row.source_file,
            duplicate_key: duplicateKeyFor(row),
            approved_at: new Date().toISOString(),
            approved_by: authData.user?.id || null,
            published_at: new Date().toISOString(),
            published_by: authData.user?.id || null,
            raw_data: {
              advertiser_id: row.advertiser_id,
              commission_rate: row.commission_rate,
              commission_text: row.commission_text,
              approval_status: row.approval_status,
              deep_link_enabled: row.deep_link_enabled,
              import_date: row.import_date,
            },
          };
          const { data: affiliateDeal, error: affiliateDealError } = await supabase
            .from("affiliate_deals" as any)
            .insert(affiliateDealPayload)
            .select("id")
            .single();
          if (affiliateDealError) throw affiliateDealError;
          createdAffiliateDealIds.push(affiliateDeal.id);
        }
        if (importLogId) {
          await supabase
            .from("affiliate_import_logs" as any)
            .update({
              status: "published",
              published_rows: result.imported + result.merged + result.replaced,
              completed_at: new Date().toISOString(),
            })
            .eq("id", importLogId);
        }
        return result;
      } catch (error) {
        result.failed += 1;
        result.rolledBack = true;
        if (createdAffiliateDealIds.length) await supabase.from("affiliate_deals" as any).delete().in("id", createdAffiliateDealIds);
        if (createdDealIds.length) await supabase.from("deals").delete().in("id", createdDealIds);
        if (createdPartnerIds.length) await supabase.from("partners").delete().in("id", createdPartnerIds);
        if (createdStoreIds.length) await supabase.from("stores").delete().in("id", createdStoreIds);
        if (createdAffiliateMerchantIds.length) await supabase.from("affiliate_merchants" as any).delete().in("id", createdAffiliateMerchantIds);
        if (importLogId) {
          await supabase
            .from("affiliate_import_logs" as any)
            .update({
              status: "rolled_back",
              error_message: error instanceof Error ? error.message : "Import failed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", importLogId);
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      setSummary(result);
      queryClient.invalidateQueries({ queryKey: ["affiliate-import-history"] });
      toast({ title: "Import complete", description: `${result.imported} imported, ${result.merged} merged, ${result.replaced} replaced, ${result.skipped} skipped.` });
      setRows([]);
    },
    onError: (error: Error) => {
      setSummary({ imported: 0, skipped: 0, duplicates: 0, errors: 1, replaced: 0, merged: 0, failed: 1, rolledBack: true });
      queryClient.invalidateQueries({ queryKey: ["affiliate-import-history"] });
      toast({ title: "Import rolled back", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Affiliate Command Center</h1>
            <p className="text-sm text-muted-foreground">Import merchant and deal files, preview normalized rows, then publish clean marketplace inventory.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={importMode} onValueChange={(value) => {
              setImportMode(value as ImportMode);
              setRows([]);
              setMerchantRows([]);
              setColumnDetection([]);
              setSummary(null);
            }}>
              <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="merchants">Import Merchant CSV</SelectItem>
                <SelectItem value="deals">Import Deal CSV</SelectItem>
              </SelectContent>
            </Select>
            <Select value={network} onValueChange={(value) => setNetwork(value as NetworkName)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>{NETWORKS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => downloadTemplate(network)}><Download className="h-4 w-4" /> {network} Template</Button>
            <Button className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload CSV/XLSX</Button>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={loadFile} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            ["Imported Today", summary?.imported || 0],
            [importMode === "deals" ? "Approved Deals" : "Ready Merchants", importMode === "deals" ? approvedRows.length : readyMerchantRows.length],
            ["Skipped", summary?.skipped || 0],
            ["Errors", importMode === "deals" ? rejectedRows.length : merchantRejectedRows.length],
            ["Duplicates Found", importMode === "deals" ? duplicateRows.length : merchantDuplicateRows.length],
            ["Success Rate", `${activePreviewRows ? Math.round(((importMode === "deals" ? readyRows.length : readyMerchantRows.length) / activePreviewRows) * 100) : successRate}%`],
          ].map(([label, value]) => (
            <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold text-foreground">{value}</p></CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {APPROVED_TEMPLATE_NETWORKS.map((item) => (
            <Card key={item} className={network === item ? "border-primary/50 bg-primary/5" : "border-border bg-card"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item}</p>
                    <p className="text-xs text-muted-foreground">Mapping template ready</p>
                  </div>
                  <Badge variant={network === item ? "default" : "outline"}>{network === item ? "Active" : "Supported"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {activePreviewRows === 0 ? (
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold text-foreground">Upload a merchant or deal export</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">Supports CSV, XLS, and XLSX files from CJ, Impact, Awin, ShareASale, Rakuten, and local merchant exports.</p>
            </CardContent>
          </Card>
        ) : importMode === "merchants" ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReportCard title="By Network" rows={merchantAnalytics} />
              <ReportCard title="Results" rows={[["Ready", readyMerchantRows.length], ["Duplicates", merchantDuplicateRows.length], ["Errors", merchantRejectedRows.length]]} />
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Column Auto-Detection</CardTitle>
                <p className="text-xs text-muted-foreground">{sourceFile} mapped as merchant inventory.</p>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {columnDetection.map((column) => (
                  <div key={column.field} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{column.label}</p>
                      {column.header ? <Check className="h-4 w-4 text-accent" /> : column.required ? <X className="h-4 w-4 text-destructive" /> : <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{column.header || "Not detected"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-sm">Merchant Match and Import Preview</CardTitle>
                  <p className="text-xs text-muted-foreground">{readyMerchantRows.length} ready, {merchantDuplicateRows.length} duplicates, {merchantRejectedRows.length} errors.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={duplicateMode} onValueChange={(value) => setDuplicateMode(value as DuplicateMode)}>
                    <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="replace">Replace existing</SelectItem>
                      <SelectItem value="merge">Merge into existing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => merchantImportMutation.mutate()} disabled={readyMerchantRows.length === 0 || merchantImportMutation.isPending} className="gap-2">
                    {merchantImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Import {readyMerchantRows.length}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Use</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Advertiser ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Duplicate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchantRows.map((row) => (
                        <TableRow key={row.id} className={!row.selected ? "opacity-50" : ""}>
                          <TableCell><Button size="sm" variant={row.selected ? "default" : "outline"} onClick={() => toggleMerchantRow(row.id)}>{row.selected ? "Use" : "Skip"}</Button></TableCell>
                          <TableCell>
                            <div className="max-w-[220px]">
                              <p className="truncate text-sm font-medium">{row.merchant_name || "Missing merchant"}</p>
                              <p className="truncate text-xs text-muted-foreground">{row.website_url || "No website"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{row.affiliate_network}</TableCell>
                          <TableCell>{row.advertiser_id || "None"}</TableCell>
                          <TableCell><Badge variant={row.status === "active" ? "default" : "outline"} className="capitalize">{row.status}</Badge></TableCell>
                          <TableCell>{row.quality_errors.length ? <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><AlertTriangle className="h-3 w-3" /> {row.quality_errors[0]}</Badge> : <Badge className="bg-accent/15 text-accent border-accent/30">Pass</Badge>}</TableCell>
                          <TableCell>{row.duplicate_matches.length ? <Badge className="bg-gold/15 text-gold border-gold/30">{row.duplicate_matches[0].reason}</Badge> : <Badge variant="outline">Unique</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ReportCard title="By Network" rows={analytics.byNetwork} />
              <ReportCard title="By Merchant" rows={analytics.byMerchant} />
              <ReportCard title="By Category" rows={analytics.byCategory} />
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Column Auto-Detection</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {sourceFile} mapped with {detectedNetwork || network}. Required fields must be detected before publishing.
                </p>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {columnDetection.map((column) => (
                  <div key={column.field} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{column.label}</p>
                      {column.header ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : column.required ? (
                        <X className="h-4 w-4 text-destructive" />
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Optional</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{column.header || "Not detected"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-sm">Validation, Duplicate, and Quality Report</CardTitle>
                  <p className="text-xs text-muted-foreground">{readyRows.length} ready, {duplicateRows.length} duplicates, {rejectedRows.length} rejected.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={bulkApproveRows} disabled={rows.length === 0} className="gap-2">
                    <Check className="h-4 w-4" /> Bulk Approve
                  </Button>
                  <Button variant="outline" onClick={unpublishSelectedRows} disabled={selectedRows.length === 0} className="gap-2">
                    <X className="h-4 w-4" /> Unpublish Selected
                  </Button>
                  <Select value={duplicateMode} onValueChange={(value) => setDuplicateMode(value as DuplicateMode)}>
                    <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="replace">Replace existing</SelectItem>
                      <SelectItem value="merge">Merge into existing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => importMutation.mutate()} disabled={readyRows.length === 0 || importMutation.isPending} className="gap-2">
                    {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Publish {readyRows.length}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Use</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Deal</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Duplicate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} className={!row.selected ? "opacity-50" : ""}>
                          <TableCell>
                            <Button size="sm" variant={row.selected ? "default" : "outline"} onClick={() => toggleRow(row.id)}>
                              {row.selected ? "Use" : "Skip"}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px]">
                              <p className="truncate text-sm font-medium">{row.merchant_name || "Missing merchant"}</p>
                              <p className="truncate text-xs text-muted-foreground">{row.advertiser_id || "No advertiser ID"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate">{row.deal_title || "Missing title"}</TableCell>
                          <TableCell>
                            <Select value={row.category} onValueChange={(value) => setRowCategory(row.id, value as DealCategory)}>
                              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{row.affiliate_network}</TableCell>
                          <TableCell>
                            <Badge variant={row.active_status === "approved" ? "default" : "outline"} className="capitalize">
                              {row.active_status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.quality_errors.length ? (
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><AlertTriangle className="h-3 w-3" /> {row.quality_errors[0]}</Badge>
                            ) : (
                              <Badge className="bg-accent/15 text-accent border-accent/30">Pass</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.duplicate_matches.length ? (
                              <Badge className="bg-gold/15 text-gold border-gold/30">{row.duplicate_matches[0].reason}</Badge>
                            ) : (
                              <Badge variant="outline">Unique</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {summary && (
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 text-primary" /> Import Summary</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="text-lg font-bold">{String(value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 text-primary" /> Import History</CardTitle>
            <p className="text-xs text-muted-foreground">Recent affiliate import runs stored in affiliate_import_logs.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead>Rejected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No affiliate import history yet.</TableCell></TableRow>
                  ) : (
                    importHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-[220px] truncate">{item.source_file || "Manual import"}</TableCell>
                        <TableCell>{item.network}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === "published" ? "default" : "outline"} className="capitalize">
                            {item.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.total_rows}</TableCell>
                        <TableCell>{item.approved_rows}</TableCell>
                        <TableCell>{item.published_rows}</TableCell>
                        <TableCell>{item.duplicate_rows}</TableCell>
                        <TableCell>{item.rejected_rows}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function ReportCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rows loaded.</p>
        ) : (
          rows.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{label}</span>
              <Badge variant="outline">{count}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
