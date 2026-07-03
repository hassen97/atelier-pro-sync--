import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useProductReturns() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["product-returns", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await db
        .from("product_returns")
        .select("*, customer:customers(id, name, phone), product:products(id, name)")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });
}

export function useSearchSaleForReturn() {
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (query: string) => {
      if (!effectiveUserId) throw new Error("Non authentifié");
      const trimmed = query.trim();

      // Fetch sales with items
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customer:customers(id, name, phone),
          sale_items(id, product_id, quantity, unit_price, product:products(id, name, barcodes, sku))
        `)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // If no search query, return recent sales
      if (!trimmed) return (data || []).slice(0, 10);

      const lower = trimmed.toLowerCase();

      // Filter client-side by barcode, customer phone, sale ID, product name, SKU
      const filtered = (data || []).filter((sale: any) => {
        if (sale.id.toLowerCase().includes(lower)) return true;
        if (sale.customer?.phone?.includes(trimmed)) return true;
        if (sale.customer?.name?.toLowerCase().includes(lower)) return true;
        return sale.sale_items?.some((item: any) => {
          if (item.product?.name?.toLowerCase().includes(lower)) return true;
          if (item.product?.sku?.toLowerCase().includes(lower)) return true;
          return item.product?.barcodes?.some((bc: string) => bc.toLowerCase().includes(lower));
        });
      });

      return filtered;
    },
  });
}

export function useCreateProductReturn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      sale_id: string;
      sale_item_id?: string;
      customer_id?: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      refund_amount: number;
      refund_method: "cash" | "store_credit";
      stock_destination: "available" | "defective";
      reason: string;
      notes?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");

      // 1. Create product return entry
      const { data: returnEntry, error } = await db
        .from("product_returns")
        .insert({
          user_id: user.id,
          sale_id: params.sale_id,
          sale_item_id: params.sale_item_id || null,
          customer_id: params.customer_id || null,
          product_id: params.product_id,
          product_name: params.product_name,
          quantity: params.quantity,
          unit_price: params.unit_price,
          refund_amount: params.refund_amount,
          refund_method: params.refund_method,
          stock_destination: params.stock_destination,
          reason: params.reason,
          notes: params.notes || null,
          status: "completed",
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Handle stock
      if (params.stock_destination === "available") {
        // Add back to available stock
        const { data: product } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", params.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ quantity: product.quantity + params.quantity })
            .eq("id", params.product_id);
        }
      }
      // If defective, stock stays deducted (item is waste)

      // 3. Handle refund
      if (params.refund_method === "cash") {
        // Create a negative expense (refund) for daily cash report
        await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            category: "Remboursement client",
            description: `Retour: ${params.product_name} x${params.quantity}`,
            amount: -params.refund_amount,
            expense_date: new Date().toISOString().split("T")[0],
          });
      } else if (params.refund_method === "store_credit" && params.customer_id) {
        // Decrease customer balance (negative = credit/avoir)
        const { data: customer } = await supabase
          .from("customers")
          .select("balance")
          .eq("id", params.customer_id)
          .single();

        if (customer) {
          await supabase
            .from("customers")
            .update({ balance: Number(customer.balance) - params.refund_amount })
            .eq("id", params.customer_id);
        }
      }

      return returnEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success("Retour enregistré avec succès");
    },
    onError: (error) => {
      console.error("Error creating product return:", error);
      toast.error("Erreur lors de l'enregistrement du retour");
    },
  });
}
