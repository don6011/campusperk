import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push requires crypto signing – we use the web-push approach via Deno crypto
// For simplicity, this function accepts a user_id + notification payload
// and sends to all registered push subscriptions for that user.

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  // Use the web-push-deno approach
  const { default: webpush } = await import(
    "https://esm.sh/web-push@3.6.7"
  );

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    payload
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, user_ids, title, body, url, deal_id, tag } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@campusperk.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine target user IDs
    const targetIds: string[] = user_ids || (user_id ? [user_id] : []);

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetIds);

    if (subError) throw subError;

    const payload = JSON.stringify({ title, body, url, deal_id, tag });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions || []) {
      try {
        await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );
        sent++;
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint}:`, err.message);
        failed++;
        // Remove expired subscriptions (410 Gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Also insert in-app notification for each user
    const notificationRows = targetIds.map((uid) => ({
      user_id: uid,
      title,
      body,
      deal_id: deal_id || null,
      category: tag || "push",
    }));

    await supabase.from("notifications").insert(notificationRows);

    return new Response(
      JSON.stringify({ sent, failed, total: (subscriptions || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
