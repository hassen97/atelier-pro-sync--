import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { applyLoyaltyEarn, hasRepairEarnedLoyalty } from "@/hooks/useLoyalty";

export type Repair = Tables<"repairs">;
export type RepairInsert = TablesInsert<"repairs">;
export type RepairUpdate = TablesUpdate<"repairs">;

export type RepairStatus = "pending" | "in_progress" | "completed" | "delivered" | "rejected";

export const REPAIRS_PAGE_SIZE = 100;

/**
 * Internal helper: award points for a repair if conditions are met
 * (status is delivered, fully paid, customer attached, loyalty enabled, not already awarded).
 */
async function maybeAwardRepairLoyalty(repairId: string, userId: string, actorId: string | null) {
  const { data: repair } = await supabase
    .from("repairs")
    .select("id, status, customer_id, total_cost, amount_paid")
    .eq("id", repairId)
    .maybeSingle();
  if (!repair) return;
  if (repair.status !== "delivered") return;
  if (!repair.customer_id) return;
  const total = Number(repair.total_cost) || 0;
  const paid = Number(repair.amount_paid) || 0;
  if (total <= 0 || paid + 0.001 < total) return;

  const { data: settings } = await supabase
    .from("shop_settings")
    .select("loyalty_enabled, loyalty_earn_rate")
    .eq("user_id", userId)
    .maybeSingle();
  if (!settings || !(settings as any).loyalty_enabled) return;

  const already = await hasRepairEarnedLoyalty(repairId);
  if (already) return;

  await applyLoyaltyEarn({
    user_id: userId,
    customer_id: repair.customer_id,
    amount_money: total,
    earn_rate: Number((settings as any).loyalty_earn_rate ?? 1),
    source: "repair",
    repair_id: repairId,
    created_by: actorId,
  });
}

/** Paginated repairs — fetches one page at a time from the server. */
export function useRepairs(page = 0) {
  const effectiveUserId = useEffectiveUserId();
  const from = page * REPAIRS_PAGE_SIZE;
  const to = from + REPAIRS_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["repairs", effectiveUserId, page],
    queryFn: async () => {
      if (!effectiveUserId) return { data: [], count: 0 };

      const { data, error, count } = await supabase
        .from("repairs")
        .select(
          `id, status, device_model, problem_description, diagnosis,
           deposit_date, delivery_date, imei, labor_cost, parts_cost,
           total_cost, amount_paid, notes, tracking_token, ticket_number,
           estimated_ready_date, technician_note, customer_id, category_id,
           is_warranty, received_by, repaired_by, device_condition,
           device_unlock_code,
           warranty_ticket_id, created_at, updated_at,
           customer:customers(id, name, phone, email),
           category:categories(id, name)`,
          { count: "exact" }
        )
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!effectiveUserId,
    // Keep previous page data while loading next page (no flicker)
    placeholderData: (prev) => prev,
  });
}

/**
 * Server-side lookup by ticket_number for a numeric search query.
 * Returns at most one matching repair (ticket numbers are unique per shop).
 */
export function useRepairByTicketNumber(ticketNumber: number | null) {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["repair-by-ticket", effectiveUserId, ticketNumber],
    queryFn: async () => {
      if (!effectiveUserId || !ticketNumber) return null;
      const { data, error } = await supabase
        .from("repairs")
        .select(
          `id, status, device_model, problem_description, diagnosis,
           deposit_date, delivery_date, imei, labor_cost, parts_cost,
           total_cost, amount_paid, notes, tracking_token, ticket_number,
           estimated_ready_date, technician_note, customer_id, category_id,
           is_warranty, received_by, repaired_by, device_condition,
           device_unlock_code,
           warranty_ticket_id, created_at, updated_at,
           customer:customers(id, name, phone, email),
           category:categories(id, name)`
        )
        .eq("user_id", effectiveUserId)
        .eq("ticket_number", ticketNumber)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId && !!ticketNumber,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetches ALL unpaid repairs across the entire dataset for accurate debt aggregation.
 * Uses a lightweight select (only financial fields) to stay fast even with thousands of rows.
 */
export function useAllUnpaidRepairs() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["repairs-unpaid-all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      // Batch-fetch all unpaid repairs (amount_paid < total_cost) using Supabase filter
      // We fetch in batches of 1000 to respect the API limit
      const PAGE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("repairs")
          .select(
            `id, status, customer_id, total_cost, amount_paid, created_at,
             device_model, tracking_token, ticket_number,
             customer:customers(id, name, phone)`
          )
          .eq("user_id", effectiveUserId)
          .gt("total_cost", 0) // only repairs with a cost
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);

        if (error) throw error;
        if (!data || data.length === 0) { hasMore = false; break; }
        allData = allData.concat(data);
        if (data.length < PAGE) { hasMore = false; } else { from += PAGE; }
      }

      // Filter client-side to get only those with remaining balance
      return allData.filter((r) => Number(r.total_cost) - Number(r.amount_paid) > 0.001);
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000, // 1 min cache for debt page
  });
}

