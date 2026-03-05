import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function is called via cron (e.g., every evening at 7 PM)
// It finds users who have an active streak but haven't visited today,
// and sends them a push notification reminder.

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

    // Find users with push subscriptions who haven't had any deal_clicks today
    const today = new Date().toISOString().split("T")[0];

    // Get all users with push subscriptions
    const { data: pushUsers } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .limit(500);

    if (!pushUsers || pushUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No push users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(pushUsers.map((p) => p.user_id))];

    // Check which users have visited today (via deal_clicks or deal_claims)
    const { data: activeToday } = await supabase
      .from("deal_clicks")
      .select("user_id")
      .in("user_id", userIds)
      .gte("clicked_at", `${today}T00:00:00Z`);

    const activeUserIds = new Set((activeToday || []).map((a) => a.user_id));
    const inactiveUserIds = userIds.filter((id) => !activeUserIds.has(id));

    if (inactiveUserIds.length === 0) {
      return new Response(JSON.stringify({ message: "All users active today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send push notifications to inactive users
    const sendPushUrl = `${supabaseUrl}/functions/v1/send-push`;
    const response = await fetch(sendPushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_ids: inactiveUserIds,
        title: "🔥 Don't break your streak!",
        body: "Check CampusPerk today to keep your daily streak alive and unlock exclusive drops.",
        url: "/dashboard",
        tag: "streak_reminder",
      }),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ reminded: inactiveUserIds.length, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("streak-reminder error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
