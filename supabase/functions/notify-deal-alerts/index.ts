import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { deal_id } = await req.json();
    if (!deal_id) {
      return new Response(JSON.stringify({ error: "deal_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the deal
    const { data: deal, error: dealErr } = await supabaseAdmin
      .from("deals")
      .select("id, title, description, category, store_id, stores(name)")
      .eq("id", deal_id)
      .single();

    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find alert subscriptions matching this deal's category
    const { data: subs } = await supabaseAdmin
      .from("alert_subscriptions")
      .select("id, user_id, categories");

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchedSubs = subs.filter((sub) => {
      if (!deal.category || !sub.categories) return false;
      return sub.categories.includes(deal.category);
    });

    if (matchedSubs.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build in-app notifications
    const storeName = (deal as any).stores?.name || "a store";
    const notifications = matchedSubs.map((sub) => ({
      user_id: sub.user_id,
      title: `New deal: ${deal.title}`,
      body: `${storeName} just posted a deal in ${deal.category}. Check it out!`,
      deal_id: deal.id,
      category: deal.category,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create notifications" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Email delivery via Resend — will be added when RESEND_API_KEY is configured
    // For each matched user, fetch profile email and send via Resend

    return new Response(
      JSON.stringify({ notified: matchedSubs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
