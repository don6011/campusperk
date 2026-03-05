import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Threshold: a deal is "trending" when it gets this many clicks in the past 6 hours
const TRENDING_CLICK_THRESHOLD = 15;
const LOOKBACK_HOURS = 6;

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
    const lookbackFrom = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

    // Count clicks per deal in the lookback window
    const { data: recentClicks, error: clickErr } = await supabase
      .from("deal_clicks")
      .select("deal_id")
      .gte("clicked_at", lookbackFrom.toISOString());

    if (clickErr) throw clickErr;

    if (!recentClicks || recentClicks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recent clicks", trending_deals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tally clicks per deal
    const clickCounts = new Map<string, number>();
    for (const c of recentClicks) {
      clickCounts.set(c.deal_id, (clickCounts.get(c.deal_id) || 0) + 1);
    }

    // Filter deals that cross the threshold
    const trendingDealIds = [...clickCounts.entries()]
      .filter(([, count]) => count >= TRENDING_CLICK_THRESHOLD)
      .map(([id]) => id);

    if (trendingDealIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trending deals", trending_deals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which trending deals have already been notified today (avoid duplicates)
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: alreadyNotified } = await supabase
      .from("notification_log")
      .select("title")
      .eq("type", "trending")
      .gte("sent_at", todayStart.toISOString());

    const notifiedTitles = new Set((alreadyNotified || []).map((n) => n.title));

    // Get deal details
    const { data: deals, error: dealErr } = await supabase
      .from("deals")
      .select("id, title, category, store_id")
      .in("id", trendingDealIds)
      .eq("status", "active");

    if (dealErr) throw dealErr;
    if (!deals || deals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active trending deals", trending_deals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out already-notified deals
    const newTrendingDeals = deals.filter(
      (d) => !notifiedTitles.has(`🔥 ${d.title} is trending!`)
    );

    if (newTrendingDeals.length === 0) {
      return new Response(
        JSON.stringify({ message: "All trending deals already notified today", trending_deals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get users who have category alert subscriptions matching trending deal categories
    // Also notify all users who have trending_deals enabled (or default)
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id")
      .limit(1000);

    if (!allUsers || allUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify", trending_deals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce 2/day notification limit
    const today = now.toISOString().split("T")[0];
    const { data: counts } = await supabase
      .from("daily_notification_counts")
      .select("user_id, count")
      .eq("notification_date", today);

    const countMap = new Map((counts || []).map((c: any) => [c.user_id, c.count]));
    const eligibleUsers = allUsers
      .filter((u: any) => (countMap.get(u.id) || 0) < 2)
      .map((u: any) => u.id);

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "All users hit daily notification limit", trending_deals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendPushUrl = `${supabaseUrl}/functions/v1/send-push`;
    let totalSent = 0;

    for (const deal of newTrendingDeals) {
      const clickCount = clickCounts.get(deal.id) || 0;

      const res = await fetch(sendPushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_ids: eligibleUsers,
          title: `🔥 ${deal.title} is trending!`,
          body: `${clickCount} students grabbed this deal in the last ${LOOKBACK_HOURS} hours. Don't miss out!`,
          url: `/deal/${deal.id}`,
          deal_id: deal.id,
          tag: "trending",
          type: "trending",
        }),
      });

      if (res.ok) {
        const result = await res.json();
        totalSent += result.sent || 0;
      } else {
        console.error(`Failed to send trending push for deal ${deal.id}:`, await res.text());
      }
    }

    // Increment daily notification counts
    for (const uid of eligibleUsers) {
      const existing = countMap.get(uid);
      if (existing) {
        await supabase
          .from("daily_notification_counts")
          .update({ count: existing + 1 })
          .eq("user_id", uid)
          .eq("notification_date", today);
      } else {
        await supabase
          .from("daily_notification_counts")
          .insert({ user_id: uid, notification_date: today, count: 1 });
      }
    }

    return new Response(
      JSON.stringify({
        trending_deals: newTrendingDeals.length,
        notifications_sent: totalSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("notify-trending error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
