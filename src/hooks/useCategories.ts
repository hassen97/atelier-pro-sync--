import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";

const DEFAULT_REPAIR_CATEGORIES = [
  "Écran/Affichage",
  "Batterie",
  "Port de charge",
  "Dégâts des eaux",
  "Carte mère",
  "Châssis/Vitre",
  "Logiciel",
  "Caméra/FaceID",
];

const DEFAULT_PRODUCT_CATEGORIES = [
  "Écrans",
  "Batteries",
  "Petites pièces",
  "Consommables",
  "Accessoires",
];

export function useCategories(type?: "product" | "repair") {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["categories", type, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      let query = supabase
        .from("categories")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("name");

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ name, type }: { name: string; type: "product" | "repair" }) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("categories")
        .insert({ name, type, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast.success("Catégorie supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useSeedDefaultCategories() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");

      // Delete existing categories for user
      await supabase.from("categories").delete().eq("user_id", user.id);

      const rows = [
        ...DEFAULT_REPAIR_CATEGORIES.map((name) => ({
          name,
          type: "repair" as const,
          user_id: user.id,
        })),
        ...DEFAULT_PRODUCT_CATEGORIES.map((name) => ({
          name,
          type: "product" as const,
          user_id: user.id,
        })),
      ];

      const { error } = await supabase.from("categories").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégories réinitialisées par défaut");
    },
    onError: () => {
      toast.error("Erreur lors de la réinitialisation");
    },
  });
}

// ---------------- Subcategories (stock only) ----------------

export function useSubcategories() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["subcategories", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ name, categoryId }: { name: string; categoryId: string }) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("subcategories")
        .insert({ name, category_id: categoryId, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Sous-catégorie créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création");
    },
  });
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Sous-catégorie supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
}
