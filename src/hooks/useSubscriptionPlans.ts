import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parsePlanFeatures } from "@/hooks/usePlanPermissions";

export interface PlanFeatureRaw {
  display?: string[];
  modules?: Record<string, boolean>;
  limits?: Record<string, number>;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string | null;
  features: string[] | PlanFeatureRaw;
  highlight: boolean;
  sort_order: number;
  is_active: boolean;
}

/** Parse a plan's features to a display-friendly string array */
export function getPlanDisplayFeatures(plan: SubscriptionPlan): string[] {
  const raw = plan.features;
  if (Array.isArray(raw)) return raw;
  const parsed = parsePlanFeatures(raw);
  return parsed.display;
}

export function usePublicPlans() {
  return useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((p: any) => {
        let features = p.features;
        if (typeof features === "string") {
          try { features = JSON.parse(features); } catch { features = []; }
        }
        return { ...p, features } as SubscriptionPlan;
      });
    },
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-plans" },
      });
      if (error) throw error;
      return data as { plans: SubscriptionPlan[] };
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update-plan", plan },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["public-subscription-plans"] });
      toast.success("Plan mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}
