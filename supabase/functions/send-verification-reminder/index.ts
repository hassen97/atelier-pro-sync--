import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { VerificationReminderEmail } from "../_shared/email-templates/verification-reminder.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_BASE_URL = "https://www.getheavencoin.com";
const MIN_HOURS_BETWEEN_REMINDERS = 24; // 1 day (deadline is short: 48h total)
const MAX_REMINDERS = 2;
const FIRST_REMINDER_DAYS = 1; // J+1 after signup
const SECOND_REMINDER_DAYS = 3; // J+3 (likely after suspension, last chance)

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

  // Find profiles in waiting list (pending verification, not yet verified)
  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select(
      "user_id, email, full_name, created_at, verification_status, verification_deadline, last_verification_reminder_sent_at, verification_reminders_sent"
    )
    .eq("verification_status", "pending_verification")
    .lt("verification_reminders_sent", MAX_REMINDERS);

  if (profErr) {
    console.error("[send-verification-reminder] profiles query error:", profErr);
    return new Response(
      JSON.stringify({ error: profErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let queued = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const p of profiles ?? []) {
    // Verify role super_admin (only owners need verification, not employees)
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", p.user_id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!role) {
      skipped++; skipReasons.not_owner = (skipReasons.not_owner ?? 0) + 1;
      continue;
    }

    if (!p.email) {
      skipped++; skipReasons.no_email = (skipReasons.no_email ?? 0) + 1;
      continue;
    }

    // Cooldown
    if (p.last_verification_reminder_sent_at) {
      const hoursSince =
        (Date.now() - new Date(p.last_verification_reminder_sent_at).getTime()) /
        (1000 * 60 * 60);
      if (hoursSince < MIN_HOURS_BETWEEN_REMINDERS) {
        skipped++; skipReasons.cooldown = (skipReasons.cooldown ?? 0) + 1;
        continue;
      }
    }

    // Auto mode: enforce J+1 / J+3 schedule
    if (mode === "auto") {
      const ageDays = p.created_at
        ? (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const remindersSent = p.verification_reminders_sent ?? 0;
      if (remindersSent === 0 && ageDays < FIRST_REMINDER_DAYS) {
        skipped++; skipReasons.too_recent = (skipReasons.too_recent ?? 0) + 1;
        continue;
      }
      if (remindersSent === 1 && ageDays < SECOND_REMINDER_DAYS) {
        skipped++; skipReasons.too_recent = (skipReasons.too_recent ?? 0) + 1;
        continue;
      }
    }

    // Compute hours left until deadline (if any)
    let hoursLeft: number | null = null;
    if (p.verification_deadline) {
      const diffMs = new Date(p.verification_deadline).getTime() - Date.now();
      hoursLeft = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
    const { error: tokErr } = await admin
      .from("email_unsubscribe_tokens")
      .insert({ token: unsubscribeToken, email: p.email });
    if (tokErr) {
      console.warn("[send-verification-reminder] token insert warn:", tokErr);
    }
    const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe?token=${unsubscribeToken}`;
    const verifyUrl = `${PUBLIC_BASE_URL}/auth`;

    // Render email
    const html = await renderAsync(
      React.createElement(VerificationReminderEmail, {
        recipientName: p.full_name ?? "",
        verifyUrl,
        unsubscribeUrl,
        hoursLeft,
      })
    );

    const hoursLine = hoursLeft !== null && hoursLeft > 0
      ? `\n⚠️ Il vous reste environ ${Math.max(1, Math.round(hoursLeft))}h avant suspension automatique.\n`
      : "";

    const text = `Bonjour ${p.full_name ?? ""},

Votre compte RepairPro est en attente de vérification.
${hoursLine}
Connectez-vous pour valider votre identité (moins de 2 minutes) :
${verifyUrl}

Se désabonner : ${unsubscribeUrl}`;

    const subject = hoursLeft !== null && hoursLeft > 0 && hoursLeft < 24
      ? `⚠️ Dernière chance — Vérifiez votre compte RepairPro`
      : `⏰ Vérifiez votre compte RepairPro`;

    const messageId = crypto.randomUUID();
    const { error: enqErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: p.email,
        from: "RepairPro <noreply@getheavencoin.com>",
        sender_domain: "notify.getheavencoin.com",
        subject,
        html,
        text,
        label: "verification-reminder",
        purpose: "transactional",
        message_id: messageId,
        queued_at: new Date().toISOString(),
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
      },
    });

    if (enqErr) {
      console.error("[send-verification-reminder] enqueue err:", enqErr);
      skipped++; skipReasons.enqueue_error = (skipReasons.enqueue_error ?? 0) + 1;
      continue;
    }

    // Update tracking on profiles
    await admin
      .from("profiles")
      .update({
        last_verification_reminder_sent_at: new Date().toISOString(),
        verification_reminders_sent: (p.verification_reminders_sent ?? 0) + 1,
      })
      .eq("user_id", p.user_id);

    queued++;
  }

  console.log(`[send-verification-reminder] mode=${mode} queued=${queued} skipped=${skipped}`, skipReasons);

  return new Response(
    JSON.stringify({ mode, queued, skipped, reasons: skipReasons }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
