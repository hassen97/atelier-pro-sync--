import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products"> & { barcodes: string[] };
export type ProductInsert = TablesInsert<"products"> & { barcodes?: string[] };
export type ProductUpdate = TablesUpdate<"products"> & { barcodes?: string[] };

export const PRODUCTS_PAGE_SIZE = 50;

interface UseProductsOptions {
  page?: number;
  search?: string;
  categoryId?: string | null;
}

/** Paginated product list with server-side search/filter and exact count. */
export function useProducts({ page = 0, search = "", categoryId }: UseProductsOptions = {}) {
  const effectiveUserId = useEffectiveUserId();
  const from = page * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["products", effectiveUserId, page, search, categoryId],
    queryFn: async () => {
      if (!effectiveUserId) return { data: [], count: 0 };

      let query = supabase
        .from("products")
        .select(
          `id, name, sku, barcodes, description, cost_price, sell_price,
           quantity, min_quantity, category_id,
           category:categories(id, name)`,
          { count: "exact" }
        )
        .eq("user_id", effectiveUserId)
        .order("name");

      // Server-side search across name, sku, and barcodes
      if (search.trim()) {
        const s = search.trim();
        query = query.or(
          `name.ilike.%${s}%,sku.ilike.%${s}%,barcodes.cs.{"${s}"}`
        );
      }

      // Server-side category filter
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return { data: (data ?? []) as (typeof data[0] & { barcodes: string[] })[], count: count ?? 0 };
    },
    enabled: !!effectiveUserId,
    placeholderData: (prev) => prev,
  });
}

/** Fetch ALL products (no pagination) — used for dropdowns/comboboxes/POS.
 *  Fetches in batches of 1000 to bypass Supabase default row limit. */
export function useAllProducts() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["products-all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku, barcodes, sell_price, cost_price, quantity, min_quantity, category_id, category:categories(id, name)")
          .eq("user_id", effectiveUserId)
          .order("name")
          .range(from, from + PAGE - 1);

        if (error) throw error;
        all = all.concat(data ?? []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }

      return all as (Omit<any, 'barcodes'> & { barcodes: string[] })[];
    },
    enabled: !!effectiveUserId,
    staleTime: 30 * 1000,
  });
}

export function useProduct(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!user || !id) return null;

      const { data, error } = await supabase
        .from("products")
        .select(`*, category:categories(id, name)`)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (product: Omit<ProductInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { barcodes, ...rest } = product as any;
      const { data, error } = await supabase
        .from("products")
        .insert({ ...rest, barcodes: barcodes || [], user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produit créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating product:", error);
      toast.error("Erreur lors de la création du produit");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["products", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["products", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["products", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p: any) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          };
        }
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Erreur lors de la mise à jour");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produit mis à jour");
    },
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic stock update
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["products", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["products", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["products", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p: any) =>
              p.id === id ? { ...p, quantity } : p
            ),
          };
        }
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Erreur lors de la mise à jour du stock");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    // Optimistic remove
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["products", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["products", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((p: any) => p.id !== id),
            count: (old.count ?? 1) - 1,
          };
        }
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Erreur lors de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produit supprimé");
    },
  });
}

export function useLowStockProducts() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["products-low-stock", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity, min_quantity")
        .eq("user_id", effectiveUserId)
        .lte("quantity", 5);

      if (error) throw error;

      return (data as Pick<Product, "id" | "name" | "quantity" | "min_quantity">[]).filter(
        (p) => p.quantity <= p.min_quantity
      );
    },
    enabled: !!effectiveUserId,
  });
}

/** Lightweight global stats across ALL products — not limited by pagination. */
export function useInventoryStats() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["inventory-stats", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return { totalUnits: 0, totalValue: 0, lowStock: 0, outOfStock: 0 };

      const PAGE = 1000;
      let all: { quantity: number; min_quantity: number; cost_price: number }[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("products")
          .select("quantity, min_quantity, cost_price")
          .eq("user_id", effectiveUserId)
          .range(from, from + PAGE - 1);

        if (error) throw error;
        all = all.concat(data ?? []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }

      let totalUnits = 0, totalValue = 0, lowStock = 0, outOfStock = 0;
      for (const p of all) {
        const qty = p.quantity ?? 0;
        totalUnits += qty;
        totalValue += (p.cost_price ?? 0) * qty;
        if (qty === 0) outOfStock++;
        else if (qty <= (p.min_quantity ?? 5)) lowStock++;
      }

      return { totalUnits, totalValue, lowStock, outOfStock };
    },
    enabled: !!effectiveUserId,
    staleTime: 60_000, // 1 min cache
  });
}
