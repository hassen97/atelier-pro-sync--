import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { applyLoyaltyEarn, applyLoyaltyRedeem } from "@/hooks/useLoyalty";
import { queryKeys, invalidateDomains } from "@/lib/queryKeys";

export type Sale = Tables<"sales">;
export type SaleInsert = TablesInsert<"sales">;
export type SaleItem = Tables<"sale_items">;
export type SaleItemInsert = TablesInsert<"sale_items">;

interface CreateSaleParams {
  customer_id?: string | null;
  payment_method: string;
  total_amount: number;
  amount_paid: number;
  notes?: string;
  session_id?: string | null;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  // Loyalty
  loyalty_points_used?: number;
  loyalty_discount?: number;
  loyalty_enabled?: boolean;
  loyalty_earn_rate?: number;
}

export interface CreateSaleResult {
  sale: Sale;
  points_earned: number;
  points_used: number;
  loyalty_balance_after: number | null;
}

/**
 * Unpaid sales only — backed by the `unpaid_sales` security_invoker view, so
 * the balance filter happens server-side. We no longer download the full
 * (paid + unpaid) sales history to filter it in JS.
 */
export function useAllUnpaidSales() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: [...queryKeys.salesUnpaid, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const PAGE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("unpaid_sales" as any)
          .select(
            `id, customer_id, total_amount, amount_paid, remaining_balance,
             payment_method, created_at,
             customer:customers(id, name, phone)`
          )
          .eq("user_id", effectiveUserId)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);

        if (error) throw error;
        if (!data || data.length === 0) { hasMore = false; break; }
        allData = allData.concat(data);
        if (data.length < PAGE) { hasMore = false; } else { from += PAGE; }
      }

      return allData;
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000, // 1 min cache for debt page
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      items,
      loyalty_points_used,
      loyalty_discount,
      loyalty_enabled,
      loyalty_earn_rate,
      ...saleData
    }: CreateSaleParams): Promise<CreateSaleResult> => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      // ONE atomic server-side call: sale + items + row-locked stock decrement.
      // Replaces ~5+2N sequential requests and the read-then-write oversell race.
      const { data, error } = await supabase.rpc("create_sale" as any, {
        _shop_id: effectiveUserId,
        _items: items,
        _customer_id: saleData.customer_id ?? null,
        _payment_method: saleData.payment_method,
        _total_amount: saleData.total_amount,
        _amount_paid: saleData.amount_paid,
        _notes: saleData.notes ?? null,
        _session_id: saleData.session_id ?? null,
      });
      if (error) throw error;

      const sale = {
        id: (data as any)?.sale_id,
        ...saleData,
        user_id: effectiveUserId,
      } as Sale;

      // Loyalty: redemption (deducts points first)
      let points_used = 0;
      let balance_after: number | null = null;
      if (saleData.customer_id && loyalty_enabled && (loyalty_points_used ?? 0) > 0) {
        balance_after = await applyLoyaltyRedeem({
          user_id: effectiveUserId,
          customer_id: saleData.customer_id,
          points: loyalty_points_used!,
          discount_money: loyalty_discount ?? 0,
          sale_id: sale.id,
          created_by: user?.id ?? null,
        });
        points_used = loyalty_points_used!;
      }

      // Loyalty: earning on actual paid amount (post-discount)
      let points_earned = 0;
      if (
        saleData.customer_id &&
        loyalty_enabled &&
        (loyalty_earn_rate ?? 0) > 0 &&
        saleData.amount_paid > 0
      ) {
        points_earned = await applyLoyaltyEarn({
          user_id: effectiveUserId,
          customer_id: saleData.customer_id,
          amount_money: saleData.amount_paid,
          earn_rate: loyalty_earn_rate!,
          source: "sale",
          sale_id: sale.id,
          created_by: user?.id ?? null,
        });
        // Re-read to get final balance
        const { data: c } = await supabase
          .from("customers")
          .select("loyalty_points")
          .eq("id", saleData.customer_id)
          .maybeSingle();
        balance_after = (c as any)?.loyalty_points ?? balance_after;
      }

      return {
        sale,
        points_earned,
        points_used,
        loyalty_balance_after: balance_after,
      };
    },
    onSuccess: () => {
      invalidateDomains(queryClient, [
        queryKeys.sales,
        queryKeys.salesUnpaid,
        queryKeys.products,
        queryKeys.productsAll,
        queryKeys.productsLowStock,
        queryKeys.lowStockAlerts,
        queryKeys.inventoryStats,
        queryKeys.dashboardStats,
        queryKeys.profit,
        queryKeys.sessionTotals,
        queryKeys.customers,
        queryKeys.customersAll,
        queryKeys.loyaltyTransactions,
      ]);
      toast.success("Vente enregistrée avec succès");
    },
    onError: (error) => {
      console.error("Error creating sale:", error);
      toast.error("Erreur lors de l'enregistrement de la vente");
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; amount_paid?: number }) => {
      const { data, error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDomains(queryClient, [
        queryKeys.sales,
        queryKeys.salesUnpaid,
        queryKeys.dashboardStats,
        queryKeys.profit,
      ]);
    },
    onError: (error) => {
      console.error("Error updating sale:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}
