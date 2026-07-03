import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-demo-reset-secret",
};

const DEMO_USERNAME = "demo";
const DEMO_EMAIL = "demo@repairpro.local";
const DEMO_SHOP_NAME = "RepairPro Démo";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Admin = ReturnType<typeof createClient>;

// Wipe all business data belonging to the demo account (FK-safe order).
async function wipeDemoData(admin: Admin, uid: string) {
  // sale_items -> via sales
  const { data: sales } = await admin.from("sales").select("id").eq("user_id", uid);
  const saleIds = (sales ?? []).map((s: any) => s.id);
  if (saleIds.length) await admin.from("sale_items").delete().in("sale_id", saleIds);
  await admin.from("sales").delete().eq("user_id", uid);

  // repair children -> via repairs
  const { data: repairs } = await admin.from("repairs").select("id").eq("user_id", uid);
  const repairIds = (repairs ?? []).map((r: any) => r.id);
  if (repairIds.length) {
    await admin.from("repair_payments").delete().in("repair_id", repairIds);
    await admin.from("repair_parts").delete().in("repair_id", repairIds);
    await admin.from("repair_status_history").delete().in("repair_id", repairIds);
  }
  await admin.from("repairs").delete().eq("user_id", uid);

  await admin.from("expenses").delete().eq("user_id", uid);
  await admin.from("products").delete().eq("user_id", uid);
  await admin.from("customers").delete().eq("user_id", uid);
  await admin.from("suppliers").delete().eq("user_id", uid);
  await admin.from("subcategories").delete().eq("user_id", uid);
  await admin.from("categories").delete().eq("user_id", uid);
  await admin.from("register_sessions").delete().eq("shop_id", uid);
}

