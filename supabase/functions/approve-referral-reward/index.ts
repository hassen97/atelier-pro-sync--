import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  referralId: z.string().uuid(),
});

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Service-role client (also used to resolve the caller — ES256 signing keys
    // require validating the token with the admin client on Lovable Cloud).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    // Authorize: caller must be a platform admin
    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "platform_admin",
    });
    if (roleErr || !isAdmin) {
      return jsonResp({ error: "Forbidden" }, 403);
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResp({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { referralId } = parsed.data;

    // Load referral
    const { data: referral, error: refErr } = await adminClient
      .from("referrals")
      .select("id, referrer_id, status")
      .eq("id", referralId)
      .maybeSingle();
    if (refErr) return jsonResp({ error: refErr.message }, 500);
    if (!referral) return jsonResp({ error: "Referral not found" }, 404);

    if (referral.status === "rewarded") {
      return jsonResp({ error: "Cette récompense a déjà été accordée." }, 409);
    }
    if (referral.status !== "joined") {
      return jsonResp({ error: "La boutique parrainée n'a pas encore finalisé son inscription." }, 409);
    }

    const referrerId = referral.referrer_id as string;
    const REWARD_DAYS = 30;

    // Find the referrer's active subscription (most recent)
    const { data: activeSub } = await adminClient
      .from("shop_subscriptions")
      .select("id, expires_at, plan_id")
      .eq("user_id", referrerId)
      .in("status", ["active", "trialing"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();

    if (activeSub) {
      // Extend from the later of (now, current expiry)
      const base = activeSub.expires_at && new Date(activeSub.expires_at) > now
        ? new Date(activeSub.expires_at)
        : now;
      const newExpiry = new Date(base);
      newExpiry.setDate(newExpiry.getDate() + REWARD_DAYS);

      const { error: updErr } = await adminClient
        .from("shop_subscriptions")
        .update({ expires_at: newExpiry.toISOString(), status: "active" })
        .eq("id", activeSub.id);
      if (updErr) return jsonResp({ error: updErr.message }, 500);
    } else {
      // No active subscription: create one on the cheapest Pro plan if available, else any plan
      const { data: plan } = await adminClient
        .from("subscription_plans")
        .select("id")
        .order("price", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!plan) {
        return jsonResp({ error: "Aucun plan disponible pour créer un abonnement." }, 500);
      }

      const newExpiry = new Date(now);
      newExpiry.setDate(newExpiry.getDate() + REWARD_DAYS);

      const { error: insErr } = await adminClient
        .from("shop_subscriptions")
        .insert({
          user_id: referrerId,
          plan_id: plan.id,
          status: "active",
          started_at: now.toISOString(),
          expires_at: newExpiry.toISOString(),
          set_by_admin: callerId,
        });
      if (insErr) return jsonResp({ error: insErr.message }, 500);
    }

    // Mark referral as rewarded
    const { error: markErr } = await adminClient
      .from("referrals")
      .update({
        status: "rewarded",
        reward_granted_at: now.toISOString(),
        rewarded_by: callerId,
      })
      .eq("id", referralId);
    if (markErr) return jsonResp({ error: markErr.message }, 500);

    return jsonResp({ success: true, rewardDays: REWARD_DAYS });
  } catch (err) {
    console.error("[approve-referral-reward] error:", err);
    return jsonResp({ error: (err as Error)?.message ?? "Internal error" }, 500);
  }
});
