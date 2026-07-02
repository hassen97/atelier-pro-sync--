import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ActionSchema = z.object({
  action: z.enum([
    "list", "delete", "reset-password", "create", "lock", "unlock",
    "get-revenue", "get-activity", "update-settings",
    "list-reset-requests", "update-reset-request", "approve-signup",
    "get-platform-settings", "update-platform-setting",
    "list-employees", "delete-employee", "get-shop-details",
    "get-waitlist-stats", "get-waitlist-detailed-stats", "list-waitlist",
    "get-onboarding-stats",
    "list-plans", "update-plan",
    "list-feature-flags", "toggle-feature-flag",
    "list-payment-gateways", "toggle-payment-gateway", "update-gateway-config",
    "list-verification", "verify-owner", "suspend-owner", "revert-to-pending", "get-verification-request",
    "bulk-verify", "bulk-suspend", "bulk-delete", "bulk-revert-to-pending",
    "list-subscription-orders", "update-subscription-order",
    "change-role", "transfer-data", "export-shop-data",
    "reassign-employee",
  ]).optional(),
  userId: z.string().uuid().optional(),
  newPassword: z.string().min(8).max(128).optional(),
  fullName: z.string().trim().min(1).max(100).optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  password: z.string().min(8).max(128).optional(),
  country: z.string().min(2).max(3).optional(),
  currency: z.string().min(3).max(4).optional(),
  requestId: z.string().uuid().optional(),
  status: z.string().optional(),
  settingKey: z.string().optional(),
  settingValue: z.string().optional(),
  memberId: z.string().uuid().optional(),
  employeeUserId: z.string().uuid().optional(),
  plan: z.any().optional(),
  planId: z.string().uuid().optional(),
  featureFlagId: z.string().uuid().optional(),
  enabled: z.boolean().optional(),
  gatewayId: z.string().uuid().optional(),
  gatewayConfig: z.any().optional(),
  userIds: z.array(z.string().uuid()).max(100).optional(),
  orderId: z.string().uuid().optional(),
  adminNote: z.string().optional(),
  newRole: z.string().optional(),
  targetUserId: z.string().uuid().optional(),
  newOwnerId: z.string().uuid().optional(),
});

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const callerId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (roleData?.role !== "platform_admin") {
      return jsonResp({ error: "Forbidden" }, 403);
    }

    // Protected platform_admin IDs - never allow actions against them
    const PROTECTED_ADMIN_IDS = new Set([callerId]);
    const { data: allPlatformAdmins } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "platform_admin");
    (allPlatformAdmins || []).forEach((a: any) => PROTECTED_ADMIN_IDS.add(a.user_id));

    if (req.method === "POST" || req.method === "GET") {
      const rawBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const parseResult = ActionSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return jsonResp({ error: "Invalid input", details: parseResult.error.issues.map(i => i.message) }, 400);
      }
      const body = parseResult.data;
      const { action } = body;

      // Guard: block destructive actions against platform_admin accounts
      if (body.userId && PROTECTED_ADMIN_IDS.has(body.userId) &&
          ["delete", "lock", "suspend-owner", "reset-password"].includes(action || "")) {
        return jsonResp({ error: "Impossible de modifier un compte administrateur de la plateforme" }, 403);
      }
      // Guard for bulk actions: filter out protected IDs
      if (body.userIds && ["bulk-verify", "bulk-suspend", "bulk-delete"].includes(action || "")) {
        body.userIds = body.userIds.filter((id: string) => !PROTECTED_ADMIN_IDS.has(id));
        if (body.userIds.length === 0) {
          return jsonResp({ error: "Aucun utilisateur éligible pour cette action" }, 400);
        }
      }

      // ─── LIST OWNERS ───
      if (!action || action === "list") {
        // Self-healing safety net: backfill any auth.users that are missing
        // profile/role/shop_settings rows (e.g. signup trigger silently failed).
        try {
          const { data: authList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const authUsers = authList?.users || [];
          if (authUsers.length > 0) {
            const authIds = authUsers.map((u: any) => u.id);
            const [profRes, roleRes, shopRes] = await Promise.all([
              adminClient.from("profiles").select("user_id").in("user_id", authIds),
              adminClient.from("user_roles").select("user_id").in("user_id", authIds),
              adminClient.from("shop_settings").select("user_id").in("user_id", authIds),
            ]);
            const haveProfile = new Set((profRes.data || []).map((r: any) => r.user_id));
            const haveRole = new Set((roleRes.data || []).map((r: any) => r.user_id));
            const haveShop = new Set((shopRes.data || []).map((r: any) => r.user_id));

            const missingProfiles = authUsers.filter((u: any) => !haveProfile.has(u.id)).map((u: any) => ({
              user_id: u.id,
              full_name: u.user_metadata?.full_name || u.email,
              username: (u.user_metadata?.username || "").toLowerCase() || null,
              is_locked: false,
              phone: u.user_metadata?.phone || null,
              whatsapp_phone: u.user_metadata?.whatsapp_phone || null,
              email: u.user_metadata?.email || u.email,
              verification_status: "verified",
              verified_at: new Date().toISOString(),
            }));
            const missingRoles = authUsers.filter((u: any) => !haveRole.has(u.id)).map((u: any) => ({
              user_id: u.id,
              role: "super_admin",
            }));
            const missingShops = authUsers.filter((u: any) => !haveShop.has(u.id)).map((u: any) => ({
              user_id: u.id,
              country: u.user_metadata?.country || "TN",
              currency: u.user_metadata?.currency || "TND",
            }));

            if (missingProfiles.length > 0) {
              await adminClient.from("profiles").upsert(missingProfiles, { onConflict: "user_id", ignoreDuplicates: true });
            }
            if (missingRoles.length > 0) {
              await adminClient.from("user_roles").upsert(missingRoles, { onConflict: "user_id,role", ignoreDuplicates: true });
            }
            if (missingShops.length > 0) {
              await adminClient.from("shop_settings").upsert(missingShops, { onConflict: "user_id", ignoreDuplicates: true });
            }
            if (missingProfiles.length || missingRoles.length || missingShops.length) {
              console.log(`[admin-list] Self-healed orphaned accounts: profiles=${missingProfiles.length}, roles=${missingRoles.length}, shops=${missingShops.length}`);
            }
          }
        } catch (healErr) {
          console.warn("[admin-list] Self-heal step failed (continuing):", healErr);
        }

        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name, username, created_at, is_locked, last_online_at, phone, whatsapp_phone, email, verification_status")
          .order("created_at", { ascending: false });

        const { data: roles } = await adminClient.from("user_roles").select("user_id, role");
        const { data: teamCounts } = await adminClient.from("team_members").select("owner_id").eq("status", "active");
        const { data: repairCounts } = await adminClient.from("repairs").select("user_id");
        const { data: shopSettings } = await adminClient.from("shop_settings").select("user_id, shop_name, country, currency");

        const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
        const teamCountMap = new Map<string, number>();
        (teamCounts || []).forEach((t: any) => {
          teamCountMap.set(t.owner_id, (teamCountMap.get(t.owner_id) || 0) + 1);
        });
        const repairCountMap = new Map<string, number>();
        (repairCounts || []).forEach((r: any) => {
          repairCountMap.set(r.user_id, (repairCountMap.get(r.user_id) || 0) + 1);
        });
        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, { shop_name: s.shop_name, country: s.country, currency: s.currency }]));

        const owners = (profiles || [])
          .filter((p: any) => roleMap.get(p.user_id) === "super_admin")
          .map((p: any) => ({
            ...p,
            role: roleMap.get(p.user_id),
            team_count: teamCountMap.get(p.user_id) || 0,
            repair_count: repairCountMap.get(p.user_id) || 0,
            shop_name: shopMap.get(p.user_id)?.shop_name || "Mon Atelier",
            country: shopMap.get(p.user_id)?.country || "TN",
            currency: shopMap.get(p.user_id)?.currency || "TND",
          }));

        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const activeNowCount = owners.filter((o: any) => o.last_online_at && o.last_online_at > fiveMinAgo).length;

        return jsonResp({
          owners,
          stats: {
            total_owners: owners.length,
            total_employees: (teamCounts || []).length,
            total_repairs: (repairCounts || []).length,
            active_now_count: activeNowCount,
          },
        });
      }

      // ─── DELETE OWNER ───
      if (action === "delete") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        const { error } = await adminClient.auth.admin.deleteUser(body.userId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── RESET PASSWORD ───
      if (action === "reset-password") {
        if (!body.userId || !body.newPassword) return jsonResp({ error: "userId and newPassword required" }, 400);
        const { error } = await adminClient.auth.admin.updateUserById(body.userId, { password: body.newPassword });
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── CREATE OWNER ───
      if (action === "create") {
        if (!body.fullName || !body.username || !body.password) return jsonResp({ error: "fullName, username and password required" }, 400);
        const email = `${body.username.toLowerCase()}@repairpro.local`;
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: body.password,
          email_confirm: true,
          user_metadata: {
            full_name: body.fullName,
            username: body.username.toLowerCase(),
            ...(body.country && { country: body.country }),
            ...(body.currency && { currency: body.currency }),
          },
        });
        if (createError) throw createError;
        return jsonResp({ success: true, userId: newUser.user.id });
      }

      // ─── LOCK ───
      if (action === "lock") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        await adminClient.from("profiles").update({ is_locked: true }).eq("user_id", body.userId);
        const { error } = await adminClient.auth.admin.updateUserById(body.userId, { ban_duration: "876000h" });
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── UNLOCK ───
      if (action === "unlock" || action === "approve-signup") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        await adminClient.from("profiles").update({ is_locked: false }).eq("user_id", body.userId);
        const { error } = await adminClient.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── GET REVENUE ───
      if (action === "get-revenue") {
        const { data: sales } = await adminClient.from("sales").select("user_id, total_amount");
        let totalRevenue = 0;
        (sales || []).forEach((s: any) => { totalRevenue += Number(s.total_amount || 0); });

        const { data: repairs } = await adminClient.from("repairs").select("user_id, total_cost");
        let totalRepairRevenue = 0;
        (repairs || []).forEach((r: any) => { totalRepairRevenue += Number(r.total_cost || 0); });

        return jsonResp({
          total_revenue: totalRevenue + totalRepairRevenue,
          sales_revenue: totalRevenue,
          repair_revenue: totalRepairRevenue,
        });
      }

      // ─── GET ACTIVITY ───
      if (action === "get-activity") {
        const { data: recentRepairs } = await adminClient.from("repairs").select("id, device_model, status, created_at, user_id, total_cost").order("created_at", { ascending: false }).limit(10);
        const { data: recentSales } = await adminClient.from("sales").select("id, total_amount, created_at, user_id, payment_method").order("created_at", { ascending: false }).limit(10);

        const userIds = new Set<string>();
        (recentRepairs || []).forEach((r: any) => userIds.add(r.user_id));
        (recentSales || []).forEach((s: any) => userIds.add(s.user_id));

        const { data: shopSettings } = await adminClient.from("shop_settings").select("user_id, shop_name").in("user_id", Array.from(userIds));
        const { data: profiles } = await adminClient.from("profiles").select("user_id, full_name").in("user_id", Array.from(userIds));
        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, s.shop_name]));
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

        const activity = [
          ...(recentRepairs || []).map((r: any) => ({ type: "repair", id: r.id, description: `Réparation: ${r.device_model}`, amount: r.total_cost, status: r.status, created_at: r.created_at, shop_name: shopMap.get(r.user_id) || profileMap.get(r.user_id) || "Inconnu" })),
          ...(recentSales || []).map((s: any) => ({ type: "sale", id: s.id, description: `Vente (${s.payment_method})`, amount: s.total_amount, status: "completed", created_at: s.created_at, shop_name: shopMap.get(s.user_id) || profileMap.get(s.user_id) || "Inconnu" })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

        return jsonResp({ activity });
      }

      // ─── UPDATE SHOP SETTINGS ───
      if (action === "update-settings") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        const updateData: Record<string, unknown> = {};
        if (body.country) updateData.country = body.country;
        if (body.currency) updateData.currency = body.currency;
        updateData.updated_at = new Date().toISOString();
        const { error } = await adminClient.from("shop_settings").update(updateData).eq("user_id", body.userId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── RESET REQUESTS ───
      if (action === "list-reset-requests") {
        const { data: requests } = await adminClient.from("password_reset_requests").select("*").order("created_at", { ascending: false });
        const usernames = (requests || []).map((r: any) => r.username);
        const { data: profiles } = await adminClient.from("profiles").select("username, phone, whatsapp_phone, user_id, full_name").in("username", usernames);
        const profileMap = new Map((profiles || []).map((p: any) => [p.username, p]));
        const enrichedRequests = (requests || []).map((r: any) => {
          const profile = profileMap.get(r.username);
          return { ...r, phone: r.phone || profile?.phone || null, whatsapp_phone: profile?.whatsapp_phone || null, user_id: profile?.user_id || null, full_name: profile?.full_name || null };
        });
        return jsonResp({ requests: enrichedRequests });
      }

      if (action === "update-reset-request") {
        if (!body.requestId || !body.status) return jsonResp({ error: "requestId and status required" }, 400);
        const { error } = await adminClient.from("password_reset_requests").update({ status: body.status }).eq("id", body.requestId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── PLATFORM SETTINGS ───
      if (action === "get-platform-settings") {
        const { data } = await adminClient.from("platform_settings").select("key, value, updated_at");
        return jsonResp({ settings: data });
      }

      if (action === "update-platform-setting") {
        if (!body.settingKey || body.settingValue === undefined) return jsonResp({ error: "settingKey and settingValue required" }, 400);
        const { error } = await adminClient.from("platform_settings").update({ value: body.settingValue, updated_at: new Date().toISOString() }).eq("key", body.settingKey);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── EMPLOYEES ───
      if (action === "list-employees") {
        const { data: members } = await adminClient.from("team_members").select("id, owner_id, member_user_id, role, created_at, allowed_pages, status");
        if (!members || members.length === 0) return jsonResp({ employees: [] });

        const memberUserIds = members.map((m: any) => m.member_user_id);
        const ownerIds = [...new Set(members.map((m: any) => m.owner_id))];

        const [{ data: memberProfiles }, { data: ownerProfiles }, { data: shopSettings }] = await Promise.all([
          adminClient.from("profiles").select("user_id, full_name, username, phone, last_online_at, verification_status, is_locked").in("user_id", memberUserIds),
          adminClient.from("profiles").select("user_id, username, full_name").in("user_id", ownerIds as string[]),
          adminClient.from("shop_settings").select("user_id, shop_name").in("user_id", ownerIds as string[]),
        ]);

        const memberProfileMap = new Map((memberProfiles || []).map((p: any) => [p.user_id, p]));
        const ownerProfileMap = new Map((ownerProfiles || []).map((p: any) => [p.user_id, p]));
        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, s.shop_name]));

        const employees = members.map((m: any) => ({
          id: m.id, member_user_id: m.member_user_id, owner_id: m.owner_id, role: m.role, status: m.status, created_at: m.created_at, allowed_pages: m.allowed_pages || [],
          full_name: memberProfileMap.get(m.member_user_id)?.full_name || null,
          username: memberProfileMap.get(m.member_user_id)?.username || null,
          phone: memberProfileMap.get(m.member_user_id)?.phone || null,
          last_online_at: memberProfileMap.get(m.member_user_id)?.last_online_at || null,
          verification_status: memberProfileMap.get(m.member_user_id)?.verification_status || null,
          is_locked: memberProfileMap.get(m.member_user_id)?.is_locked || false,
          owner_username: ownerProfileMap.get(m.owner_id)?.username || null,
          owner_full_name: ownerProfileMap.get(m.owner_id)?.full_name || null,
          shop_name: shopMap.get(m.owner_id) || "Mon Atelier",
        }));

        return jsonResp({ employees });
      }

      // ─── SHOP DETAILS ───
      if (action === "get-shop-details") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        const uid = body.userId;

        const [
          { data: profile }, { data: shopSettings }, { data: products }, { data: customers },
          { data: sales }, { data: repairs }, { data: expenses }, { data: suppliers },
          { data: teamMembers }, { data: recentSales }, { data: recentRepairs },
        ] = await Promise.all([
          adminClient.from("profiles").select("*").eq("user_id", uid).single(),
          adminClient.from("shop_settings").select("*").eq("user_id", uid).single(),
          adminClient.from("products").select("id").eq("user_id", uid),
          adminClient.from("customers").select("id").eq("user_id", uid),
          adminClient.from("sales").select("id, total_amount").eq("user_id", uid),
          adminClient.from("repairs").select("id, total_cost, status").eq("user_id", uid),
          adminClient.from("expenses").select("id, amount").eq("user_id", uid),
          adminClient.from("suppliers").select("id").eq("user_id", uid),
          adminClient.from("team_members").select("id, member_user_id, role, status, created_at").eq("owner_id", uid),
          adminClient.from("sales").select("id, total_amount, payment_method, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
          adminClient.from("repairs").select("id, device_model, total_cost, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        ]);

        const memberUserIds = (teamMembers || []).map((m: any) => m.member_user_id);
        let teamList: any[] = [];
        if (memberUserIds.length > 0) {
          const { data: memberProfiles } = await adminClient.from("profiles").select("user_id, full_name, username, last_online_at").in("user_id", memberUserIds);
          const mpMap = new Map((memberProfiles || []).map((p: any) => [p.user_id, p]));
          teamList = (teamMembers || []).map((m: any) => ({
            id: m.id, role: m.role, status: m.status, created_at: m.created_at,
            full_name: mpMap.get(m.member_user_id)?.full_name || null,
            username: mpMap.get(m.member_user_id)?.username || null,
            last_online_at: mpMap.get(m.member_user_id)?.last_online_at || null,
          }));
        }

        const totalSalesRevenue = (sales || []).reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
        const totalRepairRevenue = (repairs || []).reduce((sum: number, r: any) => sum + Number(r.total_cost || 0), 0);
        const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
        const pendingRepairs = (repairs || []).filter((r: any) => r.status === "pending" || r.status === "in_progress").length;

        return jsonResp({
          profile, shop: shopSettings,
          counts: {
            products: (products || []).length, customers: (customers || []).length, sales: (sales || []).length,
            repairs: (repairs || []).length, expenses: (expenses || []).length, suppliers: (suppliers || []).length,
            team_members: (teamMembers || []).length, pending_repairs: pendingRepairs,
          },
          revenue: { sales: totalSalesRevenue, repairs: totalRepairRevenue, expenses: totalExpenses },
          team: teamList, recent_sales: recentSales || [], recent_repairs: recentRepairs || [],
        });
      }

      // ─── DELETE EMPLOYEE ───
      if (action === "delete-employee") {
        if (!body.memberId || !body.employeeUserId) return jsonResp({ error: "memberId and employeeUserId required" }, 400);
        await adminClient.from("team_members").delete().eq("id", body.memberId);
        const { error } = await adminClient.auth.admin.deleteUser(body.employeeUserId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── REASSIGN EMPLOYEE ───
      if (action === "reassign-employee") {
        if (!body.memberId || !body.newOwnerId) return jsonResp({ error: "memberId and newOwnerId required" }, 400);
        const { error } = await adminClient
          .from("team_members")
          .update({ owner_id: body.newOwnerId })
          .eq("id", body.memberId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── WAITLIST ───
      if (action === "get-waitlist-stats") {
        const { count: total } = await adminClient.from("waitlist").select("*", { count: "exact", head: true });
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recent } = await adminClient.from("waitlist").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo);
        return jsonResp({ total: total || 0, recent_7d: recent || 0 });
      }

      if (action === "get-waitlist-detailed-stats") {
        const { count: total } = await adminClient
          .from("waitlist")
          .select("*", { count: "exact", head: true });
        const { count: notified } = await adminClient
          .from("waitlist")
          .select("*", { count: "exact", head: true })
          .not("notified_at", "is", null);
        const { count: signedUp } = await adminClient
          .from("waitlist")
          .select("*", { count: "exact", head: true })
          .not("signed_up_user_id", "is", null);
        const totalNum = total || 0;
        const notifiedNum = notified || 0;
        return jsonResp({
          total: totalNum,
          pending: Math.max(0, totalNum - notifiedNum),
          notified: notifiedNum,
          signedUp: signedUp || 0,
        });
      }

      if (action === "list-waitlist") {
        const { data: entries } = await adminClient.from("waitlist").select("*").order("created_at", { ascending: false });
        return jsonResp({ entries: entries || [] });
      }

      // ─── ONBOARDING SETUP STATS ───
      if (action === "get-onboarding-stats") {
        const MAX_REMINDERS = 2;

        // All super_admin user_ids
        const { data: roles } = await adminClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");
        const ownerIds = (roles || []).map((r: any) => r.user_id);

        if (ownerIds.length === 0) {
          return jsonResp({
            totalIncomplete: 0,
            withEmail: 0,
            withoutEmail: 0,
            reachableRemindersLeft: 0,
          });
        }

        // Shop settings for those owners with onboarding incomplete
        const { data: settings } = await adminClient
          .from("shop_settings")
          .select("user_id, onboarding_completed, onboarding_reminders_sent")
          .in("user_id", ownerIds)
          .eq("onboarding_completed", false);

        const incompleteIds = (settings || []).map((s: any) => s.user_id);
        const remindersMap = new Map(
          (settings || []).map((s: any) => [s.user_id, s.onboarding_reminders_sent ?? 0])
        );

        let withEmail = 0;
        let withoutEmail = 0;
        let reachableRemindersLeft = 0;

        if (incompleteIds.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("user_id, email")
            .in("user_id", incompleteIds);
          const emailMap = new Map(
            (profiles || []).map((p: any) => [p.user_id, p.email || ""])
          );
          for (const uid of incompleteIds) {
            const email = emailMap.get(uid) || "";
            const hasEmail = !!email && email.includes("@");
            if (hasEmail) {
              withEmail++;
              const sent = remindersMap.get(uid) ?? 0;
              if (sent < MAX_REMINDERS) reachableRemindersLeft++;
            } else {
              withoutEmail++;
            }
          }
        }

        return jsonResp({
          totalIncomplete: incompleteIds.length,
          withEmail,
          withoutEmail,
          reachableRemindersLeft,
        });
      }

      // ─── SUBSCRIPTION PLANS ───
      if (action === "list-plans") {
        const { data: plans } = await adminClient.from("subscription_plans").select("*").order("sort_order", { ascending: true });
        return jsonResp({ plans: (plans || []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]") })) });
      }

      if (action === "update-plan") {
        const plan = body.plan;
        if (!plan?.id) return jsonResp({ error: "plan.id required" }, 400);
        const { error } = await adminClient.from("subscription_plans").update({
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          period: plan.period,
          description: plan.description,
          features: JSON.stringify(plan.features),
          highlight: plan.highlight,
          is_active: plan.is_active,
          updated_at: new Date().toISOString(),
        }).eq("id", plan.id);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── FEATURE FLAGS ───
      if (action === "list-feature-flags") {
        const { data: flags } = await adminClient.from("feature_flags").select("*").order("feature_name");
        const { data: assignments } = await adminClient.from("plan_feature_flags").select("plan_id, feature_flag_id");
        return jsonResp({ flags: flags || [], assignments: assignments || [] });
      }

      if (action === "toggle-feature-flag") {
        if (!body.planId || !body.featureFlagId) return jsonResp({ error: "planId and featureFlagId required" }, 400);
        if (body.enabled) {
          await adminClient.from("plan_feature_flags").insert({ plan_id: body.planId, feature_flag_id: body.featureFlagId });
        } else {
          await adminClient.from("plan_feature_flags").delete().eq("plan_id", body.planId).eq("feature_flag_id", body.featureFlagId);
        }
        return jsonResp({ success: true });
      }

      // ─── PAYMENT GATEWAYS ───
      if (action === "list-payment-gateways") {
        const { data: gateways } = await adminClient.from("payment_gateways").select("*").order("gateway_name");
        return jsonResp({ gateways: gateways || [] });
      }

      if (action === "toggle-payment-gateway") {
        if (!body.gatewayId) return jsonResp({ error: "gatewayId required" }, 400);
        const { error } = await adminClient.from("payment_gateways").update({ is_enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", body.gatewayId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── UPDATE GATEWAY CONFIG (admin payment details) ───
      if (action === "update-gateway-config") {
        if (!body.gatewayId || !body.gatewayConfig) return jsonResp({ error: "gatewayId and gatewayConfig required" }, 400);
        const { error } = await adminClient.from("payment_gateways").update({ 
          config: body.gatewayConfig, 
          updated_at: new Date().toISOString() 
        }).eq("id", body.gatewayId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── SUBSCRIPTION ORDERS ───
      if (action === "list-subscription-orders") {
        const { data: orders } = await adminClient
          .from("subscription_orders")
          .select("*")
          .order("created_at", { ascending: false });

        // Enrich with user info and plan info
        const userIds = [...new Set((orders || []).map((o: any) => o.user_id))];
        const planIds = [...new Set((orders || []).map((o: any) => o.plan_id))];

        const [{ data: profiles }, { data: plans }] = await Promise.all([
          userIds.length > 0 ? adminClient.from("profiles").select("user_id, full_name, username").in("user_id", userIds) : { data: [] },
          planIds.length > 0 ? adminClient.from("subscription_plans").select("id, name").in("id", planIds) : { data: [] },
        ]);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const planMap = new Map((plans || []).map((p: any) => [p.id, p.name]));

        const enriched = (orders || []).map((o: any) => ({
          ...o,
          user_full_name: profileMap.get(o.user_id)?.full_name || null,
          user_username: profileMap.get(o.user_id)?.username || null,
          plan_name: planMap.get(o.plan_id) || null,
        }));

        return jsonResp({ orders: enriched });
      }

      if (action === "update-subscription-order") {
        if (!body.orderId || !body.status) return jsonResp({ error: "orderId and status required" }, 400);
        const updateData: Record<string, unknown> = {
          status: body.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerId,
          updated_at: new Date().toISOString(),
        };
        if (body.adminNote) updateData.admin_note = body.adminNote;
        const { error } = await adminClient.from("subscription_orders").update(updateData).eq("id", body.orderId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── VERIFICATION: LIST ───
      if (action === "list-verification") {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name, username, created_at, phone, verification_status, verification_deadline, verification_requested_at, verified_at")
          .order("created_at", { ascending: false });

        const { data: roles } = await adminClient.from("user_roles").select("user_id, role");
        const { data: shopSettings } = await adminClient.from("shop_settings").select("user_id, shop_name");

        const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, s.shop_name]));

        const owners = (profiles || [])
          .filter((p: any) => roleMap.get(p.user_id) === "super_admin")
          .map((p: any) => ({
            ...p,
            shop_name: shopMap.get(p.user_id) || "Mon Atelier",
          }));

        return jsonResp({ owners });
      }

      // ─── VERIFICATION: VERIFY OWNER ───
      if (action === "verify-owner") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        await adminClient.from("profiles").update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verified_by_admin: callerId,
          is_locked: false,
        }).eq("user_id", body.userId);
        await adminClient.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
        await adminClient.from("verification_requests").update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerId,
        }).eq("user_id", body.userId).eq("status", "pending");
        return jsonResp({ success: true });
      }

      // ─── VERIFICATION: SUSPEND OWNER ───
      if (action === "suspend-owner") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        await adminClient.from("profiles").update({
          verification_status: "suspended",
          is_locked: true,
        }).eq("user_id", body.userId);
        await adminClient.auth.admin.updateUserById(body.userId, { ban_duration: "876000h" });
        return jsonResp({ success: true });
      }

      // ─── VERIFICATION: REVERT TO PENDING ───
      if (action === "revert-to-pending") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        await adminClient.from("profiles").update({
          verification_status: "pending_verification",
          verification_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          verified_at: null,
          verified_by_admin: null,
          is_locked: false,
        }).eq("user_id", body.userId);
        await adminClient.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
        return jsonResp({ success: true });
      }

      // ─── VERIFICATION: GET REQUEST ───
      if (action === "get-verification-request") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        const { data: request } = await adminClient
          .from("verification_requests")
          .select("*")
          .eq("user_id", body.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        return jsonResp({ request });
      }

      // ─── BULK VERIFY ───
      if (action === "bulk-verify") {
        if (!body.userIds || body.userIds.length === 0) return jsonResp({ error: "userIds required" }, 400);
        let successCount = 0;
        for (const uid of body.userIds) {
          await adminClient.from("profiles").update({
            verification_status: "verified",
            verified_at: new Date().toISOString(),
            verified_by_admin: callerId,
            is_locked: false,
          }).eq("user_id", uid);
          await adminClient.auth.admin.updateUserById(uid, { ban_duration: "none" });
          await adminClient.from("verification_requests").update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: callerId,
          }).eq("user_id", uid).eq("status", "pending");
          successCount++;
        }
        return jsonResp({ success: true, count: successCount });
      }

      // ─── BULK SUSPEND ───
      if (action === "bulk-suspend") {
        if (!body.userIds || body.userIds.length === 0) return jsonResp({ error: "userIds required" }, 400);
        let successCount = 0;
        for (const uid of body.userIds) {
          await adminClient.from("profiles").update({
            verification_status: "suspended",
            is_locked: true,
          }).eq("user_id", uid);
          await adminClient.auth.admin.updateUserById(uid, { ban_duration: "876000h" });
          successCount++;
        }
        return jsonResp({ success: true, count: successCount });
      }

      // ─── BULK DELETE ───
      if (action === "bulk-delete") {
        if (!body.userIds || body.userIds.length === 0) return jsonResp({ error: "userIds required" }, 400);
        let successCount = 0;
        for (const uid of body.userIds) {
          const { error } = await adminClient.auth.admin.deleteUser(uid);
          if (!error) successCount++;
        }
        return jsonResp({ success: true, count: successCount });
      }

      // ─── BULK REVERT TO PENDING ───
      if (action === "bulk-revert-to-pending") {
        if (!body.userIds || body.userIds.length === 0) return jsonResp({ error: "userIds required" }, 400);
        let successCount = 0;
        for (const uid of body.userIds) {
          await adminClient.from("profiles").update({
            verification_status: "pending_verification",
            verification_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            verified_at: null,
            verified_by_admin: null,
            is_locked: false,
          }).eq("user_id", uid);
          await adminClient.auth.admin.updateUserById(uid, { ban_duration: "none" });
          successCount++;
        }
        return jsonResp({ success: true, count: successCount });
      }

      // ─── CHANGE ROLE ───
      if (action === "change-role") {
        if (!body.userId || !body.newRole) return jsonResp({ error: "userId and newRole required" }, 400);
        const validRoles = ["super_admin", "employee"];
        if (!validRoles.includes(body.newRole)) return jsonResp({ error: "Invalid role" }, 400);
        const { error } = await adminClient.from("user_roles").update({ role: body.newRole }).eq("user_id", body.userId);
        if (error) throw error;
        return jsonResp({ success: true });
      }

      // ─── TRANSFER DATA ───
      if (action === "transfer-data") {
        if (!body.userId || !body.targetUserId) return jsonResp({ error: "userId (source) and targetUserId (target) required" }, 400);
        const src = body.userId;
        const tgt = body.targetUserId;
        let cloned = { products: 0, customers: 0, categories: 0 };

        // Clone categories
        const { data: cats } = await adminClient.from("categories").select("*").eq("user_id", src);
        for (const c of cats || []) {
          await adminClient.from("categories").insert({ name: c.name, type: c.type, user_id: tgt });
          cloned.categories++;
        }

        // Clone customers
        const { data: custs } = await adminClient.from("customers").select("*").eq("user_id", src);
        for (const c of custs || []) {
          await adminClient.from("customers").insert({ name: c.name, phone: c.phone, email: c.email, address: c.address, notes: c.notes, user_id: tgt });
          cloned.customers++;
        }

        // Clone products
        const { data: prods } = await adminClient.from("products").select("*").eq("user_id", src);
        for (const p of prods || []) {
          await adminClient.from("products").insert({ name: p.name, cost_price: p.cost_price, sell_price: p.sell_price, quantity: p.quantity, min_quantity: p.min_quantity, description: p.description, barcodes: p.barcodes, sku: p.sku, user_id: tgt });
          cloned.products++;
        }

        return jsonResp({ success: true, cloned });
      }

      // ─── EXPORT SHOP DATA ───
      if (action === "export-shop-data") {
        if (!body.userId) return jsonResp({ error: "userId required" }, 400);
        const uid = body.userId;
        const [
          { data: products }, { data: customers }, { data: sales }, { data: saleItems },
          { data: repairs }, { data: expenses }, { data: suppliers }, { data: categories },
        ] = await Promise.all([
          adminClient.from("products").select("*").eq("user_id", uid),
          adminClient.from("customers").select("*").eq("user_id", uid),
          adminClient.from("sales").select("*").eq("user_id", uid),
          adminClient.from("sale_items").select("*, sales!inner(user_id)").eq("sales.user_id", uid),
          adminClient.from("repairs").select("*").eq("user_id", uid),
          adminClient.from("expenses").select("*").eq("user_id", uid),
          adminClient.from("suppliers").select("*").eq("user_id", uid),
          adminClient.from("categories").select("*").eq("user_id", uid),
        ]);

        return jsonResp({
          exported_at: new Date().toISOString(),
          user_id: uid,
          data: { products, customers, sales, sale_items: saleItems, repairs, expenses, suppliers, categories },
        });
      }

      return jsonResp({ error: "Unknown action" }, 400);
    }

    return jsonResp({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("Admin action error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResp({ error: message }, 500);
  }
});
