import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";

export function useCustomerHistory(customerId: string | undefined) {
  const effectiveUserId = useEffectiveUserId();

  const repairs = useQuery({
    queryKey: ["customer-repairs", effectiveUserId, customerId],
    queryFn: async () => {
      if (!effectiveUserId || !customerId) return [];
      const { data, error } = await supabase
        .from("repairs")
        .select("id, device_model, problem_description, status, total_cost, amount_paid, deposit_date, delivery_date")
        .eq("user_id", effectiveUserId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId && !!customerId,
  });

  const sales = useQuery({
    queryKey: ["customer-sales", effectiveUserId, customerId],
    queryFn: async () => {
      if (!effectiveUserId || !customerId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("id, total_amount, amount_paid, payment_method, created_at, sale_items(id)")
        .eq("user_id", effectiveUserId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId && !!customerId,
  });

  const warranties = useQuery({
    queryKey: ["customer-warranties", effectiveUserId, customerId],
    queryFn: async () => {
      if (!effectiveUserId || !customerId) return [];
      // Get warranty tickets linked to this customer's repairs
      const { data, error } = await supabase
        .from("warranty_tickets")
        .select("id, status, return_reason, total_cost, created_at, original_repair_id")
        .eq("user_id", effectiveUserId)
        .in("status", ["pending", "in_progress"]);
      if (error) throw error;
      
      // Filter by customer's repairs
      const repairIds = (repairs.data || []).map(r => r.id);
      return (data || []).filter(w => repairIds.includes(w.original_repair_id));
    },
    enabled: !!effectiveUserId && !!customerId && !!repairs.data,
  });

  const totalRepairSpend = (repairs.data || []).reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
  const totalSalesSpend = (sales.data || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const lifetimeSpend = totalRepairSpend + totalSalesSpend;

  return {
    repairs: repairs.data || [],
    sales: sales.data || [],
    warranties: warranties.data || [],
    lifetimeSpend,
    totalRepairSpend,
    totalSalesSpend,
    isLoading: repairs.isLoading || sales.isLoading,
  };
}
