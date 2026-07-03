import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BodySchema = z.object({
  table: z.string().min(1).max(200),
  mode: z.enum(["vacuum_analyze", "analyze"]),
});

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;

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

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!roleData) return jsonResp({ error: "Forbidden" }, 403);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResp({ error: "Invalid input" }, 400);
    }
    const { table, mode } = parsed.data;

    // Split schema.table; default schema to public
    const parts = table.split(".");
    const schema = parts.length > 1 ? parts[0] : "public";
    const tableName = parts.length > 1 ? parts.slice(1).join(".") : parts[0];

    const pg = new PgClient(dbUrl);
    await pg.connect();
    try {
      // Whitelist: confirm the table actually exists in pg_stat_user_tables
      const check = await pg.queryObject<{ relname: string }>(
        `SELECT relname FROM pg_stat_user_tables WHERE schemaname = $1 AND relname = $2 LIMIT 1`,
        [schema, tableName],
      );
      if (check.rows.length === 0) {
        return jsonResp({ error: "Table introuvable" }, 404);
      }

      // Build a safe identifier from the verified names
      const ident = `"${schema.replace(/"/g, '""')}"."${tableName.replace(/"/g, '""')}"`;
      const sql =
        mode === "vacuum_analyze"
          ? `VACUUM (ANALYZE) ${ident}`
          : `ANALYZE ${ident}`;

      await pg.queryArray(sql);

      return jsonResp({
        ok: true,
        table: `${schema}.${tableName}`,
        mode,
        ranAt: new Date().toISOString(),
      });
    } finally {
      await pg.end();
    }
  } catch (e) {
    return jsonResp({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
