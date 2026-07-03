import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export function useStatistics(period: string = "month") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["statistics", user?.id, period],
    queryFn: async () => {
      if (!user) return null;

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

      // Get sales data
      const [salesRes, returnsRes] = await Promise.all([
        supabase
          .from("sales")
          .select(`
            id,
            total_amount,
            created_at,
            sale_items(quantity, unit_price, product_id)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("product_returns")
          .select("id, refund_amount, created_at")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
      ]);

      if (salesRes.error) throw salesRes.error;
      const sales = salesRes.data;
      const totalRefunds = (returnsRes.data || []).reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);

      // Get repairs data
      const { data: repairs, error: repairsError } = await supabase
        .from("repairs")
        .select("id, total_cost, labor_cost, parts_cost, status, problem_description, created_at")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (repairsError) throw repairsError;

      // Get products for category analysis
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          cost_price,
          sell_price,
          category:categories(id, name)
        `)
        .eq("user_id", user.id);

      if (productsError) throw productsError;

      // Calculate monthly data for chart (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthName = format(monthStart, "MMM");

        const monthlySales = sales?.filter(s => {
          const date = new Date(s.created_at);
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

        const monthlyRepairs = repairs?.filter(r => {
          const date = new Date(r.created_at);
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, r) => sum + Number(r.total_cost), 0) || 0;

        monthlyData.push({
          month: monthName,
          ventes: monthlySales,
          réparations: monthlyRepairs,
        });
      }

      // Calculate top products from sale_items
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      sales?.forEach(sale => {
        sale.sale_items?.forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          if (product) {
            if (!productSales[product.id]) {
              productSales[product.id] = { name: product.name, sales: 0, revenue: 0 };
            }
            productSales[product.id].sales += item.quantity;
            productSales[product.id].revenue += item.quantity * Number(item.unit_price);
          }
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // Calculate category distribution
      const categoryRevenue: Record<string, number> = {};
      sales?.forEach(sale => {
        sale.sale_items?.forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          const categoryName = product?.category?.name || "Sans catégorie";
          categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + item.quantity * Number(item.unit_price);
        });
      });

      const totalCategoryRevenue = Object.values(categoryRevenue).reduce((sum, val) => sum + val, 0);
      const colors = ["hsl(217, 91%, 40%)", "hsl(187, 72%, 41%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(280, 70%, 50%)"];
      const categoryData = Object.entries(categoryRevenue)
        .map(([name, value], index) => ({
          name,
          value: totalCategoryRevenue > 0 ? Math.round((value / totalCategoryRevenue) * 100) : 0,
          color: colors[index % colors.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Calculate repair stats by problem type
      const repairTypes: Record<string, { count: number }> = {};
      repairs?.forEach(repair => {
        const desc = repair.problem_description?.toLowerCase() || "";
        let type = "Autre";
        if (desc.includes("écran") || desc.includes("ecran")) type = "Écran";
        else if (desc.includes("batterie")) type = "Batterie";
        else if (desc.includes("charge") || desc.includes("port")) type = "Port charge";
        else if (desc.includes("caméra") || desc.includes("camera")) type = "Caméra";
        else if (desc.includes("haut-parleur") || desc.includes("speaker")) type = "Haut-parleur";
        
        repairTypes[type] = repairTypes[type] || { count: 0 };
        repairTypes[type].count++;
      });

      const repairStats = Object.entries(repairTypes)
        .map(([type, data]) => ({
          type,
          count: data.count,
          trend: Math.floor(Math.random() * 20) - 5, // Simulated trend
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        monthlyData,
        topProducts,
        categoryData,
        repairStats,
        totals: {
          salesCount: sales?.length || 0,
          salesRevenue: (sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0) - totalRefunds,
          repairsCount: repairs?.length || 0,
          repairsRevenue: repairs?.reduce((sum, r) => sum + Number(r.total_cost), 0) || 0,
        },
      };
    },
    enabled: !!user,
  });
}
