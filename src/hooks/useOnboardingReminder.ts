import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsOwner } from "./useTeam";

/**
 * Returns whether the current shop owner needs the onboarding reminder
 * (banner + modal) on the dashboard.
 */
export function useOnboardingReminder() {
  const { user } = useAuth();
  const { data: isOwner } = useIsOwner();

  const query = useQuery({
    queryKey: ["onboarding-reminder", user?.id],
    enabled: !!user?.id && isOwner === true,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_settings")
        .select("onboarding_completed, shop_name")
        .eq("user_id", user!.id)
        .maybeSingle();

      return {
        needsReminder: data?.onboarding_completed === false,
        shopName: data?.shop_name ?? null,
      };
    },
  });

  return {
    show: isOwner === true && query.data?.needsReminder === true,
    shopName: query.data?.shopName ?? null,
    userId: user?.id,
  };
}
