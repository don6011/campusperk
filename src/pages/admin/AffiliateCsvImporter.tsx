import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Download, FileSpreadsheet, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type NetworkName = "CJ" | "Impact" | "Awin" | "ShareASale" | "Rakuten" | "Local Merchant";
type DuplicateMode = "skip" | "replace" | "merge";
type DealCategory = "Technology" | "Education" | "Productivity" | "Career" | "Travel" | "Finance" | "Software" | "Student Essentials" | "Local Deals";

type DuplicateMatch = {
  id: string;
  title: string;
  reason: string;
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
  coupon_code: string;
  affiliate_url: string;
  direct_url: string;
  image_url: string;
  expiration_date: string | null;
  source_file: string;
  import_date: string;
  active_status: "active" | "expired" | "pending_review" | "rejected";
  selected: boolean;
  quality_errors: string[];
  duplicate_matches: DuplicateMatch[];
};

type ImportSummary = {
  imported: number;
  skipped: number;
  replaced: number;
  merged: number;
  failed: number;
  rolledBack: boolean;
};

const NETWORKS: NetworkName[] = ["CJ", "Impact", "Awin", "ShareASale", "Rakuten", "Local Merchant"];
const CATEGORIES: DealCategory[] = ["Technology", "Education", "Productivity", "Career", "Travel", "Finance", "Software", "Student Essentials", "Local Deals"];

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

