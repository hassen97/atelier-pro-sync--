import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { WaitlistInvitationEmail } from "../_shared/email-templates/waitlist-invitation.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_BASE_URL = "https://getheavencoin.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Auth check: must be platform_admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const token = authHeader.replace("Bearer ", "");
  if (token !== serviceKey) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Forbidden — platform admin required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Find waitlist entries never notified
  const { data: entries, error } = await admin
    .from("waitlist")
    .select("id, email, notified_at")
    .is("notified_at", null);

  if (error) {
    console.error("[notify-waitlist] query error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let queued = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const entry of entries ?? []) {
    if (!entry.email || !entry.email.includes("@")) {
      skipped++; skipReasons.invalid_email = (skipReasons.invalid_email ?? 0) + 1;
      continue;
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
    const { error: tokErr } = await admin
      .from("email_unsubscribe_tokens")
      .insert({ token: unsubscribeToken, email: entry.email });
    if (tokErr) {
      console.warn("[notify-waitlist] token insert warn:", tokErr);
    }

    const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe?token=${unsubscribeToken}`;
    const signupUrl = `${PUBLIC_BASE_URL}/auth?tab=register&email=${encodeURIComponent(entry.email)}`;

    const html = await renderAsync(
      React.createElement(WaitlistInvitationEmail, {
        signupUrl,
        unsubscribeUrl,
      })
    );

    const text = `Bonne nouvelle ! RepairPro est officiellement lancé.

🎁 Votre cadeau de bienvenue : 3 jours d'essai du plan Pro, activés automatiquement à la création de votre compte.

Créez votre compte maintenant : ${signupUrl}

Se désabonner : ${unsubscribeUrl}`;

    const messageId = crypto.randomUUID();
    const { error: enqErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: entry.email,
        from: "RepairPro <noreply@getheavencoin.com>",
        sender_domain: "notify.getheavencoin.com",
        subject: "🎉 Votre place est confirmée — 3 jours Pro offerts",
        html,
        text,
        label: "waitlist-invitation",
        purpose: "transactional",
        message_id: messageId,
        queued_at: new Date().toISOString(),
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
      },
    });

    if (enqErr) {
      console.error("[notify-waitlist] enqueue err:", enqErr);
      skipped++; skipReasons.enqueue_error = (skipReasons.enqueue_error ?? 0) + 1;
      continue;
    }

    // Mark as notified
    await admin
      .from("waitlist")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", entry.id);

    queued++;
  }

  console.log(`[notify-waitlist] queued=${queued} skipped=${skipped}`, skipReasons);

  return new Response(
    JSON.stringify({ queued, skipped, reasons: skipReasons }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
