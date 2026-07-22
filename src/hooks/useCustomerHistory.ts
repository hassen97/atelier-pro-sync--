import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCustomerHistory(customerId: string | undefined) {
  const { user } = useAuth();

  const repairs = useQuery({
    queryKey: ["customer-repairs", customerId],
    queryFn: async () => {
      if (!user || !customerId) return [];
      const { data, error } = await supabase
        .from("repairs")
        .select("id, device_model, problem_description, status, total_cost, amount_paid, deposit_date, delivery_date")
        .eq("user_id", user.id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!customerId,
  });

  const sales = useQuery({
    queryKey: ["customer-sales", customerId],
    queryFn: async () => {
      if (!user || !customerId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("id, total_amount, amount_paid, payment_method, created_at, sale_items(id)")
        .eq("user_id", user.id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!customerId,
  });

  const warranties = useQuery({
    queryKey: ["customer-warranties", customerId],
    queryFn: async () => {
      if (!user || !customerId) return [];
      // Get warranty tickets linked to this customer's repairs
      const { data, error } = await supabase
        .from("warranty_tickets")
        .select("id, status, return_reason, total_cost, created_at, original_repair_id")
        .eq("user_id", user.id)
        .in("status", ["pending", "in_progress"]);
      if (error) throw error;
      
      // Filter by customer's repairs
      const repairIds = (repairs.data || []).map(r => r.id);
      return (data || []).filter(w => repairIds.includes(w.original_repair_id));
    },
    enabled: !!user && !!customerId && !!repairs.data,
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
