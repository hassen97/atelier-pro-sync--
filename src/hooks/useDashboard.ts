import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  salesTotal: number;
  repairsInProgress: number;
  repairsCompleted: number;
  repairsPending: number;
  stockAlerts: number;
  customerDebts: number;
  supplierDebts: number;
  totalProducts: number;
  totalCustomers: number;
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) {
        return {
          salesTotal: 0,
          repairsInProgress: 0,
          repairsCompleted: 0,
          repairsPending: 0,
          stockAlerts: 0,
          customerDebts: 0,
          supplierDebts: 0,
          totalProducts: 0,
          totalCustomers: 0,
        };
      }

      // Fetch all data in parallel
      const [
        repairsResult,
        productsResult,
        customersResult,
        suppliersResult,
        salesResult,
        returnsResult,
      ] = await Promise.all([
        supabase
          .from("repairs")
          .select("id, status, total_cost")
          .eq("user_id", user.id),
        supabase
          .from("products")
          .select("id, quantity, min_quantity")
          .eq("user_id", user.id),
        supabase
          .from("customers")
          .select("id, balance")
          .eq("user_id", user.id),
        supabase
          .from("suppliers")
          .select("id, balance")
          .eq("user_id", user.id),
        supabase
          .from("sales")
          .select("id, total_amount")
          .eq("user_id", user.id),
        supabase
          .from("product_returns")
          .select("id, refund_amount")
          .eq("user_id", user.id),
      ]);

      const repairs = repairsResult.data || [];
      const products = productsResult.data || [];
      const customers = customersResult.data || [];
      const suppliers = suppliersResult.data || [];
      const sales = salesResult.data || [];
      const returns = returnsResult.data || [];
      const totalRefunds = returns.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);

      // Calculate stats
      const repairsInProgress = repairs.filter(r => r.status === "in_progress").length;
      const repairsCompleted = repairs.filter(r => r.status === "completed" || r.status === "delivered").length;
      const repairsPending = repairs.filter(r => r.status === "pending").length;
      
      const stockAlerts = products.filter(p => p.quantity <= p.min_quantity).length;
      
      const customerDebts = customers.reduce((sum, c) => {
        const balance = Number(c.balance) || 0;
        return sum + (balance < 0 ? Math.abs(balance) : 0);
      }, 0);
      
      const supplierDebts = suppliers.reduce((sum, s) => {
        const balance = Number(s.balance) || 0;
        return sum + (balance < 0 ? Math.abs(balance) : 0);
      }, 0);

      const salesTotal = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) - totalRefunds;

      return {
        salesTotal,
        repairsInProgress,
        repairsCompleted,
        repairsPending,
        stockAlerts,
        customerDebts,
        supplierDebts,
        totalProducts: products.length,
        totalCustomers: customers.length,
      };
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useRecentRepairs(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-repairs", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("repairs")
        .select(`
          id,
          device_model,
          problem_description,
          status,
          total_cost,
          customer:customers(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useLowStockAlerts(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["low-stock-alerts", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity, min_quantity")
        .eq("user_id", user.id)
        .order("quantity", { ascending: true })
        .limit(20);

      if (error) throw error;
      
      // Filter and limit products with low stock
      return (data || [])
        .filter(p => p.quantity <= p.min_quantity)
        .slice(0, limit);
    },
    enabled: !!user,
  });
}
