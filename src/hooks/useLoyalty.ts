import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  customer_id: string;
  type: "earned" | "redeemed" | "adjustment";
  amount_points: number;
  amount_money: number | null;
  source: string | null;
  sale_id: string | null;
  repair_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/** Fetch a customer's loyalty ledger (most recent first). */
export function useLoyaltyTransactions(customerId: string | undefined) {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["loyalty-transactions", effectiveUserId, customerId],
    queryFn: async () => {
      if (!effectiveUserId || !customerId) return [];
      const { data, error } = await supabase
        .from("loyalty_transactions" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as LoyaltyTransaction[];
    },
    enabled: !!effectiveUserId && !!customerId,
  });
}

interface AdjustParams {
  customer_id: string;
  amount_points: number; // positive or negative
  note?: string;
}

/** Owner-only manual adjustment (positive or negative). */
export function useAdjustLoyaltyPoints() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: AdjustParams) => {
      if (!effectiveUserId || !user) throw new Error("Non authentifié");
      // Server-side: owner-only, bounded, atomic balance + ledger.
      const { data, error } = await supabase.rpc("loyalty_adjust" as any, {
        _customer_id: params.customer_id,
        _points: Math.trunc(Number(params.amount_points) || 0),
        _note: params.note ?? null,
      });
      if (error) throw error;
      return { new_balance: Number(data) || 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      toast.success("Solde de fidélité ajusté");
    },
    onError: (e: any) => {
      console.error("Loyalty adjust error:", e);
      toast.error(e?.message || "Erreur lors de l'ajustement");
    },
  });
}

/**
 * Award points for a sale or repair. Points are computed on the server from
 * the real recorded sale/repair and the shop's earn rate (idempotent).
 */
export async function applyLoyaltyEarn(args: {
  user_id: string;
  customer_id: string;
  amount_money: number;
  earn_rate: number;
  source: "sale" | "repair";
  sale_id?: string;
  repair_id?: string;
  created_by?: string | null;
}): Promise<number> {
  if (args.source === "sale" && args.sale_id) {
    const { data, error } = await supabase.rpc("loyalty_earn_sale" as any, { _sale_id: args.sale_id });
    if (error) { console.error("loyalty earn (sale)", error); return 0; }
    return Number(data) || 0;
  }
  if (args.source === "repair" && args.repair_id) {
    const { data, error } = await supabase.rpc("loyalty_earn_repair" as any, { _repair_id: args.repair_id });
    if (error) { console.error("loyalty earn (repair)", error); return 0; }
    return Number(data) || 0;
  }
  return 0;
}

export async function applyLoyaltyRedeem(args: {
  user_id: string;
  customer_id: string;
  points: number;
  discount_money: number;
  sale_id?: string;
  created_by?: string | null;
}): Promise<number> {
  if (args.points <= 0 || !args.sale_id) return 0;
  const { data, error } = await supabase.rpc("loyalty_redeem" as any, {
    _sale_id: args.sale_id,
    _points: Math.trunc(args.points),
    _discount: args.discount_money ?? 0,
  });
  if (error) { console.error("loyalty redeem", error); return 0; }
  return Number(data) || 0;
}

/** Idempotency check: has this repair already earned points? */
export async function hasRepairEarnedLoyalty(repair_id: string): Promise<boolean> {
  const { data } = await supabase
    .from("loyalty_transactions" as any)
    .select("id")
    .eq("repair_id", repair_id)
    .eq("type", "earned")
    .limit(1)
    .maybeSingle();
  return !!data;
}
