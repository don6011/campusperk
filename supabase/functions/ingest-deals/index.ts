import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optionally accept a specific source_id
    let sourceId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        sourceId = body.source_id ?? null;
      } catch {
        // no body is fine
      }
    }

    // Fetch active sources
    let query = supabase
      .from("affiliate_sources")
      .select("*")
      .eq("status", "active");
    if (sourceId) query = query.eq("id", sourceId);

    const { data: sources, error: srcErr } = await query;
    if (srcErr) throw srcErr;
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active sources to sync" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { raw: number; normalized: number; errors: string[] }> = {};

    for (const source of sources) {
      const entry = { raw: 0, normalized: 0, errors: [] as string[] };
      results[source.network_name] = entry;

      try {
        let rawDeals: any[] = [];

        // Fetch from feed_url (JSON feed)
        if (source.feed_url) {
          const resp = await fetch(source.feed_url);
          if (!resp.ok) {
            entry.errors.push(`Feed fetch failed: ${resp.status}`);
            continue;
          }
          const data = await resp.json();
          // Support array or { deals: [...] } or { offers: [...] }
          rawDeals = Array.isArray(data)
            ? data
            : data.deals || data.offers || data.items || [];
        } else if (source.api_endpoint) {
          // Fetch from API endpoint
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          // If there's a secret name, try to get the key from env
          if (source.api_key_secret_name) {
            const apiKey = Deno.env.get(source.api_key_secret_name);
            if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
          }
          const resp = await fetch(source.api_endpoint, { headers });
          if (!resp.ok) {
            entry.errors.push(`API fetch failed: ${resp.status}`);
            continue;
          }
          const data = await resp.json();
          rawDeals = Array.isArray(data)
            ? data
            : data.deals || data.offers || data.items || [];
        } else {
          entry.errors.push("No feed_url or api_endpoint configured");
          continue;
        }

        // Store raw deals (upsert by network + external_id)
        for (const deal of rawDeals) {
          const externalId =
            deal.id?.toString() ||
            deal.external_id?.toString() ||
            deal.offer_id?.toString() ||
            crypto.randomUUID();

          const rawRow = {
            source_id: source.id,
            network_name: source.network_name,
            external_id: externalId,
            title: deal.title || deal.name || "Untitled",
            description: deal.description || deal.summary || null,
            brand: deal.brand || deal.advertiser || deal.merchant || null,
            category: deal.category || null,
            affiliate_url: deal.affiliate_url || deal.tracking_url || deal.url || null,
            image_url: deal.image_url || deal.image || null,
            raw_data: deal,
          };

          const { error: rawErr } = await supabase
            .from("affiliate_raw_deals")
            .upsert(rawRow, { onConflict: "network_name,external_id" });

          if (rawErr) {
            entry.errors.push(`Raw upsert error: ${rawErr.message}`);
          } else {
            entry.raw++;
          }
        }

        // Normalize: fetch all raw deals for this source that don't have a normalized entry yet
        const { data: unprocessed } = await supabase
          .from("affiliate_raw_deals")
          .select("*")
          .eq("source_id", source.id)
          .not(
            "id",
            "in",
            `(SELECT raw_deal_id FROM normalized_deals WHERE raw_deal_id IS NOT NULL)`
          );

        // Simpler approach: just upsert all raw deals as normalized
        const { data: allRaw } = await supabase
          .from("affiliate_raw_deals")
          .select("*")
          .eq("source_id", source.id);

        if (allRaw) {
          for (const raw of allRaw) {
            // Check if already normalized
            const { data: existing } = await supabase
              .from("normalized_deals")
              .select("id")
              .eq("raw_deal_id", raw.id)
              .maybeSingle();

            if (!existing) {
              const { error: normErr } = await supabase
                .from("normalized_deals")
                .insert({
                  raw_deal_id: raw.id,
                  title: raw.title,
                  brand: raw.brand,
                  category: raw.category,
                  description: raw.description,
                  affiliate_url: raw.affiliate_url,
                  image_url: raw.image_url,
                  source_network: raw.network_name,
                  verified: false,
                });
              if (normErr) {
                entry.errors.push(`Normalize error: ${normErr.message}`);
              } else {
                entry.normalized++;
              }
            }
          }
        }

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
