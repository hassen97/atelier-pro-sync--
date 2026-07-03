import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { OnboardingReminderEmail } from "../_shared/email-templates/onboarding-reminder.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_BASE_URL = "https://atelier-pro-sync.lovable.app";
const MIN_HOURS_BETWEEN_REMINDERS = 72; // 3 days
const MAX_REMINDERS = 2;
const FIRST_REMINDER_DAYS = 2;
const SECOND_REMINDER_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let body: { mode?: "manual" | "auto" } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = body.mode === "auto" ? "auto" : "manual";

  // Auth check for manual mode (must be platform_admin)
  if (mode === "manual") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    // Allow service role calls (cron) to use manual too
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
  }

  // Find eligible owners: super_admin + onboarding_completed=false + has email + reminders < max
  const { data: owners, error: ownersErr } = await admin
    .from("shop_settings")
    .select(
      "user_id, shop_name, last_onboarding_reminder_sent_at, onboarding_reminders_sent"
    )
    .eq("onboarding_completed", false)
    .lt("onboarding_reminders_sent", MAX_REMINDERS);

  if (ownersErr) {
    console.error("[send-onboarding-reminder] owners query error:", ownersErr);
    return new Response(
      JSON.stringify({ error: ownersErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let queued = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const ss of owners ?? []) {
    // Verify role super_admin
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", ss.user_id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!role) {
      skipped++; skipReasons.not_owner = (skipReasons.not_owner ?? 0) + 1;
      continue;
    }

    // Get profile (email + name + created_at)
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, created_at")
      .eq("user_id", ss.user_id)
      .maybeSingle();

    if (!profile?.email) {
      skipped++; skipReasons.no_email = (skipReasons.no_email ?? 0) + 1;
      continue;
    }

    // Cooldown: minimum 3 days since last reminder
    if (ss.last_onboarding_reminder_sent_at) {
      const hoursSince =
        (Date.now() - new Date(ss.last_onboarding_reminder_sent_at).getTime()) /
        (1000 * 60 * 60);
      if (hoursSince < MIN_HOURS_BETWEEN_REMINDERS) {
        skipped++; skipReasons.cooldown = (skipReasons.cooldown ?? 0) + 1;
        continue;
      }
    }

    // Auto mode: enforce J+2 / J+7 schedule
    if (mode === "auto") {
      const ageDays = profile.created_at
        ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const remindersSent = ss.onboarding_reminders_sent ?? 0;
      if (remindersSent === 0 && ageDays < FIRST_REMINDER_DAYS) {
        skipped++; skipReasons.too_recent = (skipReasons.too_recent ?? 0) + 1;
        continue;
      }
      if (remindersSent === 1 && ageDays < SECOND_REMINDER_DAYS) {
        skipped++; skipReasons.too_recent = (skipReasons.too_recent ?? 0) + 1;
        continue;
      }
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
    const { error: tokErr } = await admin
      .from("email_unsubscribe_tokens")
      .insert({ token: unsubscribeToken, email: profile.email });
    if (tokErr) {
      console.warn("[send-onboarding-reminder] token insert warn:", tokErr);
    }
    const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe?token=${unsubscribeToken}`;
    const setupUrl = `${PUBLIC_BASE_URL}/onboarding/setup`;

    // Render email
    const html = await renderAsync(
      React.createElement(OnboardingReminderEmail, {
        recipientName: profile.full_name ?? "",
        setupUrl,
        unsubscribeUrl,
      })
    );

    const text = `Bonjour ${profile.full_name ?? ""},

Votre compte RepairPro est actif, mais votre atelier n'est pas encore configuré.

Sans configuration, vos clients voient une page de suivi sans votre logo, votre adresse, ni vos coordonnées.

Il vous reste seulement 2 minutes pour ajouter :
- Le nom et le logo de votre boutique
- Vos numéros de téléphone et WhatsApp
- Votre adresse et vos horaires d'ouverture

Compléter maintenant : ${setupUrl}

Se désabonner : ${unsubscribeUrl}`;

    const messageId = crypto.randomUUID();
    const { error: enqErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: profile.email,
        from: "RepairPro <noreply@getheavencoin.com>",
        sender_domain: "notify.getheavencoin.com",
        subject: "🚀 Terminez la configuration de votre boutique",
        html,
        text,
        label: "onboarding-reminder",
        purpose: "transactional",
        message_id: messageId,
        queued_at: new Date().toISOString(),
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
      },
    });

    if (enqErr) {
      console.error("[send-onboarding-reminder] enqueue err:", enqErr);
      skipped++; skipReasons.enqueue_error = (skipReasons.enqueue_error ?? 0) + 1;
      continue;
    }

    // Update tracking on shop_settings
    await admin
      .from("shop_settings")
      .update({
        last_onboarding_reminder_sent_at: new Date().toISOString(),
        onboarding_reminders_sent: (ss.onboarding_reminders_sent ?? 0) + 1,
      })
      .eq("user_id", ss.user_id);

    queued++;
  }

  console.log(`[send-onboarding-reminder] mode=${mode} queued=${queued} skipped=${skipped}`, skipReasons);

  return new Response(
    JSON.stringify({ mode, queued, skipped, reasons: skipReasons }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
