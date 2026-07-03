import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentGateway {
  id: string;
  gateway_key: string;
  gateway_name: string;
  description: string | null;
  is_enabled: boolean;
  config?: Record<string, string> | null;
}

export function usePaymentGateways() {
  return useQuery({
    queryKey: ["admin-payment-gateways"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-payment-gateways" },
      });
      if (error) throw error;
      return data as { gateways: PaymentGateway[] };
    },
  });
}

export function useToggleGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gatewayId, enabled }: { gatewayId: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "toggle-payment-gateway", gatewayId, enabled },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
      toast.success("Passerelle mise à jour");
    },
    onError: () => toast.error("Erreur"),
  });
}

export function useUpdateGatewayConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gatewayId, config }: { gatewayId: string; config: Record<string, string> }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update-gateway-config", gatewayId, gatewayConfig: config },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
      toast.success("Configuration sauvegardée");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
}
