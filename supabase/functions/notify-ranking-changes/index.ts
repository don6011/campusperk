import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate current and previous week boundaries
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;

    const currentWeekStart = new Date(now);
    currentWeekStart.setUTCDate(now.getUTCDate() - diff);
    currentWeekStart.setUTCHours(0, 0, 0, 0);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);

    // Fetch current week rankings
    const { data: currentSavings, error: currErr } = await supabase
      .from("campus_savings")
      .select("campus_id, total_savings")
      .eq("week_start", currentWeekStart.toISOString())
      .order("total_savings", { ascending: false });

    if (currErr) throw currErr;

    // Fetch previous week rankings
    const { data: previousSavings, error: prevErr } = await supabase
      .from("campus_savings")
      .select("campus_id, total_savings")
      .eq("week_start", previousWeekStart.toISOString())
      .order("total_savings", { ascending: false });

    if (prevErr) throw prevErr;

    if (!currentSavings?.length) {
      return new Response(
        JSON.stringify({ success: true, notifications_sent: 0, reason: "no_current_data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build rank maps (1-indexed)
    const currentRanks = new Map<string, number>();
    currentSavings.forEach((s, i) => currentRanks.set(s.campus_id, i + 1));

    const previousRanks = new Map<string, number>();
    (previousSavings || []).forEach((s, i) => previousRanks.set(s.campus_id, i + 1));

    // Get campus names for readable notifications
    const campusIds = [...currentRanks.keys()];
    const { data: campuses } = await supabase
      .from("campus_domains")
      .select("id, campus_name")
      .in("id", campusIds);

    const campusNameMap = new Map<string, string>();
    (campuses || []).forEach((c) => campusNameMap.set(c.id, c.campus_name || "Your campus"));

    // Determine which campuses changed rank
    const changes: { campusId: string; oldRank: number | null; newRank: number; direction: "up" | "down" | "new" }[] = [];

    for (const [campusId, newRank] of currentRanks) {
      const oldRank = previousRanks.get(campusId) ?? null;
      if (oldRank === null) {
        changes.push({ campusId, oldRank, newRank, direction: "new" });
      } else if (newRank < oldRank) {
        changes.push({ campusId, oldRank, newRank, direction: "up" });
      } else if (newRank > oldRank) {
        changes.push({ campusId, oldRank, newRank, direction: "down" });
      }
      // No change = no notification
    }

    if (!changes.length) {
      return new Response(
        JSON.stringify({ success: true, notifications_sent: 0, reason: "no_rank_changes" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each changed campus, notify all users belonging to that campus
    let totalNotifications = 0;

    for (const change of changes) {
      const campusName = campusNameMap.get(change.campusId) || "Your campus";

      let title: string;
      let body: string;

      if (change.direction === "up") {
        title = `🎉 ${campusName} moved up!`;
        body = `Your campus climbed from #${change.oldRank} to #${change.newRank} on the weekly leaderboard. Keep saving!`;
      } else if (change.direction === "down") {
        title = `📉 ${campusName} dropped in rankings`;
        body = `Your campus slipped from #${change.oldRank} to #${change.newRank}. Redeem more deals to climb back up!`;
      } else {
        title = `🆕 ${campusName} joined the leaderboard!`;
        body = `Your campus debuted at #${change.newRank} on the weekly leaderboard. Great start!`;
      }

      // Get all users for this campus
      const { data: users, error: usersErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("campus_id", change.campusId);

      if (usersErr) {
        console.error(`Failed to fetch users for campus ${change.campusId}:`, usersErr.message);
        continue;
      }

      if (!users?.length) continue;

      // Batch insert notifications
      const notifications = users.map((u) => ({
        user_id: u.id,
        title,
        body,
        category: "leaderboard",
      }));

      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertErr) {
        console.error(`Failed to insert notifications for campus ${change.campusId}:`, insertErr.message);
      } else {
        totalNotifications += notifications.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campuses_changed: changes.length,
        notifications_sent: totalNotifications,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-ranking-changes error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
