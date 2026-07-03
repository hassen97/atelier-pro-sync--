import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Loyer",
  "Électricité",
  "Stock",
  "Marketing",
  "Télécom",
  "Fournitures",
  "Maintenance",
  "Salaires",
  "Transport",
  "Livraison",
  "Achat matériel",
  "Autre",
];

export function useExpenseCategories() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["expense-categories", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return DEFAULT_EXPENSE_CATEGORIES;

      const { data, error } = await supabase
        .from("expense_categories" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("name");

      if (error) throw error;

      // If no custom categories, return defaults
      if (!data || data.length === 0) return DEFAULT_EXPENSE_CATEGORIES;

      return (data as any[]).map((c) => c.name);
    },
    enabled: !!effectiveUserId,
  });
}

export function useExpenseCategoryRecords() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["expense-category-records", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("expense_categories" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("name");

      if (error) throw error;
      return (data || []) as unknown as { id: string; name: string; user_id: string; created_at: string }[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("expense_categories" as any)
        .insert({ name: name.trim(), user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["expense-category-records"] });
      toast.success("Catégorie créée");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_categories" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["expense-category-records"] });
      toast.success("Catégorie supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
