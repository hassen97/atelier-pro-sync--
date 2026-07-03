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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if Safe Mode is enabled - if so, skip all suspensions
    const { data: safeModeRow } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", "safe_mode_enabled")
      .single();

    if (safeModeRow?.value === "true") {
      console.log("auto-suspend: Safe Mode is ON — skipping all suspensions");
      return new Response(
        JSON.stringify({ success: true, suspended: 0, safe_mode: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find all owners past their verification deadline that are still pending
    const now = new Date().toISOString();
    const { data: expiredProfiles, error: fetchError } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("verification_status", "pending_verification")
      .lt("verification_deadline", now)
      .not("verification_deadline", "is", null);

    if (fetchError) {
      console.error("auto-suspend fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let suspended = 0;
    for (const profile of expiredProfiles || []) {
      // Update verification_status to suspended
      await adminClient
        .from("profiles")
        .update({ verification_status: "suspended", is_locked: true })
        .eq("user_id", profile.user_id);

      // Ban the user in auth
      await adminClient.auth.admin.updateUserById(profile.user_id, {
        ban_duration: "876000h",
      });

      suspended++;
    }

    console.log(`auto-suspend: suspended ${suspended} accounts`);
    return new Response(
      JSON.stringify({ success: true, suspended }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auto-suspend error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
