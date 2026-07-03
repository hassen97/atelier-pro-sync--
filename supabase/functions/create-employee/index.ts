import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const EmployeeSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  username: z.string().trim().min(3).max(20).regex(USERNAME_PATTERN),
  password: z.string().min(8).max(128),
  role: z.enum(["employee", "manager", "admin"]),
  allowedPages: z.array(z.string().max(50)).max(20).optional(),
});

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeAllowedPages(pages?: string[]) {
  const cleaned = (pages ?? ["/dashboard", "/pos"])
    .map((page) => (page.trim() === "/" ? "/dashboard" : page.trim()))
    .filter(Boolean);

  return Array.from(new Set(cleaned.includes("/dashboard") ? cleaned : ["/dashboard", ...cleaned]));
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;
    let ownerId = callerId;

    // Load ALL roles for the caller (a user may have several rows in user_roles)
    const { data: callerRoleRows, error: callerRoleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (callerRoleError) {
      console.error("Caller role lookup error:", callerRoleError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la vérification des permissions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const roles = new Set((callerRoleRows ?? []).map((r: any) => r.role as string));
    const isPlatformAdmin = roles.has("platform_admin");
    const isShopOwner = roles.has("super_admin") || roles.has("admin");

    if (isPlatformAdmin || isShopOwner) {
      // Tenant isolation: shop owners (super_admin / admin) always create
      // employees under their OWN account. Any client-supplied owner/shop id
      // is intentionally ignored.
      ownerId = callerId;
    } else {
      // Delegated path: an active team manager/admin may create employees on
      // behalf of their shop owner. The owner_id is resolved server-side.
      const { data: managerMembership, error: managerError } = await adminClient
        .from("team_members")
        .select("owner_id, role, status")
        .eq("member_user_id", callerId)
        .eq("status", "active")
        .in("role", ["manager", "admin"])
        .maybeSingle();

      if (managerError) {
        console.error("Manager membership lookup error:", managerError);
      }

      if (!managerMembership) {
        console.error("Permission denied for user:", callerId);
        return new Response(
          JSON.stringify({
            error:
              "Erreur : Seuls les gérants (admin) et super admins peuvent créer des comptes employés.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      ownerId = managerMembership.owner_id as string;
    }

    const rawBody = await req.json();
    const parseResult = EmployeeSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Données invalides",
          details: parseResult.error.issues.map((issue) => issue.message),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedUsername = normalizeUsername(parseResult.data.username);
    const fullName = parseResult.data.fullName.trim();
    const role = parseResult.data.role;
    const allowedPages = normalizeAllowedPages(parseResult.data.allowedPages);

    if (await usernameExistsGlobally(adminClient, normalizedUsername)) {
      return new Response(
        JSON.stringify({ error: "Ce nom d'utilisateur est déjà pris" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const email = `${normalizedUsername}@repairpro.local`;

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: parseResult.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username: normalizedUsername,
        email_verified: true,
      },
    });

    if (createError || !createdUser?.user) {
      console.error("Create user error:", createError);

      if (
        createError?.code === "email_exists" ||
        createError?.message?.includes("already been registered")
      ) {
        return new Response(
          JSON.stringify({ error: "Ce nom d'utilisateur est déjà pris" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du compte employé" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newUserId = createdUser.user.id;

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        user_id: newUserId,
        full_name: fullName,
        username: normalizedUsername,
        email,
        verification_status: "verified",
        verification_deadline: null,
        is_locked: false,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'enregistrement du profil employé" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: deleteRolesError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId);

    if (deleteRolesError) {
      console.error("Role cleanup error:", deleteRolesError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la préparation du rôle employé" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: roleInsertError } = await adminClient.from("user_roles").insert({
      user_id: newUserId,
      role,
    });

    if (roleInsertError) {
      console.error("Role insert error:", roleInsertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'enregistrement du rôle employé" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: teamMember, error: teamMemberError } = await adminClient
      .from("team_members")
      .insert({
        owner_id: ownerId,
        member_user_id: newUserId,
        role,
        allowed_pages: allowedPages,
      })
      .select("id, owner_id, member_user_id, role, allowed_pages, status, created_at")
      .single();

    if (teamMemberError || !teamMember) {
      console.error("Team member insert error:", teamMemberError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'ajout à l'équipe" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        userId: newUserId,
        username: normalizedUsername,
        fullName,
        member: {
          ...teamMember,
          profile: {
            username: normalizedUsername,
            full_name: fullName,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
