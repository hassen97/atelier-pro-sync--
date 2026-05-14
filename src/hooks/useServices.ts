import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export type ServiceRow = {
  id: string;
  name: string;
  type: "service" | "tool_rental";
  category: string;
  price: number;
  currency: string | null;
  description: string | null;
  is_active: boolean;
  requires_imei: boolean;
  requires_model: boolean;
  extra_fields: Array<{ key: string; label: string; required?: boolean }>;
  created_at: string;
  updated_at: string;
};

export const SERVICE_CATEGORIES = [
  { value: "frp", label: "FRP Bypass" },
  { value: "kg", label: "KG Bypass" },
  { value: "mdm", label: "MDM Bypass" },
  { value: "tool", label: "Tool Rental" },
  { value: "other", label: "Autre" },
] as const;

export function useServices(opts: { adminMode?: boolean } = {}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["services", opts.adminMode ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("services").select("*").order("category").order("name");
      if (!opts.adminMode) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ServiceRow[];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("services-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
        qc.invalidateQueries({ queryKey: ["services"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useUpsertService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (svc: Partial<ServiceRow> & { name: string }) => {
      const payload = {
        name: svc.name,
        type: svc.type ?? "service",
        category: svc.category ?? "other",
        price: Number(svc.price ?? 0),
        description: svc.description ?? null,
        is_active: svc.is_active ?? true,
        requires_imei: !!svc.requires_imei,
        requires_model: !!svc.requires_model,
        extra_fields: svc.extra_fields ?? [],
      };
      if (svc.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", svc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service enregistré");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useToggleService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
      return is_active;
    },
    onSuccess: (is_active) => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(is_active ? "Service activé — visible par les boutiques" : "Service désactivé — masqué côté boutiques");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service supprimé");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}
