// supabase/functions/send-web-push/index.ts
// Sends Web Push notifications via VAPID to subscribed browsers.
//
// Routes:
//   GET  /send-web-push?action=public-key  -> returns { publicKey }
//   POST /send-web-push                    -> sends push to subscribers
//
// POST body:
//   {
//     test?: boolean,                  // if true, sends to current caller only
//     user_ids?: string[],             // target specific users (admin only)
//     to_all_admins?: boolean,         // target all platform_admins
//     title: string,
//     body: string,
//     url?: string,
//     tag?: string
//   }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushPayload {
  test?: boolean;
  user_ids?: string[];
  to_all_admins?: boolean;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Public endpoint: expose the VAPID public key so browsers can subscribe
  if (req.method === "GET" && url.searchParams.get("action") === "public-key") {
    return new Response(
      JSON.stringify({ publicKey: VAPID_PUBLIC }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json().catch(() => ({}))) as PushPayload;

    if (!body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Identify caller (used for test mode and admin-only fan-out)
    let callerId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      callerId = data.user?.id ?? null;
    }

    // Resolve target user_ids
    let targetUserIds: string[] = [];

    if (body.test === true) {
      if (!callerId) {
        return new Response(
          JSON.stringify({ error: "Authentication required for test push" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserIds = [callerId];
    } else if (body.to_all_admins) {
      const { data: admins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "platform_admin");
      targetUserIds = (admins ?? []).map((r: any) => r.user_id);
    } else if (body.user_ids?.length) {
      targetUserIds = body.user_ids;
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: "No targets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscriptions
    const { data: subs, error: subsError } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", targetUserIds);

    if (subsError) {
      console.error("[send-web-push] sub fetch error:", subsError);
      return new Response(
        JSON.stringify({ error: subsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriptions = subs ?? [];
    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          sent: 0,
          message: "No push subscriptions registered for the target users",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url ?? "/admin",
      tag: body.tag ?? "repairpro",
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
    });

    let sent = 0;
    let failed = 0;
    const deadIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (s: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          const status = err?.statusCode;
          console.warn(`[send-web-push] send failed (${status}):`, err?.body || err?.message);
          // 404 / 410 = subscription gone; clean up
          if (status === 404 || status === 410) {
            deadIds.push(s.id);
          }
        }
      })
    );

    if (deadIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", deadIds);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, failed, cleaned: deadIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-web-push] fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
