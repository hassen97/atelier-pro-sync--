import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ServiceRequestRow } from "./useServiceRequests";

export type AdminServiceRequest = ServiceRequestRow & {
  shop_name?: string | null;
  shop_phone?: string | null;
  shop_whatsapp?: string | null;
  owner_full_name?: string | null;
};

export function useAdminServiceRequests() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-service-requests"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const list = (rows || []) as ServiceRequestRow[];
      const shopIds = Array.from(new Set(list.map((r) => r.shop_id)));
      if (!shopIds.length) return [] as AdminServiceRequest[];

      const [{ data: shops }, { data: profs }] = await Promise.all([
        supabase.from("shop_settings").select("user_id, shop_name, phone, whatsapp_phone").in("user_id", shopIds),
        supabase.from("profiles").select("user_id, full_name").in("user_id", shopIds),
      ]);
      const shopMap = new Map((shops || []).map((s: any) => [s.user_id, s]));
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));

      return list.map((r) => {
        const s = shopMap.get(r.shop_id);
        const p = profMap.get(r.shop_id);
        return {
          ...r,
          shop_name: s?.shop_name ?? null,
          shop_phone: s?.phone ?? null,
          shop_whatsapp: s?.whatsapp_phone ?? null,
          owner_full_name: p?.full_name ?? null,
        } as AdminServiceRequest;
      });
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-svc-req")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
        qc.invalidateQueries({ queryKey: ["admin-pending-svc-count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function usePendingServiceRequestCount() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-pending-svc-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-pending-svc")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-pending-svc-count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useUpdateServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: AdminServiceRequest["status"];
      admin_note?: string | null;
      result_data?: Record<string, any>;
    }) => {
      const patch: any = {};
      if (input.status) patch.status = input.status;
      if (input.admin_note !== undefined) patch.admin_note = input.admin_note;
      if (input.result_data !== undefined) patch.result_data = input.result_data;
      const { error } = await supabase.from("service_requests").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-svc-count"] });
      toast.success("Demande mise à jour");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}
