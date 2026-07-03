import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
}

export interface PlanFeatureFlag {
  plan_id: string;
  feature_flag_id: string;
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-feature-flags" },
      });
      if (error) throw error;
      return data as { flags: FeatureFlag[]; assignments: PlanFeatureFlag[] };
    },
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, featureFlagId, enabled }: { planId: string; featureFlagId: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "toggle-feature-flag", planId, featureFlagId, enabled },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feature-flags"] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}
