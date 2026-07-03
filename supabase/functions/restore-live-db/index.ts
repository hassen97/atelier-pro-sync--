import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface FileEntry {
  bucket: string;
  path: string;
  url: string;
  content_type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: {
    secret?: string;
    sqlUrl?: string;
    files?: FileEntry[];
    mode?: "all" | "db" | "storage";
    dryRun?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Authorization: allow either a valid RESTORE_SECRET, or a platform_admin JWT.
  const supabaseUrlEnv = Deno.env.get("SUPABASE_URL");
  const serviceKeyEnv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expected = Deno.env.get("RESTORE_SECRET");

  let authorized = false;
  if (expected && body.secret && body.secret === expected) {
    authorized = true;
  } else {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && supabaseUrlEnv && serviceKeyEnv) {
      const token = authHeader.replace("Bearer ", "");
      const admin = createClient(supabaseUrlEnv, serviceKeyEnv);
      const { data: userData } = await admin.auth.getUser(token);
      const callerId = userData?.user?.id;
      if (callerId) {
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "platform_admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
  }
  if (!authorized) {
    return json({ error: "Unauthorized" }, 401);
  }

  const mode = body.mode ?? "all";
  const dryRun = body.dryRun === true;
  const summary: Record<string, unknown> = { mode, dryRun };

  // ---- Phase A: database restore ----
  if (mode === "all" || mode === "db") {
    if (!body.sqlUrl) return json({ error: "sqlUrl required" }, 400);

    // Fetch + decompress the payload
    let statements: string[];
    try {
      const res = await fetch(body.sqlUrl);
      if (!res.ok || !res.body) {
        return json({ error: `Payload fetch failed: ${res.status}` }, 502);
      }
      const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
      const text = await new Response(stream).text();
      const parsed = JSON.parse(text);
      statements = parsed.statements;
      summary.statement_count = statements.length;
    } catch (e) {
      return json({ error: `Payload load error: ${String((e as Error)?.message ?? e)}` }, 500);
    }

    // Supabase-managed schemas can't be restored via raw SQL: the DB role is
    // NOT the owner (e.g. auth sequences like refresh_tokens_id_seq), so a
    // TRUNCATE/INSERT against them fails with "must be owner of sequence ...".
    // Only public data is restored.
    const RESERVED_SCHEMA =
      /\b(?:auth|storage|vault|realtime|supabase_functions|supabase_migrations|extensions|graphql|graphql_public|pgsodium|cron|net|pgbouncer)\./i;
    const isReservedTable = (t: string) => RESERVED_SCHEMA.test(t.trim());
    const runnable: string[] = [];
    let skipped = 0;
    for (const s of statements) {
      const truncate = s.match(/^\s*TRUNCATE\s+(?:TABLE\s+)?([\s\S]*?)(\s+(?:RESTART|CONTINUE|CASCADE|RESTRICT)[\s\S]*)?;?\s*$/i);
      if (truncate) {
        // Keep only the public tables in the TRUNCATE list; drop reserved ones
        // so public tables are still cleared before inserts.
        const kept = truncate[1].split(",").map((t) => t.trim()).filter((t) => t && !isReservedTable(t));
        if (kept.length === 0) { skipped++; continue; }
        runnable.push(`TRUNCATE TABLE ${kept.join(", ")}${truncate[2] ?? " RESTART IDENTITY CASCADE"};`);
        continue;
      }
      if (RESERVED_SCHEMA.test(s)) { skipped++; continue; }
      runnable.push(s);
    }
    summary.statements_skipped = skipped;

    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) return json({ error: "SUPABASE_DB_URL missing" }, 500);

    const pg = new PgClient(dbUrl);
    await pg.connect();
    let executed = 0;
    try {
      await pg.queryArray("BEGIN");
      for (let i = 0; i < runnable.length; i++) {
        try {
          await pg.queryArray(runnable[i]);
          executed++;
        } catch (e) {
          await pg.queryArray("ROLLBACK").catch(() => {});
          return json(
            {
              error: "SQL execution failed — transaction rolled back, live DB unchanged",
              failed_statement_index: i,
              statement_preview: runnable[i].slice(0, 300),
              detail: String((e as Error)?.message ?? e),
            },
            500,
          );
        }
      }
      if (dryRun) {
        await pg.queryArray("ROLLBACK");
        summary.db = { ok: true, statements_executed: executed, committed: false, note: "dry run rolled back — DB unchanged" };
      } else {
        await pg.queryArray("COMMIT");
        summary.db = { ok: true, statements_executed: executed, committed: true };
      }
    } catch (e) {
      await pg.queryArray("ROLLBACK").catch(() => {});
      return json({ error: `Transaction error: ${String((e as Error)?.message ?? e)}` }, 500);
    } finally {
      await pg.end();
    }
  }

  // ---- Phase B: storage restore ----
  if ((mode === "all" || mode === "storage") && body.files?.length) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Storage credentials missing" }, 500);
    }

    const results: { path: string; ok: boolean; status?: number; error?: string }[] = [];
    for (const f of body.files) {
      try {
        const src = await fetch(f.url);
        if (!src.ok) {
          results.push({ path: `${f.bucket}/${f.path}`, ok: false, status: src.status, error: "source fetch failed" });
          continue;
        }
        const bytes = new Uint8Array(await src.arrayBuffer());
        const up = await fetch(
          `${supabaseUrl}/storage/v1/object/${f.bucket}/${f.path}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": f.content_type || "application/octet-stream",
              "x-upsert": "true",
            },
            body: bytes,
          },
        );
        const okUp = up.ok;
        results.push({
          path: `${f.bucket}/${f.path}`,
          ok: okUp,
          status: up.status,
          error: okUp ? undefined : (await up.text()).slice(0, 200),
        });
      } catch (e) {
        results.push({ path: `${f.bucket}/${f.path}`, ok: false, error: String((e as Error)?.message ?? e) });
      }
    }
    summary.storage = {
      total: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    };
  }

  return json({ ok: true, ...summary });
});
