import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, type EmailTemplateRow } from "../_shared/notification-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupPayload {
  username?: string;
  full_name?: string;
  email?: string | null;
  phone?: string;
  country?: string;
  test?: boolean;
}

// Escape user-supplied values before interpolating into HTML email
const esc = (v: unknown): string =>
  String(v ?? "—")
    .slice(0, 200)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require authentication: signup calls carry the freshly-created user's JWT,
    // admin test calls carry the admin's JWT, and internal calls use the service key.
    const authHeader = req.headers.get("Authorization") ?? "";
    let authed = authHeader === `Bearer ${serviceKey}`;
    if (!authed && authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      authed = !!data.user;
    }
    if (!authed) {
      return new Response(
        JSON.stringify({ ok: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as SignupPayload;
    const isTest = body.test === true;
    const username = isTest ? (body.username ?? "test_user") : body.username;
    const full_name = isTest ? (body.full_name ?? "Test d'alerte") : body.full_name;
    const email = isTest ? (body.email ?? "test@example.com") : body.email;
    const phone = isTest ? (body.phone ?? "+216 00 000 000") : body.phone;
    const country = isTest ? (body.country ?? "TN") : body.country;

    const admin = createClient(supabaseUrl, serviceKey);

    // Try to find the freshly-created user_id by username
    let userId: string | null = null;
    if (username) {
      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      userId = profile?.user_id ?? null;
    }

    // Insert event row (drives realtime browser notifications)
    const { error: insertError } = await admin
      .from("admin_signup_events")
      .insert({
        user_id: userId,
        username: username ?? null,
        full_name: full_name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        country: country ?? null,
      });

    if (insertError) {
      console.error("[notify-admin-signup] insert error:", insertError);
    }

    // Read settings
    const { data: settings } = await admin
      .from("platform_settings")
      .select("key,value")
      .in("key", ["admin_notify_email", "admin_notify_email_enabled"]);

    const settingsMap: Record<string, string | null> = {};
    (settings ?? []).forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    const emailEnabled = settingsMap["admin_notify_email_enabled"] === "true";
    const adminEmail = settingsMap["admin_notify_email"]?.trim();

    let emailQueued = false;
    if (emailEnabled && adminEmail) {
      // Load the editable "signup_admin" template.
      const { data: tplRow } = await admin
        .from("email_templates")
        .select("*")
        .eq("template_key", "signup_admin")
        .maybeSingle();
      const tpl = tplRow as EmailTemplateRow | null;

      if (!tpl || !tpl.is_enabled) {
        console.log("[notify-admin-signup] signup_admin template missing/disabled — skipping email");
      } else {
        const shopUrl = userId
          ? "https://www.getheavencoin.com/admin"
          : "https://www.getheavencoin.com/admin";
        const rendered = renderEmail(tpl, {
          full_name,
          username,
          email,
          phone,
          country,
          shop_url: shopUrl,
        });
        const subject = isTest ? `🧪 [TEST] ${rendered.subject}` : rendered.subject;
        const html = rendered.html;
        const text = [
          isTest ? "E-mail de test RepairPro" : "Nouvelle inscription RepairPro",
          "",
          `Nom complet: ${full_name ?? "—"}`,
          `Username: @${username ?? "—"}`,
          `Email: ${email ?? "—"}`,
          `Téléphone: ${phone ?? "—"}`,
          `Pays: ${country ?? "—"}`,
        ].join("\n");

      try {
        const messageId = crypto.randomUUID();
        const label = isTest ? "admin-signup-test" : "admin-signup-alert";

        // Generate + persist an unsubscribe token (required by Lovable email API for transactional)
        const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
        const { error: tokenError } = await admin
          .from("email_unsubscribe_tokens")
          .insert({ token: unsubscribeToken, email: adminEmail });
        if (tokenError) {
          console.error("[notify-admin-signup] unsubscribe token insert error:", tokenError);
        }

        const { error: enqueueError } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: adminEmail,
            from: "RepairPro <noreply@getheavencoin.com>",
            sender_domain: "notify.getheavencoin.com",
            subject,
            html,
            text,
            label,
            purpose: "transactional",
            message_id: messageId,
            queued_at: new Date().toISOString(),
            idempotency_key: messageId,
            unsubscribe_token: unsubscribeToken,
          },
        });
        if (enqueueError) {
          console.error("[notify-admin-signup] enqueue rpc error:", enqueueError);
        } else {
          emailQueued = true;
        }
      } catch (e) {
        console.error("[notify-admin-signup] enqueue email error:", e);
      }
      }
    }

    // Fan-out: send Web Push to all platform admins (background-capable).
    // Skip for test calls — the client invokes send-web-push directly for tests
    // to also exercise the test=true path.
    let pushSent = 0;
    if (!isTest) {
      try {
        const pushUrl = `${supabaseUrl}/functions/v1/send-web-push`;
        const pushRes = await fetch(pushUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            to_all_admins: true,
            title: "🔔 Nouvelle inscription",
            body: `${full_name ?? username ?? "Nouveau compte"} vient de s'inscrire`,
            url: "/admin",
            tag: "signup-new",
          }),
        });
        if (pushRes.ok) {
          const pushJson = await pushRes.json().catch(() => ({}));
          pushSent = pushJson?.sent ?? 0;
        } else {
          console.warn("[notify-admin-signup] push fanout failed:", pushRes.status);
        }
      } catch (e) {
        console.warn("[notify-admin-signup] push fanout error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        test: isTest,
        emailQueued,
        emailRecipient: emailQueued ? adminEmail : null,
        pushSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("[notify-admin-signup] fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // never block signup
      }
    );
  }
});
