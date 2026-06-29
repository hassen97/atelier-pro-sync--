import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DbTableSize {
  table_name: string;
  total_size_mb: number;
  live_tuples: number;
  dead_tuples: number;
  dead_ratio: number;
}

export interface ActiveConnections {
  total: number;
  active: number;
  idle: number;
}

export interface SlowQuery {
  pid: number;
  duration_seconds: number;
  state: string;
  query: string;
}

/** Largest tables + bloat. Sizes change slowly, so cache for a minute. */
export function useDbTableSizes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system-health", "table-sizes"],
    queryFn: async (): Promise<DbTableSize[]> => {
      const { data, error } = await supabase.rpc("get_db_table_sizes");
      if (error) throw error;
      return (data ?? []) as DbTableSize[];
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Live connection counts. Polls every 30s; React Query clears the timer on unmount. */
export function useActiveConnections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system-health", "connections"],
    queryFn: async (): Promise<ActiveConnections> => {
      const { data, error } = await supabase.rpc("get_active_connections");
      if (error) throw error;
      const row = (data?.[0] ?? { total: 0, active: 0, idle: 0 }) as ActiveConnections;
      return row;
    },
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Queries currently running > 1s. Polls every 30s. */
export function useSlowQueries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system-health", "slow-queries"],
    queryFn: async (): Promise<SlowQuery[]> => {
      const { data, error } = await supabase.rpc("get_slow_queries");
      if (error) throw error;
      return (data ?? []) as SlowQuery[];
    },
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Global maintenance-mode flag (key-value row in platform_settings). */
export function useMaintenanceMode() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system-health", "maintenance-mode"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      if (error) throw error;
      return data?.value === "true";
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useSetMaintenanceMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { key: "maintenance_mode", value: enabled ? "true" : "false" },
          { onConflict: "key" }
        );
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ["system-health", "maintenance-mode"] });
      toast.success(
        enabled ? "Mode maintenance activé" : "Mode maintenance désactivé"
      );
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la mise à jour"),
  });
}