async function seedDemoData(admin: Admin, uid: string) {
  // Categories
  const catNames = ["Écrans", "Batteries", "Accessoires", "Coques", "Chargeurs"];
  const { data: cats } = await admin
    .from("categories")
    .insert(catNames.map((name) => ({ user_id: uid, name, type: "product" })))
    .select("id, name");
  const catId = (n: string) => (cats ?? []).find((c: any) => c.name === n)?.id ?? null;

  // Products (a couple out of stock)
  await admin.from("products").insert([
    { user_id: uid, name: "Écran iPhone 12", sku: "SCR-IP12", category_id: catId("Écrans"), quantity: 14, min_quantity: 5, cost_price: 80, sell_price: 160 },
    { user_id: uid, name: "Écran iPhone 13", sku: "SCR-IP13", category_id: catId("Écrans"), quantity: 6, min_quantity: 5, cost_price: 110, sell_price: 220 },
    { user_id: uid, name: "Écran Samsung A52", sku: "SCR-A52", category_id: catId("Écrans"), quantity: 0, min_quantity: 4, cost_price: 70, sell_price: 150 },
    { user_id: uid, name: "Batterie iPhone 11", sku: "BAT-IP11", category_id: catId("Batteries"), quantity: 22, min_quantity: 8, cost_price: 18, sell_price: 60 },
    { user_id: uid, name: "Batterie Samsung S21", sku: "BAT-S21", category_id: catId("Batteries"), quantity: 3, min_quantity: 6, cost_price: 22, sell_price: 70 },
    { user_id: uid, name: "Câble USB-C 1m", sku: "CBL-USBC", category_id: catId("Chargeurs"), quantity: 48, min_quantity: 15, cost_price: 2.5, sell_price: 12 },
    { user_id: uid, name: "Chargeur 20W", sku: "CHG-20W", category_id: catId("Chargeurs"), quantity: 0, min_quantity: 10, cost_price: 7, sell_price: 25 },
    { user_id: uid, name: "Coque iPhone 14", sku: "CSE-IP14", category_id: catId("Coques"), quantity: 35, min_quantity: 10, cost_price: 3, sell_price: 18 },
    { user_id: uid, name: "Verre trempé universel", sku: "ACC-GLS", category_id: catId("Accessoires"), quantity: 60, min_quantity: 20, cost_price: 1.5, sell_price: 10 },
  ]);

  // Customers
  const { data: customers } = await admin
    .from("customers")
    .insert([
      { user_id: uid, name: "Ahmed Ben Ali", phone: "20123456", email: "ahmed@example.com" },
      { user_id: uid, name: "Sonia Trabelsi", phone: "21987654", email: "sonia@example.com" },
      { user_id: uid, name: "Karim Mansour", phone: "22456789" },
      { user_id: uid, name: "Leila Gharbi", phone: "23789012" },
      { user_id: uid, name: "Mehdi Khelifi", phone: "24345678" },
    ])
    .select("id, name");
  const custId = (i: number) => (customers ?? [])[i]?.id ?? null;

  // Suppliers
  await admin.from("suppliers").insert([
    { user_id: uid, name: "TechParts Tunisie", phone: "70123456", balance: 0 },
    { user_id: uid, name: "MobileWholesale", phone: "70654321", balance: 0 },
    { user_id: uid, name: "AccessPro", phone: "70999888", balance: 0 },
  ]);

  // Repairs across statuses
  const now = Date.now();
  const day = 86400000;
  await admin.from("repairs").insert([
    { user_id: uid, customer_id: custId(0), device_model: "iPhone 12", problem_description: "Écran cassé", status: "pending", labor_cost: 40, parts_cost: 160, total_cost: 200, amount_paid: 0, deposit_date: new Date(now - 1 * day).toISOString() },
    { user_id: uid, customer_id: custId(1), device_model: "Samsung A52", problem_description: "Ne charge plus", status: "in_progress", labor_cost: 30, parts_cost: 0, total_cost: 30, amount_paid: 0, deposit_date: new Date(now - 2 * day).toISOString() },
    { user_id: uid, customer_id: custId(2), device_model: "iPhone 11", problem_description: "Batterie à remplacer", status: "completed", labor_cost: 20, parts_cost: 60, total_cost: 80, amount_paid: 80, deposit_date: new Date(now - 3 * day).toISOString() },
    { user_id: uid, customer_id: custId(3), device_model: "iPhone 13", problem_description: "Vitre arrière", status: "delivered", labor_cost: 50, parts_cost: 90, total_cost: 140, amount_paid: 140, deposit_date: new Date(now - 5 * day).toISOString(), delivery_date: new Date(now - 4 * day).toISOString() },
    { user_id: uid, customer_id: custId(4), device_model: "Samsung S21", problem_description: "Problème logiciel", status: "rejected", labor_cost: 0, parts_cost: 0, total_cost: 0, amount_paid: 0, deposit_date: new Date(now - 6 * day).toISOString() },
    { user_id: uid, customer_id: custId(0), device_model: "iPhone 14", problem_description: "Haut-parleur HS", status: "in_progress", labor_cost: 35, parts_cost: 0, total_cost: 35, amount_paid: 0, deposit_date: new Date(now - 1 * day).toISOString() },
  ]);

  // Sales with items (use seeded products for pricing realism)
  const { data: prods } = await admin.from("products").select("id, sell_price, name").eq("user_id", uid);
  const pick = (name: string) => (prods ?? []).find((p: any) => p.name === name);
  const mkSale = async (customerIdx: number, items: { name: string; qty: number }[], method: string, daysAgo: number) => {
    const lineItems = items
      .map((it) => ({ p: pick(it.name), qty: it.qty }))
      .filter((li) => li.p);
    const total = lineItems.reduce((sum, li) => sum + Number(li.p.sell_price) * li.qty, 0);
    const { data: sale } = await admin
      .from("sales")
      .insert({ user_id: uid, customer_id: custId(customerIdx), total_amount: total, amount_paid: total, payment_method: method, created_at: new Date(now - daysAgo * day).toISOString() })
      .select("id")
      .single();
    if (sale) {
      await admin.from("sale_items").insert(
        lineItems.map((li) => ({ sale_id: sale.id, product_id: li.p.id, quantity: li.qty, unit_price: Number(li.p.sell_price) }))
      );
    }
  };
  await mkSale(0, [{ name: "Câble USB-C 1m", qty: 2 }, { name: "Coque iPhone 14", qty: 1 }], "cash", 0);
  await mkSale(1, [{ name: "Verre trempé universel", qty: 3 }], "card", 0);
  await mkSale(2, [{ name: "Batterie iPhone 11", qty: 1 }], "cash", 1);
  await mkSale(3, [{ name: "Écran iPhone 12", qty: 1 }], "card", 2);
  await mkSale(4, [{ name: "Coque iPhone 14", qty: 2 }, { name: "Verre trempé universel", qty: 2 }], "cash", 3);

  // Expenses
  await admin.from("expenses").insert([
    { user_id: uid, category: "Loyer", amount: 600, description: "Loyer boutique", expense_date: new Date(now - 2 * day).toISOString().slice(0, 10) },
    { user_id: uid, category: "Électricité", amount: 85, description: "Facture STEG", expense_date: new Date(now - 4 * day).toISOString().slice(0, 10) },
    { user_id: uid, category: "Stock", amount: 320, description: "Achat pièces écrans", expense_date: new Date(now - 1 * day).toISOString().slice(0, 10) },
    { user_id: uid, category: "Marketing", amount: 50, description: "Publicité Facebook", expense_date: new Date(now - 3 * day).toISOString().slice(0, 10) },
  ]);
}

