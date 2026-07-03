import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS_PER_HOUR = 5;
const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, phone, captchaToken } = await req.json().catch(() => ({}));

    // Validate username format server-side
    if (!username || typeof username !== "string") {
      return new Response(
        JSON.stringify({ allowed: false, reason: "username required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "invalid username format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify hCaptcha token
    const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    if (hcaptchaSecret && captchaToken) {
      try {
        const verifyRes = await fetch(HCAPTCHA_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `response=${encodeURIComponent(captchaToken)}&secret=${encodeURIComponent(hcaptchaSecret)}`,
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          return new Response(
            JSON.stringify({ allowed: false, reason: "captcha_failed" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.error("hCaptcha verification error:", err);
        // Fail open if hCaptcha API is unreachable
      }
    }
    // Note: if no captchaToken provided, we fail open and rely on rate limiting + uniqueness checks below.
    // hCaptcha is only enforced when the client has the site key configured and sends a token.

    // (Math challenge removed)

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") ||
               req.headers.get("x-real-ip") ||
               "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check IP rate limit: count attempts in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await adminClient
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", oneHourAgo);

    if (countError) {
      console.error("signup-guard count error:", countError);
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((count ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "rate_limited" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check username uniqueness
    const { data: existingUser } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("username", trimmed)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "username_taken" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check phone uniqueness if provided
    if (phone && typeof phone === "string" && phone.trim().length >= 5) {
      const { data: existingPhone } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("phone", phone.trim())
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        return new Response(
          JSON.stringify({ allowed: false, reason: "phone_taken" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Record this attempt
    await adminClient.from("signup_attempts").insert({ ip_address: ip });

    // Cleanup old records (> 24h) — fire and forget
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    adminClient.from("signup_attempts").delete().lt("created_at", oneDayAgo).then(() => {});

    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("signup-guard error:", err);
    return new Response(
      JSON.stringify({ allowed: false, reason: "internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
