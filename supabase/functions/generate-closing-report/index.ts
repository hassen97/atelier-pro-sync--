import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CategoryAgg {
  category: string;
  revenue: number;
  items: number;
}
interface PaymentAgg {
  method: string;
  revenue: number;
  count: number;
}
interface ReturnRow {
  product_name: string;
  quantity: number;
  refund_amount: number;
  refund_method: string | null;
}
interface ExpenseAgg {
  category: string;
  amount: number;
}
interface ProductAgg {
  product_name: string;
  quantity: number;
  revenue: number;
}
interface RepairRow {
  label: string;
  customer: string | null;
  amount: number;
}

function methodLabel(m: string | null | undefined): string {
  switch ((m || "").toLowerCase()) {
    case "cash":
    case "especes":
    case "espèces":
      return "Espèces";
    case "card":
    case "carte":
      return "Carte";
    case "transfer":
    case "virement":
      return "Virement";
    case "check":
    case "cheque":
    case "chèque":
      return "Chèque";
    default:
      return m ? m.charAt(0).toUpperCase() + m.slice(1) : "Autre";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ---- Auth: validate JWT in-code (ES256 on Lovable Cloud) ----
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    let shopId: string = body?.shop_id || callerId;

    // ---- Authorization: caller must own the shop, be an active team member, or platform admin ----
    if (shopId !== callerId) {
      const { data: teamRow } = await admin
        .from("team_members")
        .select("id")
        .eq("owner_id", shopId)
        .eq("member_user_id", callerId)
        .eq("status", "active")
        .maybeSingle();

      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: callerId,
        _role: "platform_admin",
      });

      if (!teamRow && !isAdmin) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ---- Resolve the currently open session ----
    const { data: session } = await admin
      .from("register_sessions")
      .select("id, opened_at")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      const empty = {
        sessionId: null,
        openedAt: null,
        byCategory: [],
        byPaymentMethod: [],
        repairs: { total: 0, count: 0 },
        returns: { total: 0, count: 0, rows: [] as ReturnRow[] },
        expenses: { total: 0, rows: [] as ExpenseAgg[] },
        totals: {
          sales: 0,
          repairs: 0,
          returns: 0,
          expenses: 0,
          net: 0,
          itemsSold: 0,
        },
      };
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = session.id as string;
    const openedAt = session.opened_at as string;

    // ---- Sales for this session ----
    const { data: sales } = await admin
      .from("sales")
      .select("id, total_amount, payment_method")
      .eq("session_id", sessionId);

    const saleIds = (sales || []).map((s) => s.id as string);

    // sale_items for those sales
    let saleItems: { sale_id: string; product_id: string | null; quantity: number; unit_price: number }[] = [];
    if (saleIds.length) {
      const { data: items } = await admin
        .from("sale_items")
        .select("sale_id, product_id, quantity, unit_price")
        .in("sale_id", saleIds);
      saleItems = (items as any[]) || [];
    }

    // Resolve product -> category names
    const productIds = [...new Set(saleItems.map((i) => i.product_id).filter(Boolean))] as string[];
    const productCat = new Map<string, string | null>();
    if (productIds.length) {
      const { data: products } = await admin
        .from("products")
        .select("id, category_id")
        .in("id", productIds);
      const catIds = [...new Set((products || []).map((p) => p.category_id).filter(Boolean))] as string[];
      const catName = new Map<string, string>();
      if (catIds.length) {
        const { data: cats } = await admin.from("categories").select("id, name").in("id", catIds);
        (cats || []).forEach((c) => catName.set(c.id as string, c.name as string));
      }
      (products || []).forEach((p) => {
        const cid = p.category_id as string | null;
        productCat.set(p.id as string, cid ? catName.get(cid) || "Sans catégorie" : "Sans catégorie");
      });
    }

    // ---- Aggregate by category + total items ----
    const catMap = new Map<string, CategoryAgg>();
    let itemsSold = 0;
    for (const it of saleItems) {
      const cat = (it.product_id && productCat.get(it.product_id)) || "Sans catégorie";
      const line = Number(it.unit_price || 0) * Number(it.quantity || 0);
      const qty = Number(it.quantity || 0);
      itemsSold += qty;
      const agg = catMap.get(cat) || { category: cat, revenue: 0, items: 0 };
      agg.revenue += line;
      agg.items += qty;
      catMap.set(cat, agg);
    }
    const byCategory = [...catMap.values()].sort((a, b) => b.revenue - a.revenue);

    // ---- Aggregate by payment method (sales only) ----
    const payMap = new Map<string, PaymentAgg>();
    let salesTotal = 0;
    for (const s of sales || []) {
      const amt = Number(s.total_amount || 0);
      salesTotal += amt;
      const label = methodLabel(s.payment_method as string);
      const agg = payMap.get(label) || { method: label, revenue: 0, count: 0 };
      agg.revenue += amt;
      agg.count += 1;
      payMap.set(label, agg);
    }
    const byPaymentMethod = [...payMap.values()].sort((a, b) => b.revenue - a.revenue);

    // ---- Repair payments ----
    const { data: repairPays } = await admin
      .from("repair_payments")
      .select("amount")
      .eq("session_id", sessionId);
    const repairsTotal = (repairPays || []).reduce((s, r) => s + Number(r.amount || 0), 0);

    // ---- Returns (no session_id; window by opened_at) ----
    const { data: returns } = await admin
      .from("product_returns")
      .select("product_name, quantity, refund_amount, refund_method")
      .eq("user_id", shopId)
      .gte("created_at", openedAt);
    const returnRows: ReturnRow[] = (returns || []).map((r) => ({
      product_name: (r.product_name as string) || "Article",
      quantity: Number(r.quantity || 0),
      refund_amount: Number(r.refund_amount || 0),
      refund_method: (r.refund_method as string) || null,
    }));
    const returnsTotal = returnRows.reduce((s, r) => s + r.refund_amount, 0);

    // ---- Expenses by category ----
    const { data: expenses } = await admin
      .from("expenses")
      .select("amount, category")
      .eq("session_id", sessionId);
    const expMap = new Map<string, ExpenseAgg>();
    let expensesTotal = 0;
    for (const e of expenses || []) {
      const amt = Number(e.amount || 0);
      expensesTotal += amt;
      const cat = (e.category as string) || "Divers";
      const agg = expMap.get(cat) || { category: cat, amount: 0 };
      agg.amount += amt;
      expMap.set(cat, agg);
    }
    const expenseRows = [...expMap.values()].sort((a, b) => b.amount - a.amount);

    const net = salesTotal + repairsTotal - expensesTotal;

    const report = {
      sessionId,
      openedAt,
      byCategory,
      byPaymentMethod,
      repairs: { total: repairsTotal, count: (repairPays || []).length },
      returns: { total: returnsTotal, count: returnRows.length, rows: returnRows },
      expenses: { total: expensesTotal, rows: expenseRows },
      totals: {
        sales: salesTotal,
        repairs: repairsTotal,
        returns: returnsTotal,
        expenses: expensesTotal,
        net,
        itemsSold,
      },
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-closing-report error:", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