export function useRepair(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["repair", id],
    queryFn: async () => {
      if (!user || !id) return null;

      const { data, error } = await supabase
        .from("repairs")
        .select(
          `*, customer:customers(id, name, phone, email),
           repair_parts(id, product_id, quantity, unit_price)`
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateRepair() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (repair: Omit<RepairInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("repairs")
        .insert({ ...repair, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;

      const amountPaid = Number(repair.amount_paid) || 0;
      if (amountPaid > 0) {
        const { error: expenseError } = await supabase.from("expenses").insert({
          user_id: effectiveUserId,
          category: "Avance Réparation",
          amount: -amountPaid,
          description: `Avance réparation: ${repair.device_model}`,
          expense_date: new Date().toISOString().split("T")[0],
        });

        if (expenseError) throw expenseError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Réparation créée avec succès");
    },
    onError: (error) => {
      console.error("Error creating repair:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateRepair() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RepairUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("repairs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Loyalty earn (idempotent) when fully paid + delivered
      if (effectiveUserId) {
        try { await maybeAwardRepairLoyalty(id, effectiveUserId, user?.id ?? null); } catch (e) { console.error("Loyalty award (repair update) failed:", e); }
      }
      return data;
    },
    // Optimistic update: instantly reflect changes in the cache
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["repairs", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["repairs", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["repairs", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((r: any) =>
              r.id === id ? { ...r, ...updates } : r
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
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["repair", data.id] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
      toast.success("Réparation mise à jour");
    },
  });
}

export function useUpdateRepairStatus() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RepairStatus }) => {
      const updates: RepairUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "delivered") {
        updates.delivery_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("repairs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Loyalty earn (idempotent) when transitioning to delivered & fully paid
      if (effectiveUserId && status === "delivered") {
        try { await maybeAwardRepairLoyalty(id, effectiveUserId, user?.id ?? null); } catch (e) { console.error("Loyalty award (status) failed:", e); }
      }
      return data;
    },
    // Optimistic update for instant status badge change
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["repairs", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["repairs", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["repairs", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((r: any) =>
              r.id === id ? { ...r, status } : r
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
      toast.error("Erreur lors du changement de statut");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
    },
  });
}

export function useDeleteRepair() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repairs").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    // Optimistic: remove from list immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["repairs", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["repairs", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["repairs", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((r: any) => r.id !== id),
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
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success("Réparation supprimée");
    },
  });
}

/** Bulk-update the status of multiple repairs in one request. */
export function useBulkUpdateRepairStatus() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: RepairStatus }) => {
      if (ids.length === 0) return { ids, status };
      const { error } = await supabase
        .from("repairs")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      return { ids, status };
    },
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: ["repairs", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["repairs", effectiveUserId] });
      const idSet = new Set(ids);
      queryClient.setQueriesData(
        { queryKey: ["repairs", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((r: any) => (idSet.has(r.id) ? { ...r, status } : r)),
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
      toast.error("Erreur lors de la mise à jour groupée");
    },
    onSuccess: ({ ids, status }) => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      const labels: Record<RepairStatus, string> = {
        pending: "en attente",
        in_progress: "en cours",
        completed: "terminées",
        delivered: "livrées",
        rejected: "rejetées",
      };
      toast.success(`${ids.length} réparation${ids.length > 1 ? "s" : ""} ${labels[status]}`);
    },
  });
}

/** Bulk-delete multiple repairs in one request. */
export function useBulkDeleteRepair() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return ids;
      const { error } = await supabase.from("repairs").delete().in("id", ids);
      if (error) throw error;
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["repairs", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["repairs", effectiveUserId] });
      const idSet = new Set(ids);
      queryClient.setQueriesData(
        { queryKey: ["repairs", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((r: any) => !idSet.has(r.id)),
            count: Math.max(0, (old.count ?? ids.length) - ids.length),
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
      toast.error("Erreur lors de la suppression groupée");
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success(`${ids.length} réparation${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}`);
    },
  });
}
