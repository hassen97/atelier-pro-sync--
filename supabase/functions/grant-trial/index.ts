import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 7;
const MAX_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000; // fresh signups only
const MAX_TRIALS_PER_IP_7D = 3; // fraud cap: trials per IP over 7 days

function denied(reason: string, status = 200) {
  return new Response(JSON.stringify({ granted: false, reason }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Server-authoritative welcome trial grant.
 *
 * Replaces the old client-side grant (which let anyone INSERT any plan/expiry
 * into shop_subscriptions via RLS self-write policies). Eligibility is decided
 * HERE: fresh account, never claimed before, per-IP fraud cap. The client only
 * ever asks — it never writes shop_subscriptions itself.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth: require the caller's own valid JWT ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return denied("unauthorized", 401);
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return denied("unauthorized", 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // ── 1) Fresh signup only (< 24h old account) ──
    const createdAt = Date.parse(userData.user.created_at ?? "");
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > MAX_ACCOUNT_AGE_MS) {
      return denied("not_fresh");
    }

    // ── 2) One trial ever per user (claims log is the source of truth) ──
    const { count: claimCount, error: claimErr } = await admin
      .from("trial_claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (claimErr) return denied("internal_error", 500);
    if ((claimCount ?? 0) > 0) return denied("already_claimed");

    // A live (non-canceled) subscription also blocks the claim — covers e.g.
    // the waitlist 3-day gift or an admin-granted plan.
    const { count: liveCount, error: liveErr } = await admin
      .from("shop_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (liveErr) return denied("internal_error", 500);
    if ((liveCount ?? 0) > 0) return denied("already_has_subscription");

    // ── 3) Per-IP fraud cap ──
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") ||
               req.headers.get("x-real-ip") ||
               "unknown";
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: ipCount, error: ipErr } = await admin
      .from("trial_claims")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", sevenDaysAgo);
    if (ipErr) return denied("internal_error", 500);
    if ((ipCount ?? 0) >= MAX_TRIALS_PER_IP_7D) return denied("ip_limit");

    // ── 4) Resolve the trial plan: cheapest active Pro plan (not Entreprise) ──
    const { data: proPlan, error: planErr } = await admin
      .from("subscription_plans")
      .select("id")
      .ilike("name", "%Pro%")
      .not("name", "ilike", "%Entreprise%")
      .eq("is_active", true)
      .order("price", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (planErr || !proPlan?.id) return denied("no_trial_plan");

    // ── 5) Grant: claim log first (blocks concurrent re-entry), then the sub ──
    const { error: logErr } = await admin
      .from("trial_claims")
      .insert({ user_id: userId, ip_address: ip });
    if (logErr) return denied("internal_error", 500);

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const { error: subErr } = await admin
      .from("shop_subscriptions")
      .insert({
        user_id: userId,
        plan_id: proPlan.id,
        status: "trialing",
        started_at: now.toISOString(),
        expires_at: trialEnd.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      });
    if (subErr) {
      // Roll back the claim so a transient insert failure doesn't burn the offer
      await admin.from("trial_claims").delete().eq("user_id", userId);
      console.error("[grant-trial] subscription insert failed:", subErr);
      return denied("internal_error", 500);
    }

    return new Response(
      JSON.stringify({ granted: true, days: TRIAL_DAYS, expires_at: trialEnd.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[grant-trial] fatal:", err);
    return denied("internal_error", 500);
  }
});
