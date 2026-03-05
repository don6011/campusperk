import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Get a Google OAuth2 access token from a service account JSON
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: serviceAccount.token_uri,
      iat: now,
      exp: now + 3600,
    })
  );

  // Import the private key and sign the JWT
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, signatureInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

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

    const { user_id, user_ids, title, body, url, deal_id, tag, type } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firebaseJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (!firebaseJson) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT_JSON not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(firebaseJson);
    const projectId = serviceAccount.project_id;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine target user IDs
    const targetIds: string[] = user_ids || (user_id ? [user_id] : []);
    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch notification preferences to filter recipients
    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .in("user_id", targetIds);

    const prefsMap = new Map((allPrefs || []).map((p: any) => [p.user_id, p]));
    const now = new Date();
    const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

    const filteredIds = targetIds.filter((uid) => {
      const p = prefsMap.get(uid);
      if (!p) return true; // no prefs = all defaults (enabled)

      // Check notification type preference
      const notifType = type || tag || "deal_drops";
      if (notifType === "deal_drops" && !p.deal_drops) return false;
      if (notifType === "trending" && !p.trending_deals) return false;
      if (notifType === "ending_soon" && !p.ending_soon) return false;
      if (notifType === "local_deals" && !p.local_deals) return false;
      if (notifType === "savings" && !p.savings_alerts) return false;

      // Check quiet hours
      if (p.quiet_hours_enabled) {
        const start = p.quiet_start || "22:00";
        const end = p.quiet_end || "08:00";
        if (start > end) {
          // Overnight quiet hours
          if (currentTime >= start || currentTime < end) return false;
        } else {
          if (currentTime >= start && currentTime < end) return false;
        }
      }

      return true;
    });

    // Fetch FCM device tokens for filtered users
    const { data: devices, error: devError } = await supabase
      .from("push_devices")
      .select("*")
      .in("user_id", filteredIds);

    if (devError) throw devError;

    // Get FCM access token
    const accessToken = await getAccessToken(serviceAccount);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    let failed = 0;

    for (const device of devices || []) {
      try {
        const message: any = {
          token: device.fcm_token,
          notification: { title, body },
          data: {
            url: url || "/dashboard",
            deal_id: deal_id || "",
            tag: tag || "campusperk",
          },
        };

        // Platform-specific config
        if (device.platform === "ios") {
          message.apns = {
            payload: {
              aps: { sound: "default", badge: 1 },
            },
          };
        } else {
          message.android = {
            priority: "high",
            notification: { sound: "default", channel_id: "campusperk_deals" },
          };
        }

        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error(`FCM send failed for ${device.fcm_token}:`, errBody);
          failed++;
          // Remove invalid tokens
          if (res.status === 404 || res.status === 410 || errBody.includes("UNREGISTERED")) {
            await supabase.from("push_devices").delete().eq("id", device.id);
          }
        }
      } catch (err: any) {
        console.error(`Push failed for device ${device.id}:`, err.message);
        failed++;
      }
    }

    // Insert in-app notifications
    const notificationRows = targetIds.map((uid) => ({
      user_id: uid,
      title,
      body,
      deal_id: deal_id || null,
      category: tag || type || "push",
    }));
    await supabase.from("notifications").insert(notificationRows);

    // Insert notification log
    const logRows = (devices || []).map((d: any) => ({
      user_id: d.user_id,
      type: type || tag || "push",
      title,
      body,
      status: "sent",
    }));
    if (logRows.length > 0) {
      await supabase.from("notification_log").insert(logRows);
    }

    return new Response(
      JSON.stringify({ sent, failed, total: (devices || []).length, filtered_out: targetIds.length - filteredIds.length }),
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
