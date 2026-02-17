import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticated client to get the user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email ?? "";
    const domain = email.split("@")[1]?.toLowerCase() ?? "";

    if (!domain.endsWith(".edu")) {
      return new Response(JSON.stringify({ error: "A valid .edu email is required for student verification." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Check rate limit: max 5 attempts per user per hour
    const { data: rateLimited } = await supabaseAdmin.rpc("check_verification_rate_limit", {
      p_user_id: user.id,
      p_max_attempts: 5,
      p_window_hours: 1,
    });

    if (rateLimited) {
      // Log the suspicious attempt
      await supabaseAdmin.from("verification_attempts").insert({
        email,
        email_domain: domain,
        user_id: user.id,
        success: false,
        ip_hint: (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().replace(/\.\d+$/, ".x"),
      });

      return new Response(JSON.stringify({ error: "Too many verification attempts. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check domain abuse: max 3 successful verifications per domain in 24h
    const { data: domainAbused } = await supabaseAdmin.rpc("check_domain_abuse", {
      p_domain: domain,
      p_window_hours: 24,
      p_max_accounts: 3,
    });

    if (domainAbused) {
      await supabaseAdmin.from("verification_attempts").insert({
        email,
        email_domain: domain,
        user_id: user.id,
        success: false,
        ip_hint: (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().replace(/\.\d+$/, ".x"),
      });

      return new Response(
        JSON.stringify({ error: "This .edu domain has reached its verification limit. Please try again later or contact support." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Check if already verified
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("student_verified")
      .eq("id", user.id)
      .single();

    if (profile?.student_verified) {
      return new Response(JSON.stringify({ message: "Already verified", verified: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify the student — set student_verified = true
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ student_verified: true })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    // 5. Log successful verification attempt
    await supabaseAdmin.from("verification_attempts").insert({
      email,
      email_domain: domain,
      user_id: user.id,
      success: true,
      ip_hint: (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().replace(/\.\d+$/, ".x"),
    });

    // 6. Log in audit table
    await supabaseAdmin.from("verification_audit_log").insert({
      admin_id: user.id, // self-verification
      user_id: user.id,
      previous_status: false,
      new_status: true,
      reason: "Self-verified via .edu email",
      verification_method: "edu",
    });

    return new Response(JSON.stringify({ message: "Student verification successful!", verified: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-student error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
