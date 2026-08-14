import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";

export interface DashboardStats {
  salesTotal: number;
  salesThisMonth: number;
  salesLastMonth: number;
  salesTrendPct: number | null;
  repairsInProgress: number;
  repairsCompleted: number;
  repairsPending: number;
  stockAlerts: number;
  customerDebts: number;
  supplierDebts: number;
  totalProducts: number;
  totalCustomers: number;
}

const EMPTY_STATS: DashboardStats = {
  salesTotal: 0,
  salesThisMonth: 0,
  salesLastMonth: 0,
  salesTrendPct: null,
  repairsInProgress: 0,
  repairsCompleted: 0,
  repairsPending: 0,
  stockAlerts: 0,
  customerDebts: 0,
  supplierDebts: 0,
  totalProducts: 0,
  totalCustomers: 0,
};

export function useDashboardStats() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["dashboard-stats", effectiveUserId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!effectiveUserId) return EMPTY_STATS;

      // Single-round-trip aggregate call — replaces 6 full-table scans
      // that were previously done client-side every 30 seconds.
      const { data, error } = await supabase.rpc("dashboard_stats" as any, {
        _shop_id: effectiveUserId,
      });
      if (error) throw error;

      const d = (data ?? {}) as Record<string, any>;
      const salesThisMonth = Number(d.salesThisMonth) || 0;
      const salesLastMonth = Number(d.salesLastMonth) || 0;
      const salesTrendPct =
        salesLastMonth > 0
          ? ((salesThisMonth - salesLastMonth) / salesLastMonth) * 100
          : salesThisMonth > 0
          ? 100
          : null;

      return {
        salesTotal: Number(d.salesTotal) || 0,
        salesThisMonth,
        salesLastMonth,
        salesTrendPct,
        repairsInProgress: Number(d.repairsInProgress) || 0,
        repairsCompleted: Number(d.repairsCompleted) || 0,
        repairsPending: Number(d.repairsPending) || 0,
        stockAlerts: Number(d.stockAlerts) || 0,
        customerDebts: Number(d.customerDebts) || 0,
        supplierDebts: Number(d.supplierDebts) || 0,
        totalProducts: Number(d.totalProducts) || 0,
        totalCustomers: Number(d.totalCustomers) || 0,
      };
    },
    enabled: !!effectiveUserId,
    refetchInterval: 30000,
  });
}

export function useRecentRepairs(limit = 5) {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["recent-repairs", effectiveUserId, limit],
    queryFn: async () => {
      if (!effectiveUserId) return [];

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
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

export function useLowStockAlerts(limit = 5) {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["low-stock-alerts", effectiveUserId, limit],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, quantity, min_quantity")
        .eq("user_id", effectiveUserId)
        .order("quantity", { ascending: true })
        .limit(20);

      if (error) throw error;

      return (data || [])
        .filter((p) => p.quantity <= p.min_quantity)
        .slice(0, limit);
    },
    enabled: !!effectiveUserId,
  });
}
