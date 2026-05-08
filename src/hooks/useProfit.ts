import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export type ProfitPeriod = string | { from: Date; to: Date };

export function useProfit(period: ProfitPeriod = "month") {
  const { user } = useAuth();

  const isCustom = typeof period !== "string";
  const customKey = isCustom ? `${(period as any).from.toISOString()}_${(period as any).to.toISOString()}` : period;

  return useQuery({
    queryKey: ["profit", user?.id, customKey],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;
      let prevStartDate: Date;
      let prevEndDate: Date;

      if (isCustom) {
        const { from, to } = period as { from: Date; to: Date };
        startDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        endDate = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
        const lengthMs = endDate.getTime() - startDate.getTime();
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - lengthMs);
      } else {
        switch (period) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            prevEndDate = new Date(startDate.getTime() - 1);
            break;
          case "quarter":
            startDate = subMonths(now, 3);
            prevStartDate = subMonths(startDate, 3);
            prevEndDate = new Date(startDate.getTime() - 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
            prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
            break;
          default: // month
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            prevStartDate = startOfMonth(subMonths(now, 1));
            prevEndDate = endOfMonth(subMonths(now, 1));
        }
      }

      // Get current period sales + returns
      const [salesRes, returnsRes] = await Promise.all([
        supabase
          .from("sales")
          .select(`
            id,
            total_amount,
            sale_items(quantity, unit_price, product_id)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("product_returns")
          .select("id, refund_amount")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
      ]);

      if (salesRes.error) throw salesRes.error;
      const sales = salesRes.data;
      const totalRefunds = (returnsRes.data || []).reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);

      // Get previous period sales for comparison
      const { data: prevSales, error: prevSalesError } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("user_id", user.id)
        .gte("created_at", prevStartDate.toISOString())
        .lte("created_at", prevEndDate.toISOString());

      if (prevSalesError) throw prevSalesError;

      // Get repairs
      const { data: repairs, error: repairsError } = await supabase
        .from("repairs")
        .select("id, total_cost, labor_cost, parts_cost, problem_description")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (repairsError) throw repairsError;

      // Get previous period repairs
      const { data: prevRepairs, error: prevRepairsError } = await supabase
        .from("repairs")
        .select("total_cost")
        .eq("user_id", user.id)
        .gte("created_at", prevStartDate.toISOString())
        .lte("created_at", prevEndDate.toISOString());

      if (prevRepairsError) throw prevRepairsError;

      // Get expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("id, amount, category")
        .eq("user_id", user.id)
        .gte("expense_date", startDate.toISOString().split("T")[0])
        .lte("expense_date", endDate.toISOString().split("T")[0]);

      if (expensesError) throw expensesError;

      // Get products for cost calculation
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, cost_price, sell_price")
        .eq("user_id", user.id);

      if (productsError) throw productsError;

      // Calculate revenue
      const salesRevenue = (sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0) - totalRefunds;
      const repairsRevenue = repairs?.reduce((sum, r) => sum + Number(r.total_cost), 0) || 0;
      const totalRevenue = salesRevenue + repairsRevenue;

      // Calculate previous revenue
      const prevSalesRevenue = prevSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      const prevRepairsRevenue = prevRepairs?.reduce((sum, r) => sum + Number(r.total_cost), 0) || 0;
      const prevTotalRevenue = prevSalesRevenue + prevRepairsRevenue;

      // Calculate cost of goods sold from sales
      let stockCost = 0;
      sales?.forEach(sale => {
        sale.sale_items?.forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          if (product) {
            stockCost += item.quantity * Number(product.cost_price);
          }
        });
      });

      // Add parts cost from repairs
      const partsCost = repairs?.reduce((sum, r) => sum + Number(r.parts_cost), 0) || 0;
      stockCost += partsCost;

      // Calculate expenses by category
      const fixedExpenses = expenses
        ?.filter(e => ["Loyer", "Électricité", "Salaires", "Internet", "Assurance"].includes(e.category))
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const otherExpenses = expenses
        ?.filter(e => !["Loyer", "Électricité", "Salaires", "Internet", "Assurance", "Achat stock", "Fournisseurs"].includes(e.category))
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const totalExpenses = stockCost + fixedExpenses + otherExpenses;
      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // Calculate revenue trend
      const revenueTrend = prevTotalRevenue > 0 
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
        : 0;

      // Calculate profit trend (using previous period's estimated profit)
      const prevProfit = prevTotalRevenue * 0.4; // Estimate based on typical margin
      const profitTrend = prevProfit > 0 
        ? ((profit - prevProfit) / prevProfit) * 100 
        : 0;

      // Product margins
      const productMargins = products
        ?.map(p => ({
          name: p.name,
          cost: Number(p.cost_price),
          price: Number(p.sell_price),
          margin: Number(p.cost_price) > 0 
            ? ((Number(p.sell_price) - Number(p.cost_price)) / Number(p.cost_price)) * 100 
            : 0,
          sales: sales?.reduce((sum, sale) => {
            const item = sale.sale_items?.find((i: any) => i.product_id === p.id);
            return sum + (item?.quantity || 0);
          }, 0) || 0,
        }))
        .filter(p => p.sales > 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5) || [];

      // Repair margins by type
      const repairTypes: Record<string, { revenue: number; cost: number; count: number }> = {};
      repairs?.forEach(repair => {
        const desc = repair.problem_description?.toLowerCase() || "";
        let type = "Autre réparation";
        if (desc.includes("écran") || desc.includes("ecran")) type = "Remplacement écran";
        else if (desc.includes("batterie")) type = "Remplacement batterie";
        else if (desc.includes("charge") || desc.includes("port")) type = "Réparation port charge";
        else if (desc.includes("caméra") || desc.includes("camera")) type = "Réparation caméra";

        if (!repairTypes[type]) {
          repairTypes[type] = { revenue: 0, cost: 0, count: 0 };
        }
        repairTypes[type].revenue += Number(repair.total_cost);
        repairTypes[type].cost += Number(repair.parts_cost);
        repairTypes[type].count++;
      });

      const repairMargins = Object.entries(repairTypes)
        .map(([type, data]) => ({
          type,
          avgRevenue: data.count > 0 ? data.revenue / data.count : 0,
          avgCost: data.count > 0 ? data.cost / data.count : 0,
          margin: data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      return {
        revenue: {
          sales: salesRevenue,
          repairs: repairsRevenue,
          total: totalRevenue,
        },
        expenses: {
          stock: stockCost,
          fixed: fixedExpenses,
          other: otherExpenses,
          total: totalExpenses,
        },
        profit,
        profitMargin,
        revenueTrend,
        profitTrend,
        productMargins,
        repairMargins,
      };
    },
    enabled: !!user,
  });
}
