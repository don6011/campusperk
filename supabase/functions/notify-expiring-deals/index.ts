import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Called via cron to notify users when their favorited deals are expiring soon (within 24h)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find deals expiring in the next 24 hours
    const { data: expiringDeals } = await supabase
      .from("deals")
      .select("id, title, expires_at, store_id")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", in24h.toISOString())
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

    // Group by user
    const userDeals = new Map<string, typeof expiringDeals>();
    for (const fav of favorites) {
      const deal = expiringDeals.find((d) => d.id === fav.deal_id);
      if (deal) {
        const existing = userDeals.get(fav.user_id) || [];
        existing.push(deal);
        userDeals.set(fav.user_id, existing);
      }
    }

    let totalSent = 0;
    const sendPushUrl = `${supabaseUrl}/functions/v1/send-push`;

    for (const [userId, deals] of userDeals.entries()) {
      const dealNames = deals.map((d) => d.title).slice(0, 3).join(", ");
      const body =
        deals.length === 1
          ? `"${deals[0].title}" expires soon — grab it before it's gone!`
          : `${deals.length} saved deals are expiring soon: ${dealNames}`;

      await fetch(sendPushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: userId,
          title: "⏳ Deals expiring soon!",
          body,
          url: deals.length === 1 ? `/deal/${deals[0].id}` : "/favorites",
          deal_id: deals.length === 1 ? deals[0].id : null,
          tag: "expiring_deal",
        }),
      });
      totalSent++;
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
