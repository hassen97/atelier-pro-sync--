import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@repairpro.local";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const password = Deno.env.get("DEMO_ACCOUNT_PASSWORD")!;

    // Ensure the demo account exists and is seeded before logging in.
    const provisionRes = await fetch(`${supabaseUrl}/functions/v1/demo-provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      },
      body: "{}",
    });
    if (!provisionRes.ok) {
      console.error("demo-login: provisioning failed", await provisionRes.text());
      return json({ error: "Demo indisponible pour le moment" }, 503);
    }

    // Mint a real session for the demo user (server-side, password never exposed).
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password,
    });

    if (error || !data.session) {
      console.error("demo-login: sign in failed", error);
      return json({ error: "Connexion démo impossible" }, 500);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    console.error("demo-login error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
