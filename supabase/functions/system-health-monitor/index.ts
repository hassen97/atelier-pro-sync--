import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const COOLDOWN_MINUTES = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cronSecret =
      Deno.env.get("HEALTH_CRON_SECRET") ||
      Deno.env.get("HEALTH_MONITOR_SECRET");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── Auth: either a matching cron secret header, or a platform-admin JWT ──
    let isTest = false;
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");

    if (providedSecret && cronSecret && providedSecret === cronSecret) {
      // cron context — allowed
    } else if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonResp({ error: "Unauthorized" }, 401);
      }
      const callerId = claimsData.claims.sub;
      const { data: roleData } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "platform_admin")
        .maybeSingle();
      if (!roleData) return jsonResp({ error: "Forbidden" }, 403);
      // Manual invocation from the dashboard is treated as a forced test.
      const body = await req.json().catch(() => ({}));
      isTest = body?.test === true;
    } else {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    // ── Load settings ──
    const { data: rows } = await admin
      .from("platform_settings")
      .select("key, value");
    const settings: Record<string, string> = {};
    (rows ?? []).forEach((r: any) => (settings[r.key] = r.value));

    const enabled = settings["health_alerts_enabled"] === "true";
    if (!enabled && !isTest) {
      return jsonResp({ ok: true, skipped: "alerts_disabled" });
    }

    const slowThreshold = Number(settings["health_slow_query_threshold_s"] || 5);
    const bloatRatio = Number(settings["health_bloat_ratio_threshold"] || 30);
    const minSizeMb = Number(settings["health_bloat_min_size_mb"] || 50);
    const webhookUrl = (settings["health_alert_webhook_url"] || "").trim();
    const alertEmail =
      (settings["health_alert_email"] || "").trim() ||
      (settings["admin_notify_email"] || "").trim();

    // ── Detect issues ──
    const { data: detected, error: detectErr } = await admin.rpc(
      "detect_health_issues",
      {
        slow_threshold_s: slowThreshold,
        bloat_ratio: bloatRatio,
        min_size_mb: minSizeMb,
      },
    );
    if (detectErr) {
      return jsonResp({ error: detectErr.message }, 500);
    }

    const slowQueries = (detected?.slow_queries ?? []) as any[];
    const bloatedTables = (detected?.bloated_tables ?? []) as any[];
    const hasIssues = slowQueries.length > 0 || bloatedTables.length > 0;

    // Cooldown (skip for explicit tests)
    if (!isTest) {
      const last = settings["health_alert_last_sent_at"];
      if (last) {
        const lastMs = new Date(last).getTime();
        if (
          !isNaN(lastMs) &&
          Date.now() - lastMs < COOLDOWN_MINUTES * 60 * 1000
        ) {
          return jsonResp({
            ok: true,
            skipped: "cooldown",
            hasIssues,
          });
        }
      }
    }

    if (!hasIssues && !isTest) {
      return jsonResp({ ok: true, hasIssues: false });
    }

    // ── Build alert payload ──
    const summaryLines: string[] = [];
    if (slowQueries.length > 0) {
      summaryLines.push(
        `⚠️ ${slowQueries.length} requête(s) lente(s) (> ${slowThreshold}s)`,
      );
      slowQueries.slice(0, 5).forEach((q) =>
        summaryLines.push(`   • PID ${q.pid} — ${q.duration_seconds}s`),
      );
    }
    if (bloatedTables.length > 0) {
      summaryLines.push(
        `⚠️ ${bloatedTables.length} table(s) avec bloat élevé (> ${bloatRatio}%)`,
      );
      bloatedTables.slice(0, 5).forEach((t) =>
        summaryLines.push(
          `   • ${t.table_name} — ${t.dead_ratio}% mortes, ${t.total_size_mb} MB`,
        ),
      );
    }
    if (summaryLines.length === 0) {
      summaryLines.push("✅ Aucun problème détecté (test).");
    }
    const summaryText = summaryLines.join("\n");

    const result: Record<string, unknown> = {
      ok: true,
      isTest,
      hasIssues,
      slowCount: slowQueries.length,
      bloatCount: bloatedTables.length,
      webhookSent: false,
      emailQueued: false,
    };

    // ── Webhook ──
    if (webhookUrl) {
      try {
        const wr = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "RepairPro · Santé Système",
            test: isTest,
            text: summaryText,
            slow_queries: slowQueries,
            bloated_tables: bloatedTables,
            detected_at: new Date().toISOString(),
          }),
        });
        result.webhookSent = wr.ok;
        if (!wr.ok) result.webhookStatus = wr.status;
      } catch (e) {
        result.webhookError = String((e as Error)?.message ?? e);
      }
    }

    // ── Email via existing queue ──
    if (alertEmail) {
      try {
        const html = `
          <h2>Alerte Santé Système${isTest ? " (test)" : ""}</h2>
          <pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${summaryText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")}</pre>
          <p style="color:#64748b;font-size:12px;">RepairPro — surveillance automatique de la base de données.</p>
        `;
        const { error: enqErr } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: alertEmail,
            subject: `🚨 Alerte Santé Système RepairPro${isTest ? " (test)" : ""}`,
            html,
            template_name: "system_health_alert",
            message_id: `health-alert-${Date.now()}`,
          },
        });
        result.emailQueued = !enqErr;
        if (enqErr) result.emailError = enqErr.message;
      } catch (e) {
        result.emailError = String((e as Error)?.message ?? e);
      }
    }

    // ── Update dedup timestamp on a real (non-test) send with issues ──
    if (!isTest && hasIssues) {
      await admin
        .from("platform_settings")
        .update({ value: new Date().toISOString() })
        .eq("key", "health_alert_last_sent_at");
    }

    return jsonResp(result);
  } catch (e) {
    return jsonResp({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
