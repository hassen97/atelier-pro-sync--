import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-subscription-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-subscription-orders" },
      });
      if (error) throw error;
      return data as { orders: any[] };
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status, adminNote }: { orderId: string; status: string; adminNote?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update-subscription-order", orderId, status, adminNote },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-orders"] });
      toast.success("Commande mise à jour");
    },
    onError: () => toast.error("Erreur"),
  });
}
