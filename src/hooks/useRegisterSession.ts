import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useIsOwner, useMyTeamInfo } from "@/hooks/useTeam";
import { toast } from "sonner";

export interface SessionTotals {
  sales: number;
  repairs: number;
  expenses: number;
  net: number;
}

/**
 * Returns the currently open register session for the shop, creating one if
 * none exists. The shop is identified by the effective (owner) user id.
 */
export function useOpenSession() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["register-session", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      const { data: sessionId, error: rpcError } = await supabase.rpc(
        "get_or_create_open_session",
        { _shop_id: effectiveUserId }
      );
      if (rpcError) throw rpcError;

      const { data, error } = await supabase
        .from("register_sessions")
        .select("*")
        .eq("id", sessionId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });
}

/**
 * Live totals for the currently open session: merchandise sales, repair
 * payments collected, and expenses recorded during the session.
 */
export function useSessionTotals() {
  const effectiveUserId = useEffectiveUserId();
  const { data: session } = useOpenSession();
  const sessionId = session?.id ?? null;

  return useQuery({
    queryKey: ["session-totals", effectiveUserId, sessionId],
    queryFn: async (): Promise<SessionTotals> => {
      if (!effectiveUserId || !sessionId) {
        return { sales: 0, repairs: 0, expenses: 0, net: 0 };
      }

      const [salesRes, repairsRes, expensesRes] = await Promise.all([
        supabase
          .from("sales")
          .select("total_amount")
          .eq("user_id", effectiveUserId)
          .eq("session_id", sessionId),
        supabase
          .from("repair_payments")
          .select("amount")
          .eq("user_id", effectiveUserId)
          .eq("session_id", sessionId),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", effectiveUserId)
          .eq("session_id", sessionId),
      ]);

      if (salesRes.error) throw salesRes.error;
      if (repairsRes.error) throw repairsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const sales = (salesRes.data || []).reduce(
        (sum, s) => sum + Number(s.total_amount || 0),
        0
      );
      const repairs = (repairsRes.data || []).reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      );
      const expenses = (expensesRes.data || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );

      return { sales, repairs, expenses, net: sales + repairs - expenses };
    },
    enabled: !!effectiveUserId && !!sessionId,
    refetchInterval: 30_000,
  });
}

/**
 * Closes the current open session and immediately opens a fresh one,
 * resetting the running totals to zero.
 */
export function useCloseSession() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async () => {
      if (!effectiveUserId) throw new Error("Non authentifié");
      const { data, error } = await supabase.rpc("close_register_session", {
        _shop_id: effectiveUserId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["register-session"] });
      queryClient.invalidateQueries({ queryKey: ["session-totals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
    },
    onError: (error) => {
      console.error("Error closing register session:", error);
      toast.error("Erreur lors de la clôture de caisse");
    },
  });
}

/**
 * Only the shop owner (super_admin) or a team member with the "admin" role
 * may close the register.
 */
export function useCanCloseRegister(): boolean {
  const { data: isOwner } = useIsOwner();
  const { data: teamInfo } = useMyTeamInfo();
  return Boolean(isOwner) || teamInfo?.role === "admin";
}
