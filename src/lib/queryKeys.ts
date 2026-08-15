import type { QueryClient } from "@tanstack/react-query";

/**
 * Central registry of query-key prefixes. Invalidations must go through
 * `invalidateDomains` so no domain key is ever forgotten or misspelled.
 */
export const queryKeys = {
  sales: ["sales"],
  salesUnpaid: ["sales-unpaid-all"],
  products: ["products"],
  productsAll: ["products-all"],
  productsLowStock: ["products-low-stock"],
  lowStockAlerts: ["low-stock-alerts"],
  inventoryStats: ["inventory-stats"],
  dashboardStats: ["dashboard-stats"],
  profit: ["profit"],
  sessionTotals: ["session-totals"],
  customers: ["customers"],
  customersAll: ["customers-all"],
  loyaltyTransactions: ["loyalty-transactions"],
  statistics: ["statistics"],
  registerSession: ["register-session"],
} as const;

export function invalidateDomains(
  queryClient: QueryClient,
  keys: ReadonlyArray<readonly string[]>
) {
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: [...key] });
  }
}
