import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ENC_PREFIX = "enc:v1:";

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("VAULT_ENCRYPTION_KEY");
  if (!secret) throw new Error("VAULT_ENCRYPTION_KEY not configured");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return ENC_PREFIX + toBase64(combined);
}

async function decrypt(stored: string, key: CryptoKey): Promise<string> {
  // Legacy plaintext (pre-encryption rows) is returned as-is.
  if (!stored || !stored.startsWith(ENC_PREFIX)) return stored ?? "";
  try {
    const combined = fromBase64(stored.slice(ENC_PREFIX.length));
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (_e) {
    return "";
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User-scoped client: all DB access flows through RLS so the caller can
    // only ever touch their own (or their team owner's) vault rows.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const key = await getKey();
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "list") {
      let query = userClient
        .from("customer_vault")
        .select(
          "id, user_id, customer_id, account_type, email_id, password, created_at, updated_at, customers:customer_id(id, name, phone)",
        )
        .order("created_at", { ascending: false });
      if (body.customer_id) query = query.eq("customer_id", body.customer_id);
      const { data, error } = await query;
      if (error) throw error;

      const rows = data ?? [];
      const decrypted = await Promise.all(
        rows.map(async (r: any) => ({
          ...r,
          password: await decrypt(r.password, key),
        })),
      );
      return json({ data: decrypted });
    }

    if (action === "create") {
      const { customer_id, account_type, email_id, password } = body;
      if (!customer_id || !account_type || !email_id || typeof password !== "string") {
        return json({ error: "Invalid input" }, 400);
      }
      // Determine the effective owner (self, or team owner if the caller is a member).
      const { data: ownerId } = await userClient.rpc("get_team_owner_id", {
        _member_id: callerId,
      });
      const effectiveUserId = ownerId ?? callerId;

      const { data, error } = await userClient
        .from("customer_vault")
        .insert({
          user_id: effectiveUserId,
          customer_id,
          account_type,
          email_id,
          password: await encrypt(password, key),
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ data });
    }

    if (action === "update") {
      const { id, customer_id, account_type, email_id, password } = body;
      if (!id) return json({ error: "id required" }, 400);
      const updates: Record<string, unknown> = {};
      if (customer_id !== undefined) updates.customer_id = customer_id;
      if (account_type !== undefined) updates.account_type = account_type;
      if (email_id !== undefined) updates.email_id = email_id;
      if (typeof password === "string") updates.password = await encrypt(password, key);

      const { data, error } = await userClient
        .from("customer_vault")
        .update(updates)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      return json({ data });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await userClient.from("customer_vault").delete().eq("id", id);
      if (error) throw error;
      return json({ data: { id } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("customer-vault error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
