import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export type ExpenseWithSupplier = Expense & {
  supplier?: { id: string; name: string } | null;
};

export function useExpenses() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["expenses", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .eq("user_id", effectiveUserId)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data as ExpenseWithSupplier[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Dépense créée avec succès");
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Dépense mise à jour");
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Dépense supprimée");
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}
