import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ServiceRequestRow = {
  id: string;
  shop_id: string;
  requested_by: string | null;
  service_id: string | null;
  service_name_snapshot: string;
  service_price_snapshot: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  input_data: Record<string, any>;
  admin_note: string | null;
  result_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function useMyServiceRequests() {
  const shopId = useEffectiveUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["service-requests", "shop", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ServiceRequestRow[];
    },
    enabled: !!shopId,
  });

  useEffect(() => {
    if (!shopId) return;
    const ch = supabase
      .channel(`svc-req-${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `shop_id=eq.${shopId}` },
        () => qc.invalidateQueries({ queryKey: ["service-requests", "shop", shopId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId, qc]);

  return query;
}

export function useCreateServiceRequest() {
  const shopId = useEffectiveUserId();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      service_id: string;
      service_name_snapshot: string;
      service_price_snapshot: number;
      input_data: Record<string, any>;
    }) => {
      if (!shopId) throw new Error("Non authentifié");
      const { error } = await supabase.from("service_requests").insert({
        shop_id: shopId,
        requested_by: user?.id ?? null,
        service_id: input.service_id,
        service_name_snapshot: input.service_name_snapshot,
        service_price_snapshot: input.service_price_snapshot,
        input_data: input.input_data,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-requests"] });
      toast.success("Demande envoyée");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useCancelServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-requests"] });
      toast.success("Demande annulée");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}
