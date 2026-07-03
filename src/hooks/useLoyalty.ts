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
      if (!effectiveUserId) throw new Error("Non authentifié");

      // Read current balance
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .select("loyalty_points")
        .eq("id", params.customer_id)
        .single();
      if (cErr) throw cErr;

      const current = (customer as any)?.loyalty_points ?? 0;
      const newBalance = Math.max(0, current + params.amount_points);

      const { error: txErr } = await supabase
        .from("loyalty_transactions" as any)
        .insert({
          user_id: effectiveUserId,
          customer_id: params.customer_id,
          type: "adjustment",
          amount_points: params.amount_points,
          source: "manual",
          note: params.note ?? null,
          created_by: user?.id ?? null,
        });
      if (txErr) throw txErr;

      const { error: uErr } = await supabase
        .from("customers")
        .update({ loyalty_points: newBalance } as any)
        .eq("id", params.customer_id);
      if (uErr) throw uErr;

      return { new_balance: newBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      toast.success("Solde de fidélité ajusté");
    },
    onError: (e: any) => {
      console.error("Loyalty adjust error:", e);
      toast.error("Erreur lors de l'ajustement");
    },
  });
}

/**
 * Internal helper used by sale & repair mutations.
 * Inserts the ledger row and updates the customer's running balance atomically (best-effort).
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
  const points = Math.floor(args.amount_money * args.earn_rate);
  if (points <= 0) return 0;

  const { data: customer } = await supabase
    .from("customers")
    .select("loyalty_points")
    .eq("id", args.customer_id)
    .maybeSingle();
  const current = (customer as any)?.loyalty_points ?? 0;

  await supabase.from("loyalty_transactions" as any).insert({
    user_id: args.user_id,
    customer_id: args.customer_id,
    type: "earned",
    amount_points: points,
    amount_money: args.amount_money,
    source: args.source,
    sale_id: args.sale_id ?? null,
    repair_id: args.repair_id ?? null,
    created_by: args.created_by ?? null,
  });

  await supabase
    .from("customers")
    .update({ loyalty_points: current + points } as any)
    .eq("id", args.customer_id);

  return points;
}

export async function applyLoyaltyRedeem(args: {
  user_id: string;
  customer_id: string;
  points: number;
  discount_money: number;
  sale_id?: string;
  created_by?: string | null;
}): Promise<number> {
  if (args.points <= 0) return 0;

  const { data: customer } = await supabase
    .from("customers")
    .select("loyalty_points")
    .eq("id", args.customer_id)
    .maybeSingle();
  const current = (customer as any)?.loyalty_points ?? 0;
  const newBalance = Math.max(0, current - args.points);

  await supabase.from("loyalty_transactions" as any).insert({
    user_id: args.user_id,
    customer_id: args.customer_id,
    type: "redeemed",
    amount_points: -args.points,
    amount_money: args.discount_money,
    source: "sale",
    sale_id: args.sale_id ?? null,
    created_by: args.created_by ?? null,
  });

  await supabase
    .from("customers")
    .update({ loyalty_points: newBalance } as any)
    .eq("id", args.customer_id);

  return newBalance;
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
