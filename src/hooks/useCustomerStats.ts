import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import type { Customer } from "@/hooks/useCustomers";

/** A single customer's aggregated activity, as returned by the customer_stats view. */
export interface CustomerStats {
  customer_id: string;
  repair_count: number;
  repair_total: number;
  repair_paid: number;
  sale_count: number;
  sale_total: number;
  sale_paid: number;
  total_billed: number;
  total_paid: number;
  outstanding: number;
}

/** Sort keys available on the Clients list. "name" keeps the existing default path. */
export type CustomerStatsSort = "name" | "repairs" | "paid" | "outstanding";

const CUSTOMERS_PAGE_SIZE = 50;

const num = (v: unknown) => Number(v ?? 0) || 0;

function toStats(row: any): CustomerStats {
  return {
    customer_id: row.customer_id,
    repair_count: num(row.repair_count),
    repair_total: num(row.repair_total),
    repair_paid: num(row.repair_paid),
    sale_count: num(row.sale_count),
    sale_total: num(row.sale_total),
    sale_paid: num(row.sale_paid),
    total_billed: num(row.total_billed),
    total_paid: num(row.total_paid),
    outstanding: num(row.outstanding),
  };
}

/**
 * Enrichment (non-breaking): fetch stats ONLY for the given customer ids (the
 * current page). Returns a map keyed by customer_id. Missing rows simply show
 * zeroes. Independent of useCustomers — if this fails the page still renders.
 */
export function useCustomerStats(customerIds: string[]) {
  const effectiveUserId = useEffectiveUserId();
  const idsKey = [...customerIds].sort().join(",");

  return useQuery({
    queryKey: ["customer-stats", effectiveUserId, idsKey],
    queryFn: async () => {
      if (!effectiveUserId || customerIds.length === 0) return {} as Record<string, CustomerStats>;
      const { data, error } = await supabase
        .from("customer_stats")
        .select("*")
        .eq("user_id", effectiveUserId)
        .in("customer_id", customerIds);
      if (error) throw error;
      const map: Record<string, CustomerStats> = {};
      for (const row of data ?? []) map[row.customer_id] = toStats(row);
      return map;
    },
    enabled: !!effectiveUserId && customerIds.length > 0,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Sorted pagination (opt-in): when the shop owner picks a non-name sort, drive
 * the global ordering + pagination from the view, then hydrate full customer
 * rows for that page. Returns null for sort === "name" so callers fall back to
 * the untouched useCustomers path.
 *
 * Note: only customers with at least one repair/sale appear here (they're the
 * ones with data to sort on) — exactly what "top clients / who owes most" needs.
 */
export function useSortedCustomers(page: number, sort: CustomerStatsSort) {
  const effectiveUserId = useEffectiveUserId();
  const from = page * CUSTOMERS_PAGE_SIZE;
  const to = from + CUSTOMERS_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["customers-sorted", effectiveUserId, page, sort],
    queryFn: async () => {
      if (!effectiveUserId || sort === "name") return null;

      const sortField =
        sort === "repairs" ? "repair_count" : sort === "paid" ? "total_paid" : "outstanding";

      // 1) ordered + paginated customer ids straight from the view (indexed)
      const { data: statsRows, error: statsError, count } = await supabase
        .from("customer_stats")
        .select("customer_id, repair_count, repair_total, repair_paid, sale_count, sale_total, sale_paid, total_billed, total_paid, outstanding", { count: "exact" })
        .eq("user_id", effectiveUserId)
        .order(sortField, { ascending: false })
        .range(from, to);
      if (statsError) throw statsError;

      const orderedIds = (statsRows ?? []).map((r) => r.customer_id).filter(Boolean) as string[];
      if (orderedIds.length === 0) return { customers: [] as Customer[], statsMap: {} as Record<string, CustomerStats>, count: count ?? 0 };

      // 2) hydrate the actual customer records for this page
      const { data: customerRows, error: customerError } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, notes, balance, loyalty_points, created_at, updated_at, user_id")
        .eq("user_id", effectiveUserId)
        .in("id", orderedIds);
      if (customerError) throw customerError;

      // keep the view's ordering
      const byId = new Map((customerRows ?? []).map((c) => [c.id, c as unknown as Customer]));
      const customers = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Customer[];

      const statsMap: Record<string, CustomerStats> = {};
      for (const r of statsRows ?? []) statsMap[r.customer_id] = toStats(r);

      return { customers, statsMap, count: count ?? customers.length };
    },
    enabled: !!effectiveUserId && sort !== "name",
    placeholderData: (prev) => prev,
  });
}
