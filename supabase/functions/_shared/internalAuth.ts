import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Authorizes calls to internal/cron-only functions. Allowed callers:
 *  - server-to-server calls carrying the service role key
 *  - scheduled jobs sending a valid `x-cron-secret`
 *  - signed-in platform admins
 */
export async function isInternalCaller(req: Request): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  if (cronSecret) {
    const valid = [
      Deno.env.get("EXPIRY_CRON_SECRET"),
      Deno.env.get("HEALTH_CRON_SECRET"),
      Deno.env.get("CRON_SECRET"),
    ].filter((s): s is string => !!s && s.length >= 16);
    if (valid.includes(cronSecret)) return true;
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  if (token === serviceKey) return true;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return false;
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();
  return !!role;
}
