import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

async function usernameExistsGlobally(
  adminClient: ReturnType<typeof createClient>,
  username: string
) {
  const normalizedUsername = normalizeUsername(username);
  const employeeEmail = `${normalizedUsername}@repairpro.local`;

  const { data: profileMatch, error: profileError } = await adminClient
    .from("profiles")
    .select("user_id")
    .eq("username", normalizedUsername)
    .limit(1);

  if (profileError) throw profileError;
  if ((profileMatch ?? []).length > 0) return true;

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      per_page: perPage,
    });

    if (error) throw error;

    const users = data?.users ?? [];
    const authMatch = users.some((user) => {
      const email = user.email?.trim().toLowerCase();
      const metadataUsername =
        typeof user.user_metadata?.username === "string"
          ? normalizeUsername(user.user_metadata.username)
          : null;

      return email === employeeEmail || metadataUsername === normalizedUsername;
    });

    if (authMatch) return true;
    if (users.length < perPage) break;

    page += 1;
    if (page > 50) break;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: only signed-in users may probe username/phone availability. ──
    // This prevents anonymous enumeration of registered accounts.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { username, phone } = await req.json().catch(() => ({}));

    if (!username && !phone) {
      return new Response(JSON.stringify({ error: "username or phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let exists = false;


    if (username) {
      const normalizedUsername = normalizeUsername(username);

      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        return new Response(JSON.stringify({ exists: false, valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      exists = await usernameExistsGlobally(adminClient, normalizedUsername);
    } else if (phone) {
      const trimmedPhone = String(phone).trim();

      if (trimmedPhone.length < 5) {
        return new Response(JSON.stringify({ exists: false, valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("profiles")
        .select("username")
        .eq("phone", trimmedPhone)
        .limit(1);

      if (error) throw error;
      exists = (data ?? []).length > 0;
    }

    return new Response(JSON.stringify({ exists, valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-username error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
