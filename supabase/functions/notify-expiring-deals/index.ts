import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Notify users when their favorited deals expire within 12 hours
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal secret check
    const secret = req.headers.get("x-internal-secret");
    if (secret !== Deno.env.get("INTERNAL_SECRET")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    // Deals expiring within 12 hours
    const { data: expiringDeals } = await supabase
      .from("deals")
      .select("id, title, expires_at, store_id")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", in12h.toISOString())
      .limit(50);

    if (!expiringDeals || expiringDeals.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring deals" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dealIds = expiringDeals.map((d) => d.id);

    // Find users who have favorited these deals
    const { data: favorites } = await supabase
      .from("favorites")
      .select("user_id, deal_id")
      .in("deal_id", dealIds);

    if (!favorites || favorites.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: check if we already notified today for these deals
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: alreadySent } = await supabase
      .from("notification_log")
      .select("user_id, title")
      .eq("type", "ending_soon")
      .gte("sent_at", todayStart.toISOString());

    const sentKeys = new Set(
      (alreadySent || []).map((n) => `${n.user_id}:${n.title}`)
    );

    // Group by user
    const userDeals = new Map<string, typeof expiringDeals>();
    for (const fav of favorites) {
      const deal = expiringDeals.find((d) => d.id === fav.deal_id);
      if (!deal) continue;

      // Skip if already notified today
      const key = `${fav.user_id}:⏳ Deals expiring soon!`;
      if (sentKeys.has(key)) continue;

      const existing = userDeals.get(fav.user_id) || [];
      existing.push(deal);
      userDeals.set(fav.user_id, existing);
    }

    if (userDeals.size === 0) {
      return new Response(JSON.stringify({ message: "All users already notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    const sendPushUrl = `${supabaseUrl}/functions/v1/send-push`;

    for (const [userId, deals] of userDeals.entries()) {
      const dealNames = deals.map((d) => d.title).slice(0, 3).join(", ");
      const body =
        deals.length === 1
          ? `"${deals[0].title}" expires soon — grab it before it's gone!`
          : `${deals.length} saved deals are expiring soon: ${dealNames}`;

      const res = await fetch(sendPushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          "x-internal-secret": Deno.env.get("INTERNAL_SECRET") || "",
        },
        body: JSON.stringify({
          user_id: userId,
          title: "⏳ Deals expiring soon!",
          body,
          url: deals.length === 1 ? `/deal/${deals[0].id}` : "/favorites",
          deal_id: deals.length === 1 ? deals[0].id : null,
          tag: "ending_soon",
          type: "ending_soon",
        }),
      });

      if (res.ok) {
        totalSent++;
      } else {
        console.error(`Failed to notify ${userId}:`, await res.text());
      }
    }

    return new Response(
      JSON.stringify({ notified_users: totalSent, expiring_deals: expiringDeals.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("notify-expiring error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
