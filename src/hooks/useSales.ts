import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { applyLoyaltyEarn, applyLoyaltyRedeem } from "@/hooks/useLoyalty";

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

export function useSales() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["sales", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customer:customers(id, name),
          sale_items(id, product_id, quantity, unit_price)
        `)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
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

      // Create the sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          ...saleData,
          user_id: effectiveUserId,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update product quantities
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from("products")
            .update({ 
              quantity: product.quantity - item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq("id", item.product_id);
        }
      }

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
        sale: sale as Sale,
        points_earned,
        points_used,
        loyalty_balance_after: balance_after,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
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
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
    },
    onError: (error) => {
      console.error("Error updating sale:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}
