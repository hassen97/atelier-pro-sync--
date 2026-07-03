import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;
export type CustomerInsert = TablesInsert<"customers">;
export type CustomerUpdate = TablesUpdate<"customers">;

const CUSTOMERS_PAGE_SIZE = 50;

/** Paginated customers list with targeted columns. */
export function useCustomers(page = 0) {
  const effectiveUserId = useEffectiveUserId();
  const from = page * CUSTOMERS_PAGE_SIZE;
  const to = from + CUSTOMERS_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["customers", effectiveUserId, page],
    queryFn: async () => {
      if (!effectiveUserId) return { data: [], count: 0 };

      const { data, error, count } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, notes, balance, loyalty_points, created_at, updated_at, user_id", {
          count: "exact",
        })
        .eq("user_id", effectiveUserId)
        .order("name", { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!effectiveUserId,
    placeholderData: (prev) => prev,
  });
}

/** Fetch all customers (no pagination) — used in dropdowns and summary stats. */
export function useAllCustomers() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["customers-all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, balance, loyalty_points, created_at")
        .eq("user_id", effectiveUserId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!effectiveUserId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (customer: Omit<CustomerInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("customers")
        .insert({ ...customer, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      toast.success("Client créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["customers", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["customers", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["customers", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((c: any) =>
              c.id === id ? { ...c, ...updates } : c
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      toast.success("Client mis à jour");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    // Optimistic remove
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["customers", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["customers", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["customers", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((c: any) => c.id !== id),
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
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      toast.success("Client supprimé");
    },
  });
}
