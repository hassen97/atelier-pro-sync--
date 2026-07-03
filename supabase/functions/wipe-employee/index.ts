import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  employeeUserId: z.string().uuid(),
});

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Non autorisé" }, 401);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return jsonResp({ error: "Non autorisé" }, 401);
    }
    const callerId = userData.user.id;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResp({ error: "employeeUserId invalide" }, 400);
    }
    const target = parsed.data.employeeUserId;

    if (target === callerId) {
      return jsonResp({ error: "Vous ne pouvez pas vous supprimer vous-même." }, 400);
    }

    // ── Authorization ──
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isPlatformAdmin = (callerRoles ?? []).some((r: any) => r.role === "platform_admin");

    // All team memberships for the target (active + removed)
    const { data: targetMemberships } = await adminClient
      .from("team_members")
      .select("id, owner_id")
      .eq("member_user_id", target);
    const memberships = targetMemberships ?? [];

    if (!isPlatformAdmin) {
      // A shop owner may only wipe an employee that belongs to their own shop.
      const ownsTarget = memberships.some((m: any) => m.owner_id === callerId);
      if (!ownsTarget) {
        return jsonResp({ error: "Vous n'êtes pas autorisé à supprimer cet employé." }, 403);
      }
    }

    // ── Safety: never wipe a platform admin ──
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", target);
    if ((targetRoles ?? []).some((r: any) => r.role === "platform_admin")) {
      return jsonResp({ error: "Impossible de supprimer un administrateur de la plateforme." }, 403);
    }

    // ── Safety: target must actually be an employee (has a team membership) ──
    if (memberships.length === 0) {
      return jsonResp({ error: "Cet utilisateur n'est pas un employé (aucune équipe associée)." }, 400);
    }

    // ── Full purge: remove every trace of the employee account ──
    const cleanups: Array<{ label: string; run: () => Promise<any> }> = [
      { label: "team_members", run: () => adminClient.from("team_members").delete().eq("member_user_id", target) },
      { label: "team_tasks", run: () => adminClient.from("team_tasks").delete().eq("assigned_to", target) },
      { label: "employee_transactions", run: () => adminClient.from("employee_transactions").delete().eq("employee_id", target) },
      { label: "user_category_preferences", run: () => adminClient.from("user_category_preferences").delete().eq("user_id", target) },
      { label: "announcement_reads", run: () => adminClient.from("announcement_reads").delete().eq("user_id", target) },
      { label: "push_subscriptions", run: () => adminClient.from("push_subscriptions").delete().eq("user_id", target) },
      { label: "platform_feedback", run: () => adminClient.from("platform_feedback").delete().eq("user_id", target) },
      { label: "messages", run: () => adminClient.from("messages").delete().eq("sender_id", target) },
      { label: "conversations_a", run: () => adminClient.from("conversations").delete().eq("participant_a", target) },
      { label: "conversations_b", run: () => adminClient.from("conversations").delete().eq("participant_b", target) },
      { label: "user_roles", run: () => adminClient.from("user_roles").delete().eq("user_id", target) },
      { label: "profiles", run: () => adminClient.from("profiles").delete().eq("user_id", target) },
    ];

    const warnings: string[] = [];
    for (const step of cleanups) {
      const { error } = await step.run();
      if (error) {
        console.warn(`wipe-employee: cleanup '${step.label}' failed:`, error.message);
        warnings.push(step.label);
      }
    }

    // ── Delete the auth account last ──
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(target);
    if (deleteError) {
      console.error("wipe-employee: auth deletion failed:", deleteError.message);
      return jsonResp({ error: `Échec de la suppression du compte: ${deleteError.message}`, warnings }, 500);
    }

    return jsonResp({ success: true, warnings });
  } catch (err) {
    console.error("wipe-employee error:", err);
    return jsonResp({ error: (err as Error).message || "Erreur serveur" }, 500);
  }
});
