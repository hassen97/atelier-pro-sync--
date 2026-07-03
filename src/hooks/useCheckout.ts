import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EnabledGateway {
  id: string;
  gateway_key: string;
  gateway_name: string;
  description: string | null;
  config: Record<string, string> | null;
}

export function useEnabledGateways() {
  return useQuery({
    queryKey: ["enabled-payment-gateways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_gateways" as any)
        .select("id, gateway_key, gateway_name, description, config")
        .eq("is_enabled", true);
      if (error) throw error;
      return (data || []) as unknown as EnabledGateway[];
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      gatewayKey,
      amount,
      currency,
      proofFile,
    }: {
      planId: string;
      gatewayKey: string;
      amount: number;
      currency: string;
      proofFile: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload proof screenshot
      const ext = proofFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, proofFile);
      if (uploadError) throw uploadError;

      // Create order
      const { error: insertError } = await supabase
        .from("subscription_orders" as any)
        .insert({
          user_id: user.id,
          plan_id: planId,
          gateway_key: gatewayKey,
          amount,
          currency,
          proof_url: filePath,
        });
      if (insertError) throw insertError;

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription-orders"] });
      toast.success("Commande envoyée ! En attente de vérification par l'administrateur.");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'envoi"),
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["my-subscription-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_orders" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}
