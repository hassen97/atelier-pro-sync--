import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CategoryKind = "main" | "sub";
export type TextSize = "normal" | "large";

export interface CategoryPreference {
  id: string;
  user_id: string;
  category_id: string;
  category_kind: CategoryKind;
  bg_color: string | null;
  text_size: TextSize | null;
  display_order: number | null;
  updated_at: string;
}

/**
 * Per-USER category preferences (color, text size, order).
 * Keyed on the authenticated user's id — NOT the effective/owner id — so an
 * employee's customization only affects their own view, never the shop.
 */
export function useCategoryPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["category-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CategoryPreference[];
      const { data, error } = await supabase
        .from("user_category_preferences")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as CategoryPreference[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

/** Upsert color / text size for a single category for the current user. */
export function useUpsertCategoryPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      category_id: string;
      category_kind: CategoryKind;
      bg_color?: string | null;
      text_size?: TextSize | null;
      display_order?: number | null;
    }) => {
      if (!user?.id) throw new Error("Non authentifié");
      const { error } = await supabase
        .from("user_category_preferences")
        .upsert(
          {
            user_id: user.id,
            category_id: input.category_id,
            category_kind: input.category_kind,
            ...(input.bg_color !== undefined && { bg_color: input.bg_color }),
            ...(input.text_size !== undefined && { text_size: input.text_size }),
            ...(input.display_order !== undefined && { display_order: input.display_order }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,category_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-preferences"] });
    },
  });
}

/** Clear a category's preference back to defaults. */
export function useResetCategoryPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (category_id: string) => {
      if (!user?.id) throw new Error("Non authentifié");
      const { error } = await supabase
        .from("user_category_preferences")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", category_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-preferences"] });
    },
  });
}

/** Batch-persist display_order for a reordered list (one kind at a time). */
export function useReorderCategoryPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      kind: CategoryKind;
      orderedIds: string[];
    }) => {
      if (!user?.id) throw new Error("Non authentifié");
      const rows = input.orderedIds.map((category_id, index) => ({
        user_id: user.id,
        category_id,
        category_kind: input.kind,
        display_order: index,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("user_category_preferences")
        .upsert(rows, { onConflict: "user_id,category_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-preferences"] });
    },
  });
}