async function ensureDemoUser(admin: Admin): Promise<string> {
  // Look up existing demo profile first
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", DEMO_USERNAME)
    .maybeSingle();

  let uid = (existingProfile as any)?.user_id as string | undefined;

  if (!uid) {
    const password = Deno.env.get("DEMO_ACCOUNT_PASSWORD")!;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Compte Démo", username: DEMO_USERNAME, email_verified: true },
    });
    if (createErr && !created?.user) {
      // Possibly already exists in auth but no profile — find it
      let page = 1;
      while (page <= 50 && !uid) {
        const { data } = await admin.auth.admin.listUsers({ page, per_page: 200 });
        const match = (data?.users ?? []).find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
        if (match) uid = match.id;
        if ((data?.users ?? []).length < 200) break;
        page += 1;
      }
      if (!uid) throw createErr;
    } else {
      uid = created!.user!.id;
    }
  }

  // Ensure profile / role / shop settings / subscription
  await admin.from("profiles").upsert(
    {
      user_id: uid,
      full_name: "Compte Démo",
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      verification_status: "verified",
      verification_deadline: null,
      verified_at: new Date().toISOString(),
      is_locked: false,
      is_demo: true,
    },
    { onConflict: "user_id" }
  );

  await admin.from("user_roles").upsert({ user_id: uid, role: "super_admin" }, { onConflict: "user_id,role" });

  await admin.from("shop_settings").upsert(
    {
      user_id: uid,
      shop_name: DEMO_SHOP_NAME,
      country: "TN",
      currency: "TND",
      onboarding_completed: true,
      phone: "70 000 000",
      address: "Avenue Habib Bourguiba, Tunis",
    },
    { onConflict: "user_id" }
  );

  // Active Pro subscription (1 year out)
  const { data: proPlan } = await admin
    .from("subscription_plans")
    .select("id")
    .ilike("name", "%Pro%")
    .order("price", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (proPlan) {
    await admin.from("shop_subscriptions").delete().eq("user_id", uid);
    await admin.from("shop_subscriptions").insert({
      user_id: uid,
      plan_id: (proPlan as any).id,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
  }

  // Publish demo_user_id so the public landing page can recognise it
  await admin.from("platform_settings").upsert({ key: "demo_user_id", value: uid }, { onConflict: "key" });

  return uid!;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resetSecret = req.headers.get("x-demo-reset-secret");
    const forceReset = resetSecret != null && resetSecret === Deno.env.get("DEMO_RESET_SECRET");

    const uid = await ensureDemoUser(admin);

    // Seed when forced (cron reset) or when the account has no data yet.
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);

    if (forceReset || (count ?? 0) === 0) {
      await wipeDemoData(admin, uid);
      await seedDemoData(admin, uid);
    }

    return json({ ok: true, user_id: uid, seeded: forceReset || (count ?? 0) === 0 });
  } catch (err) {
    console.error("demo-provision error:", err);
    return json({ error: "Provisioning failed" }, 500);
  }
});