const FIELD_ALIASES: Record<string, string[]> = {
  merchant_name: ["merchant_name", "merchant", "advertiser", "advertiser_name", "brand", "brand_name", "store", "store_name", "program_name"],
  deal_title: ["deal_title", "title", "offer", "offer_name", "promotion", "promotion_name", "link_name", "text"],
  description: ["description", "offer_description", "promotion_description", "details", "terms", "short_description"],
  category: ["category", "vertical", "primary_category", "advertiser_category"],
  affiliate_network: ["network", "affiliate_network", "source", "network_name"],
  advertiser_id: ["advertiser_id", "advertiserid", "program_id", "campaign_id", "merchant_id", "sid"],
  commission_rate: ["commission_rate", "commission_percent", "commission", "payout", "default_commission"],
  coupon_code: ["coupon_code", "coupon", "promo_code", "code", "voucher_code"],
  affiliate_url: ["affiliate_url", "affiliate_link", "affiliate_link_url", "tracking_link", "tracking_url", "click_url", "deeplink", "link_url"],
  direct_url: ["direct_url", "direct_link_url", "destination_url", "landing_page", "merchant_url", "url"],
  image_url: ["image_url", "logo_url", "creative_url", "image", "thumbnail", "banner_url"],
  expiration_date: ["expiration_date", "expires_at", "end_date", "valid_to", "date_end", "promotion_end_date"],
  discount_value: ["discount_value", "discount", "offer_value", "savings", "amount"],
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

function firstValue(row: Record<string, string>, key: keyof typeof FIELD_ALIASES) {
  const aliases = FIELD_ALIASES[key].map(canonical);
  const found = Object.entries(row).find(([header]) => aliases.includes(canonical(header)));
  return found?.[1]?.trim() || "";
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
  const base = {
    merchant_name: firstValue(raw, "merchant_name"),
    deal_title: firstValue(raw, "deal_title"),
    description: firstValue(raw, "description"),
  };
  const affiliate_url = firstValue(raw, "affiliate_url");
  const direct_url = firstValue(raw, "direct_url");
  const expiration_date = parseExpiration(firstValue(raw, "expiration_date"));
  const image_url = firstValue(raw, "image_url");
  const category = inferCategory(base, firstValue(raw, "category"));
  const quality_errors: string[] = [];

  if (!base.merchant_name) quality_errors.push("Blank merchant");
  if (!base.deal_title) quality_errors.push("Blank title");
  if (!affiliate_url && !direct_url) quality_errors.push("Missing URL");
  if (affiliate_url && !isValidUrl(affiliate_url)) quality_errors.push("Malformed affiliate link");
  if (direct_url && !isValidUrl(direct_url)) quality_errors.push("Malformed destination URL");
  if (!isValidImageUrl(image_url)) quality_errors.push("Invalid image URL");
  if (expiration_date && new Date(expiration_date).getTime() < Date.now()) quality_errors.push("Expired deal");

  return {
    id: `deal-${Date.now()}-${index}`,
    ...base,
    category,
    affiliate_network: inferNetwork(firstValue(raw, "affiliate_network"), selectedNetwork),
    advertiser_id: firstValue(raw, "advertiser_id"),
    commission_rate: parseCommission(firstValue(raw, "commission_rate")),
    coupon_code: firstValue(raw, "coupon_code"),
    affiliate_url,
    direct_url,
    image_url,
    expiration_date,
    source_file: sourceFile,
    import_date: new Date().toISOString(),
    active_status: quality_errors.length ? "rejected" : "active",
    selected: true,
    quality_errors,
    duplicate_matches: [],
  };
}

function downloadTemplate() {
  const sample = [
    TEMPLATE_HEADERS.join(","),
    '"Example Merchant",CJ,ADV-123,"Example Student Deal","20% off for students",Software,20%,STUDENT20,https://example.com/affiliate,https://example.com,https://example.com/logo.png,8,2026-12-31',
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "campusperk-affiliate-import-template.csv";
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
  const [rows, setRows] = useState<NormalizedDeal[]>([]);
  const [network, setNetwork] = useState<NetworkName>("CJ");
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const readyRows = rows.filter((row) => row.selected && row.quality_errors.length === 0 && (duplicateMode !== "skip" || row.duplicate_matches.length === 0));
  const duplicateRows = rows.filter((row) => row.duplicate_matches.length > 0);
  const rejectedRows = rows.filter((row) => row.quality_errors.length > 0);
  const selectedRows = rows.filter((row) => row.selected);
  const successRate = selectedRows.length ? Math.round((readyRows.length / selectedRows.length) * 100) : 0;

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

  const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const parsed = parseAffiliateCSV(String(reader.result || ""));
      const normalized = parsed.map((row, index) => normalizeDeal(row, index, file.name, network));
      await detectDuplicates(normalized);
      setRows(normalized);
      setSummary(null);
      toast({ title: "CSV loaded", description: `${normalized.length} rows normalized from ${file.name}.` });
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const detectDuplicates = async (normalized: NormalizedDeal[]) => {
    const { data: existingDeals } = await supabase
      .from("deals")
      .select("id, title, affiliate_link_url, direct_link_url, discount_value, stores(name)")
      .limit(2000);
    const existing = (existingDeals || []) as any[];

    normalized.forEach((row) => {
      const merchant = canonical(row.merchant_name);
      const title = canonical(row.deal_title);
      const coupon = canonical(row.coupon_code || row.deal_title);
      const urls = [row.affiliate_url, row.direct_url].filter(Boolean).map((url) => url.toLowerCase());
      row.duplicate_matches = existing
        .map((deal) => {
          const dealMerchant = canonical(deal.stores?.name || "");
          const dealTitle = canonical(deal.title || "");
          const dealUrls = [deal.affiliate_link_url, deal.direct_link_url].filter(Boolean).map((url: string) => url.toLowerCase());
          const reasons: string[] = [];
          if (merchant && dealMerchant && merchant === dealMerchant && title && title === dealTitle) reasons.push("merchant + title");
          if (urls.some((url) => dealUrls.includes(url))) reasons.push("destination URL");
          if (coupon && canonical(deal.discount_value || "") === coupon) reasons.push("coupon");
          return reasons.length ? { id: deal.id, title: deal.title, reason: reasons.join(", ") } : null;
        })
        .filter(Boolean) as DuplicateMatch[];
    });
  };

  const setRowCategory = (id: string, category: DealCategory) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, category } : row)));
  };

  const toggleRow = (id: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const createdDealIds: string[] = [];
      const createdPartnerIds: string[] = [];
      const createdStoreIds: string[] = [];
      const result: ImportSummary = { imported: 0, skipped: 0, replaced: 0, merged: 0, failed: 0, rolledBack: false };

      try {
        for (const row of selectedRows) {
          if (row.quality_errors.length > 0) {
            result.skipped += 1;
            continue;
          }
          const existingId = row.duplicate_matches[0]?.id;
          if (existingId && duplicateMode === "skip") {
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

          const { data: partner } = await supabase.from("partners" as any).select("id").eq("partner_name", row.merchant_name).maybeSingle();
          let partnerId = partner?.id;
          const partnerPayload = {
            partner_name: row.merchant_name,
            partner_type: "affiliate_network",
            logo_url: row.image_url || null,
            website_url: row.direct_url || null,
            affiliate_network: row.affiliate_network,
            advertiser_id: row.advertiser_id || null,
            commission_percent: row.commission_rate,
            approval_status: "approved",
            status: "active",
          };
          if (partnerId) {
            await supabase.from("partners" as any).update(partnerPayload).eq("id", partnerId);
          } else {
            const { data: newPartner, error } = await supabase.from("partners" as any).insert(partnerPayload).select("id").single();
            if (error) throw error;
            partnerId = newPartner.id;
            createdPartnerIds.push(partnerId);
          }

          const dealPayload = {
            store_id: storeId,
            partner_id: partnerId,
            title: row.deal_title,
            description: buildDealDescription(row),
            category: row.category,
            discount_value: row.coupon_code || row.deal_title,
            affiliate_link_url: row.affiliate_url || null,
            direct_link_url: row.direct_url || null,
            affiliate_network: row.affiliate_network,
            commission_rate: row.commission_rate,
            is_affiliate: !!row.affiliate_url,
            status: "active" as any,
            expires_at: row.expiration_date,
            featured: false,
            last_checked_at: row.import_date,
          } as any;

          if (existingId && duplicateMode === "merge") {
            const { error } = await supabase.from("deals").update(dealPayload).eq("id", existingId);
            if (error) throw error;
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
            result.imported += 1;
          }
        }
        return result;
      } catch (error) {
        result.failed += 1;
        result.rolledBack = true;
        if (createdDealIds.length) await supabase.from("deals").delete().in("id", createdDealIds);
        if (createdPartnerIds.length) await supabase.from("partners").delete().in("id", createdPartnerIds);
        if (createdStoreIds.length) await supabase.from("stores").delete().in("id", createdStoreIds);
        throw error;
      }
    },
    onSuccess: (result) => {
      setSummary(result);
      toast({ title: "Import complete", description: `${result.imported} imported, ${result.merged} merged, ${result.replaced} replaced, ${result.skipped} skipped.` });
      setRows([]);
    },
    onError: (error: Error) => {
      setSummary({ imported: 0, skipped: 0, replaced: 0, merged: 0, failed: 1, rolledBack: true });
      toast({ title: "Import rolled back", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Affiliate CSV Importer</h1>
            <p className="text-sm text-muted-foreground">Normalize, validate, dedupe, and publish affiliate inventory from all supported networks.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={network} onValueChange={(value) => setNetwork(value as NetworkName)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>{NETWORKS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}><Download className="h-4 w-4" /> Template</Button>
            <Button className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload CSV</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={loadFile} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            ["Imported Today", summary?.imported || 0],
            ["Active Deals", rows.filter((row) => row.active_status === "active").length],
            ["Expired Deals", rows.filter((row) => row.quality_errors.includes("Expired deal")).length],
            ["Pending Review", rejectedRows.length],
            ["Duplicates Found", duplicateRows.length],
            ["Success Rate", `${successRate}%`],
          ].map(([label, value]) => (
            <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold text-foreground">{value}</p></CardContent></Card>
          ))}
        </div>

        {rows.length === 0 ? (
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold text-foreground">Upload a real affiliate export</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">Supports CJ, Impact, Awin, ShareASale, Rakuten, and local merchant CSVs. No placeholder rows are displayed.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ReportCard title="By Network" rows={analytics.byNetwork} />
              <ReportCard title="By Merchant" rows={analytics.byMerchant} />
              <ReportCard title="By Category" rows={analytics.byCategory} />
            </div>

            <Card className="border-border bg-card">
              <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-sm">Validation, Duplicate, and Quality Report</CardTitle>
                  <p className="text-xs text-muted-foreground">{readyRows.length} ready, {duplicateRows.length} duplicates, {rejectedRows.length} rejected.</p>
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
                  <Button onClick={() => importMutation.mutate()} disabled={readyRows.length === 0 || importMutation.isPending} className="gap-2">
                    {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Import {readyRows.length}
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

