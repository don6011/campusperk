import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Student Relevance Scoring ──────────────────────────────────────────

const BOOST_CATEGORIES = new Set([
  "software", "tech", "technology", "electronics", "computers",
  "subscriptions", "streaming", "music",
  "food", "restaurants", "dining", "grocery", "meal kits",
  "travel", "transportation", "flights", "hotels",
  "clothing", "apparel", "fashion", "shoes",
  "fitness", "health", "wellness", "gym",
  "education", "books", "textbooks", "courses", "learning",
  "phone", "mobile", "accessories",
]);

const PENALTY_CATEGORIES = new Set([
  "insurance", "mortgage", "home improvement", "automotive parts",
  "baby", "wedding", "luxury", "wine", "spirits", "cigars",
  "industrial", "b2b", "enterprise",
]);

const STUDENT_BRANDS = new Set([
  "spotify", "apple", "nike", "adidas", "amazon", "samsung",
  "adobe", "microsoft", "google", "github", "notion", "canva",
  "grammarly", "chegg", "coursera", "udemy", "skillshare",
  "doordash", "uber eats", "ubereats", "grubhub",
  "asos", "h&m", "zara", "uniqlo", "old navy", "gap",
  "best buy", "target", "walmart",
  "headspace", "calm", "peloton",
  "north face", "patagonia", "lululemon",
  "amtrak", "greyhound", "megabus",
]);

const STUDENT_KEYWORDS = [
  "student", "college", "university", "campus", "edu",
  "back to school", "dorm", "semester", "study",
  "young adult", "gen z", "budget",
];

function computeStudentScore(deal: {
  brand_name?: string;
  category_primary?: string;
  category_secondary?: string;
  title?: string;
  description?: string;
  price?: number;
  sale_price?: number;
  estimated_savings_percent?: number;
  coupon_code?: string;
}): number {
  let score = 0;
  const brand = (deal.brand_name || "").toLowerCase();
  const cat1 = (deal.category_primary || "").toLowerCase();
  const cat2 = (deal.category_secondary || "").toLowerCase();
  const title = (deal.title || "").toLowerCase();
  const desc = (deal.description || "").toLowerCase();

  // Brand relevance (0-30)
  if (STUDENT_BRANDS.has(brand)) score += 30;
  else {
    for (const b of STUDENT_BRANDS) {
      if (brand.includes(b)) { score += 20; break; }
    }
  }

  // Category relevance (0-25)
  if (BOOST_CATEGORIES.has(cat1) || BOOST_CATEGORIES.has(cat2)) score += 25;
  if (PENALTY_CATEGORIES.has(cat1) || PENALTY_CATEGORIES.has(cat2)) score -= 40;

  // Student keywords in title/description (0-20)
  let kwHits = 0;
  for (const kw of STUDENT_KEYWORDS) {
    if (title.includes(kw) || desc.includes(kw)) kwHits++;
  }
  score += Math.min(kwHits * 5, 20);

  // Price attractiveness (0-15)
  if (deal.price && deal.price < 50) score += 10;
  else if (deal.price && deal.price < 100) score += 5;
  if (deal.estimated_savings_percent && deal.estimated_savings_percent >= 30) score += 15;
  else if (deal.estimated_savings_percent && deal.estimated_savings_percent >= 15) score += 8;

  // Coupon bonus (0-10)
  if (deal.coupon_code) score += 10;

  return Math.max(0, Math.min(100, score));
}

// ── Brand Normalization ────────────────────────────────────────────────

function normalizeBrand(raw: string, aliasMap: Map<string, string>): string {
  const lower = raw.trim().toLowerCase();
  if (aliasMap.has(lower)) return aliasMap.get(lower)!;
  // Basic normalization: title case, strip Inc/LLC/Corp
  const cleaned = raw.trim()
    .replace(/,?\s*(inc\.?|llc\.?|corp\.?|ltd\.?|co\.?)$/i, "")
    .trim();
  return cleaned || raw;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch { return ""; }
}

// ── Checksum for dedup ─────────────────────────────────────────────────

