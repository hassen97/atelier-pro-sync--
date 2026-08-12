// TEMPORARY admin-only bridge: copies the Test database into the Live database.
// Delete this function (and the /db-restore page) once the restore is done.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = ["shop-logos", "repair-photos", "payment-proofs", "supplier-proofs"];
const PAYLOAD_BUCKET = "db-restore";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;
const RESTORE_SECRET = Deno.env.get("RESTORE_SECRET")!;

async function requireAdmin(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.claims.sub)
    .eq("role", "platform_admin")
    .maybeSingle();
  return role ? (data.claims.sub as string) : null;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function publicTables(pg: PgClient): Promise<string[]> {
  const r = await pg.queryObject<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  return r.rows.map((x) => x.table_name);
}

async function insertableColumns(pg: PgClient, schema: string, table: string): Promise<string[]> {
  const r = await pg.queryObject<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
       AND is_generated <> 'ALWAYS'
       AND (identity_generation IS NULL OR identity_generation <> 'ALWAYS')
     ORDER BY ordinal_position`,
    [schema, table],
  );
  return r.rows.map((x) => x.column_name);
}

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

// ── EXPORT (run in Test) ───────────────────────────────────────
async function doExport() {
  const steps: string[] = [];
  let stage = "connect";
  const pg = new PgClient(DB_URL);
  try {
    await pg.connect();
    steps.push("connected to database");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    stage = "list tables";
    const tables = await publicTables(pg);
    steps.push(`found ${tables.length} public tables`);
    const payload: Record<string, unknown> = {
      generated_at: new Date().toISOString(),
      source: SUPABASE_URL,
    };
    const tableData: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    for (const t of tables) {
      stage = `dump public.${t}`;
      const r = await pg.queryObject<{ data: unknown[] }>(
        `SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) AS data FROM public.${q(t)} x`,
      );
      const rows = (r.rows[0]?.data ?? []) as unknown[];
      tableData[t] = rows;
      counts[t] = rows.length;
    }
    steps.push("dumped all public tables");
    payload.tables = tableData;


    for (const [schema, name] of [["auth", "users"], ["auth", "identities"]]) {
      stage = `dump ${schema}.${name}`;
      const cols = await insertableColumns(pg, schema, name);
      const sel = cols.map(q).join(", ");
      const r = await pg.queryObject<{ data: unknown[] }>(
        `SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) AS data
         FROM (SELECT ${sel} FROM ${q(schema)}.${q(name)}) x`,
      );
      const rows = (r.rows[0]?.data ?? []) as unknown[];
      payload[`auth_${name}`] = { columns: cols, rows };
      counts[`auth.${name}`] = rows.length;
      steps.push(`dumped ${schema}.${name} (${rows.length} rows)`);
    }

    // Storage manifest with signed URLs (7 days)
    const files: { bucket: string; path: string; url: string; contentType: string }[] = [];
    for (const bucket of BUCKETS) {
      stage = `list storage bucket ${bucket}`;
      const paths = await listBucket(admin, bucket, "");
      for (const p of paths) {
        const { data: signed } = await admin.storage
          .from(bucket)
          .createSignedUrl(p.path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) {
          files.push({
            bucket,
            path: p.path,
            url: signed.signedUrl,
            contentType: p.contentType || "application/octet-stream",
          });
        }
      }
      steps.push(`bucket ${bucket}: ${paths.length} file(s)`);
    }
    payload.files = files;

    stage = "compress payload";
    const raw = new TextEncoder().encode(JSON.stringify(payload));
    const gz = await gzip(raw);
    steps.push(`compressed payload (${gz.byteLength} bytes)`);
    stage = "upload payload";
    const key = `payload-${Date.now()}.json.gz`;
    const up = await admin.storage.from(PAYLOAD_BUCKET).upload(key, gz, {
      contentType: "application/gzip",
      upsert: true,
    });
    if (up.error) throw up.error;
    stage = "sign payload url";
    const { data: signed, error: sErr } = await admin.storage
      .from(PAYLOAD_BUCKET)
      .createSignedUrl(key, 60 * 60 * 24 * 3);
    if (sErr) throw sErr;
    steps.push("payload uploaded and signed");

    return json({
      ok: true,
      stage: "done",
      steps,
      payloadUrl: signed?.signedUrl,
      key,
      sizeBytes: gz.byteLength,
      rawBytes: raw.byteLength,
      fileCount: files.length,
      counts,
    });
  } catch (e) {
    return json({ error: `Export failed at "${stage}": ${String((e as Error)?.message ?? e)}`, stage, steps }, 500);
  } finally {
    await pg.end().catch(() => {});
  }
}


async function listBucket(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<{ path: string; contentType?: string }[]> {
  const out: { path: string; contentType?: string }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        out.push(...(await listBucket(admin, bucket, full)));
      } else {
        out.push({ path: full, contentType: (item.metadata as any)?.mimetype });
      }
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return out;
}

// ── IMPORT (run in Live) ───────────────────────────────────────
async function doImport(payloadUrl: string, skipFiles: boolean) {
  const steps: string[] = [];
  let stage = "fetch payload";
  const res = await fetch(payloadUrl).catch((e) => {
    throw new Error(`payload fetch error: ${String(e)}`);
  });
  if (!res.ok) return json({ error: `Payload fetch failed (${res.status})`, stage, steps }, 400);
  stage = "decompress payload";
  let payload: any;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(await gunzip(new Uint8Array(await res.arrayBuffer()))),
    );
  } catch (e) {
    return json({ error: `Payload decode failed: ${String((e as Error)?.message ?? e)}`, stage, steps }, 400);
  }
  steps.push(`payload loaded (from ${payload.source}, generated ${payload.generated_at})`);

  const pg = new PgClient(DB_URL);
  stage = "connect";
  await pg.connect();
  steps.push("connected to database");
  const report: Record<string, unknown> = { source: payload.source, generatedAt: payload.generated_at };
  const inserted: Record<string, number> = {};
  try {
    stage = "list tables";
    const localTables = await publicTables(pg);
    steps.push(`target has ${localTables.length} public tables`);
    await pg.queryArray("BEGIN");
    await pg.queryArray("SET LOCAL session_replication_role = 'replica'");

    // Wipe
    stage = "truncate public tables";
    const truncList = localTables.map((t) => `public.${q(t)}`).join(", ");
    await pg.queryArray(`TRUNCATE TABLE ${truncList} CASCADE`);
    stage = "clear auth tables";
    await pg.queryArray("DELETE FROM auth.identities");
    await pg.queryArray("DELETE FROM auth.sessions");
    await pg.queryArray("DELETE FROM auth.refresh_tokens");
    await pg.queryArray("DELETE FROM auth.users");
    steps.push("wiped existing rows (public + auth)");

    // Auth first
    for (const name of ["users", "identities"]) {
      const src = payload[`auth_${name}`];
      if (!src?.rows?.length) continue;
      stage = `insert auth.${name}`;
      const localCols = await insertableColumns(pg, "auth", name);
      const cols = localCols.filter((c) => src.columns.includes(c));
      inserted[`auth.${name}`] = await insertRows(pg, "auth", name, cols, src.rows);
      steps.push(`inserted auth.${name}: ${inserted[`auth.${name}`]} rows`);
    }

    // Public tables
    for (const t of localTables) {
      const rows = payload.tables?.[t];
      if (!rows?.length) {
        inserted[t] = 0;
        continue;
      }
      stage = `insert public.${t}`;
      const cols = await insertableColumns(pg, "public", t);
      inserted[t] = await insertRows(pg, "public", t, cols, rows);
    }
    steps.push("inserted all public table rows");

    // Resync sequences
    stage = "resync sequences";
    await pg.queryArray(`
      DO $$
      DECLARE r record; mx bigint;
      BEGIN
        FOR r IN
          SELECT s.relname AS seq, n.nspname AS sch, t.relname AS tbl, a.attname AS col
          FROM pg_class s
          JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype IN ('a','i')
          JOIN pg_class t ON t.oid = d.refobjid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
          WHERE s.relkind = 'S' AND n.nspname = 'public'
        LOOP
          EXECUTE format('SELECT COALESCE(MAX(%I),0) FROM %I.%I', r.col, r.sch, r.tbl) INTO mx;
          EXECUTE format('SELECT setval(%L, GREATEST(%s,1))', r.sch || '.' || r.seq, mx);
        END LOOP;
      END $$;
    `);

    stage = "commit";
    await pg.queryArray("COMMIT");
    steps.push("transaction committed");
    report.inserted = inserted;
  } catch (e) {
    await pg.queryArray("ROLLBACK").catch(() => {});
    await pg.end().catch(() => {});
    return json(
      {
        error: `Import failed at "${stage}": ${String((e as Error)?.message ?? e)}`,
        stage,
        steps,
        inserted,
      },
      500,
    );
  }
  await pg.end().catch(() => {});

  // Storage copy (outside the transaction)
  if (!skipFiles && Array.isArray(payload.files)) {
    stage = "copy storage files";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let copied = 0;
    const failures: string[] = [];
    for (const f of payload.files) {
      try {
        const r = await fetch(f.url);
        if (!r.ok) throw new Error(`fetch ${r.status}`);
        const body = new Uint8Array(await r.arrayBuffer());
        const { error } = await admin.storage.from(f.bucket).upload(f.path, body, {
          contentType: f.contentType || "application/octet-stream",
          upsert: true,
        });
        if (error) throw error;
        copied++;
      } catch (e) {
        failures.push(`${f.bucket}/${f.path}: ${String((e as Error)?.message ?? e)}`);
      }
    }
    report.filesCopied = copied;
    report.fileFailures = failures;
    steps.push(`storage: ${copied} copied, ${failures.length} failed`);
  } else {
    steps.push("storage copy skipped");
  }

  return json({ ok: true, stage: "done", steps, ...report });
}


async function insertRows(
  pg: PgClient,
  schema: string,
  table: string,
  cols: string[],
  rows: unknown[],
): Promise<number> {
  const colList = cols.map(q).join(", ");
  const selList = cols.map(q).join(", ");
  const CHUNK = 250;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await pg.queryArray(
      `INSERT INTO ${q(schema)}.${q(table)} (${colList})
       SELECT ${selList} FROM json_populate_recordset(NULL::${q(schema)}.${q(table)}, $1::json)`,
      [JSON.stringify(chunk)],
    );
    total += chunk.length;
  }
  return total;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const callerId = await requireAdmin(req);
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({} as any));
    if (!RESTORE_SECRET) {
      return json({ error: "RESTORE_SECRET is not configured in this backend", env: SUPABASE_URL }, 403);
    }
    if (body.secret !== RESTORE_SECRET) {
      return json({ error: "Invalid restore secret for this backend", env: SUPABASE_URL }, 403);
    }

    if (body.action === "export") return await doExport();

    if (body.action === "import") {
      if (body.confirm !== "REPLACE_LIVE") {
        return json({ error: "Missing confirmation" }, 400);
      }
      if (typeof body.payloadUrl !== "string" || !body.payloadUrl.startsWith("https://")) {
        return json({ error: "Invalid payloadUrl" }, 400);
      }
      return await doImport(body.payloadUrl, body.skipFiles === true);
    }

    if (body.action === "counts") {
      const pg = new PgClient(DB_URL);
      await pg.connect();
      try {
        const tables = await publicTables(pg);
        const counts: Record<string, number> = {};
        for (const t of tables) {
          const r = await pg.queryObject<{ c: string }>(`SELECT count(*)::text AS c FROM public.${q(t)}`);
          counts[t] = Number(r.rows[0]?.c ?? 0);
        }
        const u = await pg.queryObject<{ c: string }>(`SELECT count(*)::text AS c FROM auth.users`);
        counts["auth.users"] = Number(u.rows[0]?.c ?? 0);
        return json({ ok: true, env: SUPABASE_URL, counts });
      } finally {
        await pg.end();
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
