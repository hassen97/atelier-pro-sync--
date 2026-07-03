import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReportRange = "1m" | "3m" | "6m" | "1y";

export interface ReportKpis {
  totalRevenue: number;
  totalRepairs: number;
  avgTicket: number;
  activeShops: number;
  revenueTrend: string; // e.g. "+8.4%"
  repairsTrend: string;
}

export interface RevenuePoint {
  month: string;       // "Apr"
  monthIso: string;    // "2026-04"
  revenue: number;
  repairs: number;
}

export interface RepairTypeRow {
  type: string;
  count: number;
  revenue: number;
}

export interface DeviceMixRow {
  name: "Mobile" | "Laptop" | "Tablette" | "Autre";
  value: number; // percent (rounded)
  count: number;
  color: string;
}

export interface TopShopRow {
  rank: number;
  user_id: string;
  name: string;
  city: string;
  repairs: number;
  revenue: number;
  growth: string;
  status: "active" | "pending" | "suspended";
}

export interface AdminReportsData {
  kpis: ReportKpis;
  revenueSeries: RevenuePoint[];
  repairTypes: RepairTypeRow[];
  topShops: TopShopRow[];
  deviceMix: DeviceMixRow[];
  rangeLabel: string;
}

const DEVICE_COLORS: Record<DeviceMixRow["name"], string> = {
  Mobile:   "#00D4FF",
  Laptop:   "#6366F1",
  Tablette: "#F59E0B",
  Autre:    "#94A3B8",
};

const RANGE_LABELS: Record<ReportRange, string> = {
  "1m": "1 mois",
  "3m": "3 mois",
  "6m": "6 mois",
  "1y": "1 an",
};

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function rangeStart(range: ReportRange): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "1m": d.setMonth(d.getMonth() - 1); break;
    case "3m": d.setMonth(d.getMonth() - 3); break;
    case "6m": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
  }
  return d;
}

function classifyDevice(model: string | null | undefined): DeviceMixRow["name"] {
  if (!model) return "Autre";
  const m = model.toLowerCase();
  if (/(macbook|laptop|notebook|portable|pc\b|thinkpad|asus|hp|dell|lenovo)/.test(m)) return "Laptop";
  if (/(ipad|tab\b|tablet|tablette|galaxy tab|matepad)/.test(m)) return "Tablette";
  if (/(iphone|samsung|xiaomi|redmi|huawei|oppo|realme|infinix|tecno|vivo|pixel|phone|mobile|gsm|note\b|edge\b)/.test(m)) return "Mobile";
  return "Autre";
}