async function computeChecksum(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Network-specific fetch adapters ────────────────────────────────────

async function fetchFromSource(source: any): Promise<any[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Add auth headers based on auth_type
  if (source.api_key_secret_name) {
    const apiKey = Deno.env.get(source.api_key_secret_name);
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const url = source.feed_url || source.api_endpoint;
  if (!url) return [];

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);

  const contentType = resp.headers.get("content-type") || "";

  if (contentType.includes("xml") || contentType.includes("text/xml")) {
    // Basic XML-to-array: extract items between common tags
    const text = await resp.text();
    return parseXmlItems(text);
  }

  const data = await resp.json();
  // Support various response shapes
  if (Array.isArray(data)) return data;
  return data.deals || data.offers || data.items || data.products ||
         data.data?.offers || data.data?.items || data.data || [];
}

function parseXmlItems(xml: string): any[] {
  // Lightweight XML item extraction for common feed formats
  const items: any[] = [];
  const itemRegex = /<(?:item|product|offer)[^>]*>([\s\S]*?)<\/(?:item|product|offer)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const item: Record<string, string> = {};
    const fieldRegex = /<(\w+)(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g;
    let fm;
    while ((fm = fieldRegex.exec(content)) !== null) {
      item[fm[1]] = fm[2].trim();
    }
    items.push(item);
  }
  return items;
}

// ── Normalize raw item into standard schema ────────────────────────────

function normalizeItem(raw: any, source: any): Record<string, any> {
  const network = source.network_name;

  // Extract fields with network-aware fallbacks
  const title = raw.title || raw.name || raw.productName || raw.product_name || raw.offer_name || "Untitled";
  const brand = raw.brand || raw.advertiser || raw.merchant || raw.advertiser_name ||
                raw.merchantName || raw.merchant_name || raw.programName || "";
  const description = raw.description || raw.summary || raw.long_description || raw.shortDescription || "";
  const imageUrl = raw.image_url || raw.image || raw.imageUrl || raw.image_link || raw.thumbnail || null;
  const affiliateUrl = raw.affiliate_url || raw.tracking_url || raw.url || raw.link ||
                       raw.deeplink || raw.click_url || raw.clickUrl || null;
  const category = raw.category || raw.product_type || raw.categoryName || raw.category_name || "";
  const price = parseFloat(raw.price || raw.retail_price || raw.originalPrice || "0") || null;
  const salePrice = parseFloat(raw.sale_price || raw.salePrice || raw.discount_price || "0") || null;
  const couponCode = raw.coupon_code || raw.couponCode || raw.promo_code || raw.code || null;
  const expiresAt = raw.expires_at || raw.end_date || raw.expiration_date || raw.valid_to || null;
  const advertiserId = raw.advertiser_id || raw.merchantId || raw.merchant_id || raw.program_id || null;
  const externalId = raw.id?.toString() || raw.external_id?.toString() || raw.offer_id?.toString() ||
                     raw.product_id?.toString() || raw.sku || crypto.randomUUID();
  const currency = raw.currency || "USD";

  // Compute savings
  let savingsAmount: number | null = null;
  let savingsPercent: number | null = null;
  if (price && salePrice && salePrice < price) {
    savingsAmount = price - salePrice;
    savingsPercent = Math.round((savingsAmount / price) * 100);
  }

  // Split category
  const cats = category.split(/[>/|,]/).map((c: string) => c.trim()).filter(Boolean);

  return {
    external_id: externalId,
    title,
    brand,
    description,
    image_url: imageUrl,
    affiliate_url: affiliateUrl,
    category: cats[0] || null,
    advertiser_id: advertiserId,
    // Normalized fields
    brand_name: brand,
    short_description: description.slice(0, 300),
    long_description: description,
    deeplink_url: affiliateUrl,
    domain: affiliateUrl ? extractDomain(affiliateUrl) : null,
    category_primary: cats[0] || null,
    category_secondary: cats[1] || null,
    price,
    sale_price: salePrice,
    currency,
    estimated_savings_amount: savingsAmount,
    estimated_savings_percent: savingsPercent,
    coupon_code: couponCode,
    is_coupon: !!couponCode,
    expires_at: expiresAt,
    network_item_id: externalId,
  };
}

// ── Main Handler ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const secret = req.headers.get("x-internal-secret");
    const hasInternalSecret = secret && secret === Deno.env.get("INTERNAL_SECRET");
    if (!hasInternalSecret) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: adminRole } = await supabaseAuth
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse optional body
    let sourceId: string | null = null;
    let publishThreshold = 40; // default student relevance threshold
    if (req.method === "POST") {
      try {
        const body = await req.json();
        sourceId = body.source_id ?? null;
        if (body.publish_threshold) publishThreshold = body.publish_threshold;
      } catch { /* no body is fine */ }
    }

    // Fetch active sources
    let query = supabase.from("affiliate_sources").select("*").eq("status", "active");
    if (sourceId) query = query.eq("id", sourceId);
    const { data: sources, error: srcErr } = await query;
    if (srcErr) throw srcErr;
    if (!sources?.length) {
      return new Response(JSON.stringify({ message: "No active sources" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load brand aliases
    const { data: aliases } = await supabase.from("brand_aliases").select("raw_brand_name, normalized_brand_name");
    const aliasMap = new Map<string, string>();
    for (const a of aliases || []) {
      aliasMap.set(a.raw_brand_name.toLowerCase(), a.normalized_brand_name);
    }

    const results: Record<string, { raw: number; normalized: number; published: number; errors: string[] }> = {};

    for (const source of sources) {
      const entry = { raw: 0, normalized: 0, published: 0, errors: [] as string[] };
      results[source.network_name + (source.source_name ? ` (${source.source_name})` : "")] = entry;

      try {
        // ── 1. INGEST: Fetch raw items ──
        const rawItems = await fetchFromSource(source);

        // ── 2. Store raw items with checksum ──
        for (const item of rawItems) {
          const normalized = normalizeItem(item, source);
          const check = await computeChecksum(JSON.stringify(item));

          const rawRow = {
            source_id: source.id,
            network_name: source.network_name,
            external_id: normalized.external_id,
            title: normalized.title,
            description: normalized.description,
            brand: normalized.brand,
            category: normalized.category,
            affiliate_url: normalized.affiliate_url,
            image_url: normalized.image_url,
            raw_data: item,
            advertiser_id: normalized.advertiser_id,
            checksum: check,
            status: "processed",
          };

          const { error: rawErr } = await supabase
            .from("affiliate_raw_deals")
            .upsert(rawRow, { onConflict: "network_name,external_id" });

          if (rawErr) { entry.errors.push(`Raw upsert: ${rawErr.message}`); }
          else { entry.raw++; }
        }

        // ── 3. NORMALIZE + SCORE + DEDUP ──
        const { data: rawDeals } = await supabase
          .from("affiliate_raw_deals")
          .select("*")
          .eq("source_id", source.id)
          .eq("status", "processed");

        if (!rawDeals) continue;

        for (const raw of rawDeals) {
          // Check if already normalized
          const { data: existing } = await supabase
            .from("normalized_deals")
            .select("id")
            .eq("raw_deal_id", raw.id)
            .maybeSingle();
          if (existing) continue;

          const n = normalizeItem(raw.raw_data || {}, source);
          const brandName = normalizeBrand(n.brand_name || "", aliasMap);

          // Dedup check: same brand + title + domain
          const { data: dupe } = await supabase
            .from("normalized_deals")
            .select("id")
            .eq("brand_name", brandName)
            .eq("title", n.title)
            .eq("domain", n.domain || "")
            .maybeSingle();
          if (dupe) {
            // Update last_seen_at on existing
            await supabase.from("normalized_deals")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("id", dupe.id);
            continue;
          }

          // Compute student relevance score
          const scoreInput = { ...n, brand_name: brandName };
          const relevanceScore = computeStudentScore(scoreInput);
          const isStudentRelevant = relevanceScore >= publishThreshold;

          // Determine status
          let status = "draft";
          if (relevanceScore >= 60) status = "published";
          else if (relevanceScore >= publishThreshold) status = "review";

          const normRow = {
            raw_deal_id: raw.id,
            title: n.title,
            brand: brandName,
            category: n.category_primary,
            description: n.short_description,
            affiliate_url: n.affiliate_url,
            image_url: n.image_url,
            source_network: source.network_name,
            verified: false,
            // New fields
            network_item_id: n.network_item_id,
            advertiser_id: n.advertiser_id,
            advertiser_name: n.brand,
            brand_name: brandName,
            short_description: n.short_description,
            long_description: n.long_description,
            deeplink_url: n.deeplink_url,
            domain: n.domain,
            category_primary: n.category_primary,
            category_secondary: n.category_secondary,
            price: n.price,
            sale_price: n.sale_price,
            currency: n.currency,
            estimated_savings_amount: n.estimated_savings_amount,
            estimated_savings_percent: n.estimated_savings_percent,
            coupon_code: n.coupon_code,
            is_coupon: n.is_coupon,
            is_student_relevant: isStudentRelevant,
            student_relevance_score: relevanceScore,
            is_premium_only: relevanceScore >= 80, // High-value = premium
            is_local: false,
            campus_scope: "national",
            expires_at: n.expires_at,
            status,
            last_seen_at: new Date().toISOString(),
          };

          const { error: normErr } = await supabase.from("normalized_deals").insert(normRow);
          if (normErr) { entry.errors.push(`Normalize: ${normErr.message}`); }
          else {
            entry.normalized++;
            if (status === "published") entry.published++;
          }
        }

        // ── 4. Auto-expire deals ──
        await supabase
          .from("normalized_deals")
          .update({ status: "expired" })
          .eq("source_network", source.network_name)
          .not("expires_at", "is", null)
          .lt("expires_at", new Date().toISOString())
          .neq("status", "expired");

        // Update last_synced_at
        await supabase
          .from("affiliate_sources")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", source.id);
      } catch (err: any) {
        entry.errors.push(err.message || "Unknown error");
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Ingestion error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
