import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Invoice = Tables<"invoices">;
export type InvoiceInsert = TablesInsert<"invoices">;
export type InvoiceUpdate = TablesUpdate<"invoices">;

export type InvoiceWithRelations = Invoice & {
  customer?: { id: string; name: string; phone?: string } | null;
  sale?: { id: string; total_amount: number } | null;
  repair?: { id: string; device_model: string; total_cost: number } | null;
};

export function useInvoices() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["invoices", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(id, name, phone),
          sale:sales(id, total_amount),
          repair:repairs(id, device_model, total_cost)
        `)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvoiceWithRelations[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (invoice: Omit<InvoiceInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("invoices")
        .insert({ ...invoice, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture créée avec succès");
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InvoiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture mise à jour");
    },
    onError: (error) => {
      console.error("Error updating invoice:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture supprimée");
    },
    onError: (error) => {
      console.error("Error deleting invoice:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useGenerateInvoiceNumber() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  return async (): Promise<string> => {
    if (!effectiveUserId) throw new Error("Non authentifié");

    const year = new Date().getFullYear();
    
    // Get count of invoices this year
    const { count, error } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", effectiveUserId)
      .gte("created_at", `${year}-01-01`)
      .lt("created_at", `${year + 1}-01-01`);

    if (error) throw error;

    const nextNumber = (count || 0) + 1;
    return `FAC-${year}-${String(nextNumber).padStart(3, "0")}`;
  };
}
