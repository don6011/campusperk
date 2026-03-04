import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * schedule-deal-drops
 *
 * Called periodically (e.g. every 15 minutes) by pg_cron.
 * Picks random deals to become "surprise drops" within the current drop window.
 *
 * Drop Windows (UTC – adjust for your timezone):
 *   Morning:   14:00 – 16:00 UTC  (9 AM – 11 AM EST)
 *   Afternoon: 18:00 – 21:00 UTC  (1 PM – 4 PM EST)
 *   Evening:   00:00 – 03:00 UTC  (7 PM – 10 PM EST)
 *
 * Each invocation:
 * 1. Checks if we're inside a drop window
 * 2. Picks 1-3 active deals not already dropped today
 * 3. Sets is_surprise_drop=true, drop_window, drop_time
 * 4. Sends push notifications (with 2/day limit)
 */

interface DropWindow {
  name: string;
  startHour: number;
  endHour: number;
}

const DROP_WINDOWS: DropWindow[] = [
  { name: "morning",   startHour: 14, endHour: 16 },   // 9-11 AM EST
  { name: "afternoon", startHour: 18, endHour: 21 },   // 1-4 PM EST
  { name: "evening",   startHour: 0,  endHour: 3 },    // 7-10 PM EST (next day UTC)
];

const MAX_DAILY_NOTIFICATIONS = 2;
const MAX_DROPS_PER_WINDOW = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const utcHour = now.getUTCHours();

    // Find current window
    const currentWindow = DROP_WINDOWS.find(
      (w) => utcHour >= w.startHour && utcHour < w.endHour
    );

    if (!currentWindow) {
      return new Response(
        JSON.stringify({ message: "Not in a drop window", utcHour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we already dropped deals in this window today
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: todayDrops } = await supabase
      .from("deals")
      .select("id")
      .eq("is_surprise_drop", true)
      .eq("drop_window", currentWindow.name)
      .gte("drop_time", todayStart.toISOString());

    if (todayDrops && todayDrops.length >= MAX_DROPS_PER_WINDOW) {
      return new Response(
        JSON.stringify({ message: "Already dropped max deals in this window", window: currentWindow.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const remainingSlots = MAX_DROPS_PER_WINDOW - (todayDrops?.length || 0);

    // Pick random active deals that haven't been dropped today
    const { data: candidates, error: candErr } = await supabase
      .from("deals")
      .select("id, title, discount_value, category, store_id")
      .eq("status", "active")
      .eq("is_surprise_drop", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (candErr) throw candErr;
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No candidate deals available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shuffle and pick
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(remainingSlots, shuffled.length));

    // Mark deals as surprise drops
    const dropTime = now.toISOString();
    for (const deal of picked) {
      await supabase
        .from("deals")
        .update({
          is_surprise_drop: true,
          drop_window: currentWindow.name,
          drop_time: dropTime,
        })
        .eq("id", deal.id);
    }

    // Send push notifications with 2/day limit
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id")
      .limit(1000);

    if (allUsers && allUsers.length > 0) {
      // Check daily notification counts
      const today = now.toISOString().split("T")[0];
      const { data: counts } = await supabase
        .from("daily_notification_counts")
        .select("user_id, count")
        .eq("notification_date", today);

      const countMap = new Map((counts || []).map((c: any) => [c.user_id, c.count]));
      const eligibleUsers = allUsers
        .filter((u: any) => (countMap.get(u.id) || 0) < MAX_DAILY_NOTIFICATIONS)
        .map((u: any) => u.id);

      if (eligibleUsers.length > 0) {
        const sendPushUrl = `${supabaseUrl}/functions/v1/send-push`;

        for (const deal of picked) {
          await fetch(sendPushUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_ids: eligibleUsers,
              title: `⚡ Surprise Deal Drop!`,
              body: `${deal.title} just dropped — grab it before it's gone!`,
              url: `/deal/${deal.id}`,
              deal_id: deal.id,
              tag: "deal_drops",
              type: "deal_drops",
            }),
          });
        }

        // Increment daily counts
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
      }
    }

    return new Response(
      JSON.stringify({
        window: currentWindow.name,
        deals_dropped: picked.length,
        deal_ids: picked.map((d) => d.id),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("schedule-deal-drops error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
