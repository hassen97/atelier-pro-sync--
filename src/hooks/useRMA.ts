import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useUpdateDefectivePartRMA() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      status: string;
      supplier_id?: string | null;
      refund_amount?: number;
      product_id?: string | null;
      quantity?: number;
    }) => {
      if (!user) throw new Error("Non authentifié");

      const updateData: any = { status: params.status };

      // Track sent date
      if (params.status === "sent") {
        updateData.sent_date = new Date().toISOString();
      }

      // Set resolution
      if (["replaced", "refunded", "rejected"].includes(params.status)) {
        updateData.resolution = params.status;
      }

      const { error } = await db
        .from("defective_parts")
        .update(updateData)
        .eq("id", params.id);

      if (error) throw error;

      // When refunded: decrease supplier debt
      if (params.status === "refunded" && params.supplier_id && params.refund_amount && params.refund_amount > 0) {
        // Get current supplier balance
        const { data: supplier } = await supabase
          .from("suppliers")
          .select("balance")
          .eq("id", params.supplier_id)
          .single();

        if (supplier) {
          const newBalance = Number(supplier.balance) + params.refund_amount; // positive = reduces debt (debt is negative)
          await supabase
            .from("suppliers")
            .update({ balance: newBalance })
            .eq("id", params.supplier_id);

          // Log transaction
          await db.from("supplier_transactions").insert({
            user_id: user.id,
            supplier_id: params.supplier_id,
            type: "payment",
            description: "Remboursement RMA - Pièce défectueuse",
            amount: params.refund_amount,
            running_balance: newBalance,
            status: "paid",
          });
        }
      }

      // When replaced: add replacement to stock
      if (params.status === "replaced" && params.product_id && params.quantity) {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defective-parts"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Statut RMA mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour RMA"),
  });
}
