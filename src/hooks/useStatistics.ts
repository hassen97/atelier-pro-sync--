import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export function useStatistics(period: string = "month") {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["statistics", effectiveUserId, period],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = subMonths(now, 3);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      // ONE server-side aggregate call (was: 3 unbounded fetches + O(items×products)
      // client-side loops). The monthly series always covers the last 6 months.
      const { data, error } = await supabase.rpc("statistics_report" as any, {
        _shop_id: effectiveUserId,
        _start: startDate.toISOString(),
        _end: endDate.toISOString(),
      });
      if (error) throw error;

      const d = (data ?? {}) as Record<string, any>;
      const totals = d.totals ?? {};
      const refunds = Number(totals.refundsTotal) || 0;

      const monthlyData = (d.monthly ?? []).map((m: any) => ({
        month: format(new Date(m.month_start), "MMM"),
        ventes: Number(m.ventes) || 0,
        réparations: Number(m.reparations) || 0,
      }));

      const topProducts = (d.top_products ?? []).map((p: any) => ({
        name: p.name,
        sales: Number(p.sales) || 0,
        revenue: Number(p.revenue) || 0,
      }));

      const categoryRevenue = (d.category_revenue ?? []) as { name: string; revenue: number }[];
      const totalCategoryRevenue = categoryRevenue.reduce(
        (sum, c) => sum + (Number(c.revenue) || 0), 0
      );
      const colors = ["hsl(217, 91%, 40%)", "hsl(187, 72%, 41%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(280, 70%, 50%)"];
      const categoryData = categoryRevenue
        .map((c, index) => ({
          name: c.name,
          value: totalCategoryRevenue > 0 ? Math.round(((Number(c.revenue) || 0) / totalCategoryRevenue) * 100) : 0,
          color: colors[index % colors.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const repairStats = (d.repair_types ?? [])
        .slice(0, 5)
        .map((t: any) => ({
          type: t.type,
          count: Number(t.count) || 0,
          trend: Math.floor(Math.random() * 20) - 5, // Simulated trend (kept as-is)
        }));

      return {
        monthlyData,
        topProducts,
        categoryData,
        repairStats,
        totals: {
          salesCount: Number(totals.salesCount) || 0,
          salesRevenue: (Number(totals.salesRevenue) || 0) - refunds,
          repairsCount: Number(totals.repairsCount) || 0,
          repairsRevenue: Number(totals.repairsRevenue) || 0,
        },
      };
    },
    enabled: !!effectiveUserId,
  });
}
