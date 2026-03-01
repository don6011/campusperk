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

    // Current week boundaries (Monday 00:00 UTC)
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - diff);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

    // Aggregate redemptions for current week grouped by campus
    const { data: redemptions, error: fetchErr } = await supabase
      .from("deal_redemptions")
      .select("campus_id, savings_amount")
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString());

    if (fetchErr) throw fetchErr;

    // Sum by campus
    const totals = new Map<string, number>();
    for (const r of redemptions || []) {
      totals.set(r.campus_id, (totals.get(r.campus_id) || 0) + Number(r.savings_amount));
    }

    // Upsert into campus_savings
    let upserted = 0;
    for (const [campusId, totalSavings] of totals) {
      const { error: upsertErr } = await supabase
        .from("campus_savings")
        .upsert(
          {
            campus_id: campusId,
            total_savings: totalSavings,
            week_start: weekStart.toISOString(),
            week_end: weekEnd.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "campus_id,week_start" }
        );
      if (upsertErr) {
        console.error(`Upsert failed for campus ${campusId}:`, upsertErr.message);
      } else {
        upserted++;
      }
    }

    // Trigger ranking change notifications after aggregation
    try {
      const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-ranking-changes`;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to trigger notify-ranking-changes:", notifyErr);
    }

    return new Response(
      JSON.stringify({ success: true, campuses_updated: upserted, week_start: weekStart.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("aggregate-campus-savings error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
