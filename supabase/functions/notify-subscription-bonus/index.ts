// supabase/functions/notify-subscription-bonus/index.ts
// God Mode: notify a shop owner of a subscription bonus across 3 channels:
//   1. In-app popup (targeted platform_announcements)
//   2. Web push (send-web-push, targeted to the user)
//   3. Email (transactional_emails queue)
//
// POST body: { userId: string, months: number, newExpiresAt: string | null, customMessage?: string }
// Caller must be a platform_admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { SubscriptionBonusEmail } from "../_shared/email-templates/subscription-bonus.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // --- Auth: must be platform_admin ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);
  const token = authHeader.replace("Bearer ", "");

  let callerId: string | null = null;
  if (token !== serviceKey) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    callerId = user.id;
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — platform admin required" }, 403);
  }

  // --- Parse & validate input ---
  let payload: {
    userId?: string;
    months?: number;
    newExpiresAt?: string | null;
    customMessage?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const userId = (payload.userId ?? "").trim();
  const months = Number(payload.months ?? 0);
  const newExpiresAt = payload.newExpiresAt ?? null;
  const customMessage = (payload.customMessage ?? "").trim() || undefined;

  if (!userId) return json({ error: "userId is required" }, 400);
  if (!Number.isFinite(months) || months === 0) {
    return json({ error: "months must be a non-zero number" }, 400);
  }

  const isRemoval = months < 0;
  const abs = Math.abs(months);
  const monthLabel = `${abs} mois`;

  const newExpiryLabel = newExpiresAt
    ? new Date(newExpiresAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Look up shop name + owner email
  let shopName: string | undefined;
  let ownerEmail: string | undefined;
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile) {
      ownerEmail = profile.email ?? undefined;
    }
    const { data: shop } = await admin
      .from("shop_settings")
      .select("shop_name")
      .eq("user_id", userId)
      .maybeSingle();
    shopName = shop?.shop_name ?? profile?.full_name ?? undefined;
  } catch (_) {
    // non-fatal
  }

  const title = isRemoval
    ? "Abonnement mis à jour"
    : "🎁 Bonus d'abonnement offert";
  const bodyMsg = isRemoval
    ? `La durée de votre abonnement a été ajustée de ${monthLabel}.${
        newExpiryLabel ? ` Valable jusqu'au ${newExpiryLabel}.` : ""
      }`
    : `Notre équipe vous offre ${monthLabel} sur votre abonnement !${
        newExpiryLabel ? ` Valable jusqu'au ${newExpiryLabel}.` : ""
      }`;

  const channels = { inApp: false, push: 0, email: false };
  const errors: Record<string, string> = {};

  // --- 1. In-app popup (targeted announcement) ---
  try {
    const { error } = await admin.from("platform_announcements").insert({
      title,
      new_features: customMessage
        ? `${bodyMsg}\n\n${customMessage}`
        : bodyMsg,
      changes_fixes: null,
      created_by: callerId ?? userId,
      target_user_id: userId,
    });
    if (error) throw error;
    channels.inApp = true;
  } catch (e) {
    errors.inApp = (e as Error).message;
  }

  // --- 2. Web push (targeted) ---
  try {
    const { data, error } = await admin.functions.invoke("send-web-push", {
      body: {
        user_ids: [userId],
        title,
        body: bodyMsg,
        url: "/settings?tab=subscription",
        tag: "subscription-bonus",
      },
      headers: { Authorization: `Bearer ${serviceKey}` },
    });
    if (error) throw error;
    channels.push = (data as { sent?: number })?.sent ?? 0;
  } catch (e) {
    errors.push = (e as Error).message;
  }

  // --- 3. Email ---
  if (ownerEmail) {
    try {
      const html = await renderAsync(
        React.createElement(SubscriptionBonusEmail, {
          shopName,
          months,
          newExpiryLabel,
          customMessage,
        }),
      );
      const text = `${bodyMsg}${customMessage ? `\n\n${customMessage}` : ""}\n\nMerci de votre confiance — l'équipe RepairPro.`;
      const messageId = crypto.randomUUID();
      const { error } = await admin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: ownerEmail,
          from: "RepairPro <noreply@getheavencoin.com>",
          sender_domain: "notify.getheavencoin.com",
          subject: isRemoval
            ? "Mise à jour de votre abonnement RepairPro"
            : `🎁 ${monthLabel} offert(s) sur votre abonnement RepairPro`,
          html,
          text,
          label: "subscription-bonus",
          purpose: "transactional",
          message_id: messageId,
          queued_at: new Date().toISOString(),
          idempotency_key: messageId,
        },
      });
      if (error) throw error;
      channels.email = true;
    } catch (e) {
      errors.email = (e as Error).message;
    }
  } else {
    errors.email = "no owner email";
  }

  return json({ ok: true, channels, errors });
});
