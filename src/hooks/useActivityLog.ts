import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
}

export const ACTIVITY_LOG_PAGE_SIZE = 100;

export function useActivityLog(filters?: { action?: string; dateFrom?: string; dateTo?: string; page?: number }) {
  const { user } = useAuth();
  const page = filters?.page ?? 0;
  const from = page * ACTIVITY_LOG_PAGE_SIZE;
  const to = from + ACTIVITY_LOG_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["activity-log", user?.id, filters],
    queryFn: async () => {
      if (!user) return { data: [] as ActivityLogEntry[], count: 0 };

      let query = supabase
        .from("activity_log" as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters?.action && filters.action !== "all") {
        query = query.eq("action", filters.action);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as unknown as ActivityLogEntry[], count: count ?? 0 };
    },
    enabled: !!user,
    placeholderData: (prev) => prev,
  });
}