function pctTrend(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "+0%";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function useAdminReports(range: ReportRange) {
  const { user } = useAuth();

  return useQuery<AdminReportsData>({
    queryKey: ["admin-reports", range],
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const start = rangeStart(range);
      // Previous-period start (same length, immediately before)
      const lengthMs = Date.now() - start.getTime();
      const prevStart = new Date(start.getTime() - lengthMs);
      const startIso = start.toISOString();
      const prevStartIso = prevStart.toISOString();

      // Parallel queries — RLS allows platform_admin to read all rows
      const [salesRes, repairsRes, prevSalesRes, prevRepairsRes, shopsRes, categoriesRes] = await Promise.all([
        supabase
          .from("sales")
          .select("user_id, total_amount, amount_paid, created_at")
          .gte("created_at", startIso),
        supabase
          .from("repairs")
          .select("user_id, amount_paid, total_cost, device_model, category_id, created_at, status")
          .gte("created_at", startIso),
        supabase
          .from("sales")
          .select("total_amount")
          .gte("created_at", prevStartIso)
          .lt("created_at", startIso),
        supabase
          .from("repairs")
          .select("amount_paid, id")
          .gte("created_at", prevStartIso)
          .lt("created_at", startIso),
        supabase
          .from("shop_settings")
          .select("user_id, shop_name, address, country"),
        supabase
          .from("categories")
          .select("id, name"),
      ]);

      const sales = salesRes.data ?? [];
      const repairs = repairsRes.data ?? [];
      const prevSales = prevSalesRes.data ?? [];
      const prevRepairs = prevRepairsRes.data ?? [];
      const shops = shopsRes.data ?? [];
      const categories = categoriesRes.data ?? [];

      // ── KPIs ──
      const salesRevenue = sales.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const repairsRevenue = repairs.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
      const totalRevenue = salesRevenue + repairsRevenue;
      const totalRepairs = repairs.length;
      const avgTicket = totalRepairs > 0 ? repairsRevenue / totalRepairs : 0;
      const activeShopIds = new Set<string>([
        ...sales.map(s => s.user_id),
        ...repairs.map(r => r.user_id),
      ]);
      const activeShops = activeShopIds.size;

      const prevTotalRevenue =
        prevSales.reduce((s, r) => s + (r.total_amount ?? 0), 0) +
        prevRepairs.reduce((s, r) => s + (r.amount_paid ?? 0), 0);

      const kpis: ReportKpis = {
        totalRevenue,
        totalRepairs,
        avgTicket,
        activeShops,
        revenueTrend: pctTrend(totalRevenue, prevTotalRevenue),
        repairsTrend: pctTrend(totalRepairs, prevRepairs.length),
      };

      // ── Monthly revenue series ──
      const monthMap = new Map<string, RevenuePoint>();
      const ensure = (iso: string) => {
        let p = monthMap.get(iso);
        if (!p) {
          const [y, m] = iso.split("-").map(Number);
          p = { monthIso: iso, month: `${MONTHS_FR[m - 1]} ${String(y).slice(2)}`, revenue: 0, repairs: 0 };
          monthMap.set(iso, p);
        }
        return p;
      };
      const monthIso = (d: string) => d.slice(0, 7);
      sales.forEach(s => { ensure(monthIso(s.created_at)).revenue += s.total_amount ?? 0; });
      repairs.forEach(r => {
        const p = ensure(monthIso(r.created_at));
        p.revenue += r.amount_paid ?? 0;
        p.repairs += 1;
      });
      const revenueSeries = Array.from(monthMap.values()).sort((a, b) =>
        a.monthIso.localeCompare(b.monthIso),
      );

      // ── Repair types ──
      const catName = new Map(categories.map(c => [c.id, c.name]));
      const typeMap = new Map<string, RepairTypeRow>();
      repairs.forEach(r => {
        const key = (r.category_id && catName.get(r.category_id)) || "Autre";
        const row = typeMap.get(key) ?? { type: key, count: 0, revenue: 0 };
        row.count += 1;
        row.revenue += r.amount_paid ?? 0;
        typeMap.set(key, row);
      });
      const repairTypes = Array.from(typeMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // ── Device mix ──
      const deviceCount: Record<DeviceMixRow["name"], number> = { Mobile: 0, Laptop: 0, Tablette: 0, Autre: 0 };
      repairs.forEach(r => { deviceCount[classifyDevice(r.device_model)] += 1; });
      const deviceTotal = Object.values(deviceCount).reduce((a, b) => a + b, 0) || 1;
      const deviceMix: DeviceMixRow[] = (Object.keys(deviceCount) as DeviceMixRow["name"][])
        .map(name => ({
          name,
          count: deviceCount[name],
          value: Math.round((deviceCount[name] / deviceTotal) * 100),
          color: DEVICE_COLORS[name],
        }))
        .filter(d => d.count > 0);

      // ── Top shops ──
      const shopMap = new Map(shops.map(s => [s.user_id, s]));
      const perShop = new Map<string, { user_id: string; revenue: number; repairs: number }>();
      sales.forEach(s => {
        const cur = perShop.get(s.user_id) ?? { user_id: s.user_id, revenue: 0, repairs: 0 };
        cur.revenue += s.total_amount ?? 0;
        perShop.set(s.user_id, cur);
      });
      repairs.forEach(r => {
        const cur = perShop.get(r.user_id) ?? { user_id: r.user_id, revenue: 0, repairs: 0 };
        cur.revenue += r.amount_paid ?? 0;
        cur.repairs += 1;
        perShop.set(r.user_id, cur);
      });

      const topShops: TopShopRow[] = Array.from(perShop.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 12)
        .map((row, i) => {
          const shop = shopMap.get(row.user_id);
          const status: TopShopRow["status"] =
            row.repairs > 0 ? "active" : row.revenue > 0 ? "pending" : "suspended";
          return {
            rank: i + 1,
            user_id: row.user_id,
            name: shop?.shop_name || "Boutique sans nom",
            city: shop?.address || shop?.country || "—",
            repairs: row.repairs,
            revenue: row.revenue,
            growth: "—", // per-shop MoM growth optional; left as placeholder
            status,
          };
        });

      return {
        kpis,
        revenueSeries,
        repairTypes,
        topShops,
        deviceMix,
        rangeLabel: RANGE_LABELS[range],
      };
    },
  });
}
