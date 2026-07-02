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

export interface ClosingReportCategory {
  category: string;
  revenue: number;
  items: number;
}
export interface ClosingReportPayment {
  method: string;
  revenue: number;
  count: number;
}
export interface ClosingReportReturn {
  product_name: string;
  quantity: number;
  refund_amount: number;
  refund_method: string | null;
}
export interface ClosingReportExpense {
  category: string;
  amount: number;
}
export interface ClosingReportProduct {
  product_name: string;
  quantity: number;
  revenue: number;
}
export interface ClosingReportRepair {
  label: string;
  customer: string | null;
  amount: number;
}
export interface ClosingReport {
  sessionId: string | null;
  openedAt: string | null;
  byCategory: ClosingReportCategory[];
  byProduct: ClosingReportProduct[];
  byPaymentMethod: ClosingReportPayment[];
  repairs: { total: number; count: number; rows: ClosingReportRepair[] };
  returns: { total: number; count: number; rows: ClosingReportReturn[] };
  expenses: { total: number; rows: ClosingReportExpense[] };
  totals: {
    sales: number;
    repairs: number;
    returns: number;
    expenses: number;
    net: number;
    itemsSold: number;
  };
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
 * Fetches the detailed closing report for the currently open session via the
 * `generate-closing-report` edge function. Used to power the preview modal and
 * the PDF/thermal exports before the session is actually closed.
 */
export function useClosingReport(enabled = true) {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["closing-report", effectiveUserId],
    queryFn: async (): Promise<ClosingReport> => {
      const { data, error } = await supabase.functions.invoke(
        "generate-closing-report",
        { body: { shop_id: effectiveUserId } }
      );
      if (error) throw error;
      return data as ClosingReport;
    },
    enabled: enabled && !!effectiveUserId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Closes the current open session and immediately opens a fresh one,
 * resetting the running totals to zero. Persists the detailed report snapshot
 * and the name of the employee who performed the closing.
 */
export function useCloseSession() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (args?: { report?: ClosingReport | null }) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      // Resolve the closing employee's display name from the logged-in account.
      let closedByName: string | null = null;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", uid)
          .maybeSingle();
        closedByName = profile?.full_name || auth?.user?.email || null;
      }

      const { data, error } = await supabase.rpc("close_register_session", {
        _shop_id: effectiveUserId,
        _report: (args?.report ?? null) as any,
        _closed_by_name: closedByName,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["register-session"] });
      queryClient.invalidateQueries({ queryKey: ["session-totals"] });
      queryClient.invalidateQueries({ queryKey: ["closing-report"] });
      queryClient.invalidateQueries({ queryKey: ["register-history"] });
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

export interface RegisterHistoryRow {
  id: string;
  closed_at: string | null;
  snapshot_ventes: number;
  snapshot_reparations: number;
  snapshot_depenses: number;
  snapshot_net: number;
  report_data: ClosingReport | null;
  closed_by_name: string | null;
}

/**
 * Lists all closed register sessions for the shop, newest first. The four
 * snapshot_* columns hold the totals locked in at closing time, so reprinted
 * Z-Reports never change even if past transactions are edited. RLS scopes
 * rows to the shop; we also filter on shop_id for consistency.
 */
export function useRegisterHistory() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["register-history", effectiveUserId],
    queryFn: async (): Promise<RegisterHistoryRow[]> => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("register_sessions")
        .select(
          "id, closed_at, snapshot_ventes, snapshot_reparations, snapshot_depenses, snapshot_net, report_data, closed_by_name"
        )
        .eq("shop_id", effectiveUserId)
        .eq("status", "closed")
        .order("closed_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id as string,
        closed_at: r.closed_at as string | null,
        snapshot_ventes: Number(r.snapshot_ventes || 0),
        snapshot_reparations: Number(r.snapshot_reparations || 0),
        snapshot_depenses: Number(r.snapshot_depenses || 0),
        snapshot_net: Number(r.snapshot_net || 0),
        report_data: (r as any).report_data ?? null,
        closed_by_name: ((r as any).closed_by_name as string | null) ?? null,
      }));
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });
}
