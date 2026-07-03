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

// ─────────────────────────────────────────────────────────────
// Automatic health alerts (email + webhook)
// ─────────────────────────────────────────────────────────────

export interface HealthAlertSettings {
  enabled: boolean;
  email: string;
  webhookUrl: string;
  slowThresholdS: number;
  bloatRatio: number;
  minSizeMb: number;
}

const ALERT_KEYS: Record<string, keyof HealthAlertSettings> = {
  health_alerts_enabled: "enabled",
  health_alert_email: "email",
  health_alert_webhook_url: "webhookUrl",
  health_slow_query_threshold_s: "slowThresholdS",
  health_bloat_ratio_threshold: "bloatRatio",
  health_bloat_min_size_mb: "minSizeMb",
};

export function useHealthAlertSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system-health", "alert-settings"],
    queryFn: async (): Promise<HealthAlertSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", Object.keys(ALERT_KEYS));
      if (error) throw error;
      const s: HealthAlertSettings = {
        enabled: false,
        email: "",
        webhookUrl: "",
        slowThresholdS: 5,
        bloatRatio: 30,
        minSizeMb: 50,
      };
      (data ?? []).forEach((row: any) => {
        switch (row.key) {
          case "health_alerts_enabled":
            s.enabled = row.value === "true";
            break;
          case "health_alert_email":
            s.email = row.value || "";
            break;
          case "health_alert_webhook_url":
            s.webhookUrl = row.value || "";
            break;
          case "health_slow_query_threshold_s":
            s.slowThresholdS = Number(row.value) || 5;
            break;
          case "health_bloat_ratio_threshold":
            s.bloatRatio = Number(row.value) || 30;
            break;
          case "health_bloat_min_size_mb":
            s.minSizeMb = Number(row.value) || 50;
            break;
        }
      });
      return s;
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSaveHealthAlertSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (s: HealthAlertSettings) => {
      const updates: { key: string; value: string }[] = [
        { key: "health_alerts_enabled", value: s.enabled ? "true" : "false" },
        { key: "health_alert_email", value: s.email.trim() },
        { key: "health_alert_webhook_url", value: s.webhookUrl.trim() },
        { key: "health_slow_query_threshold_s", value: String(s.slowThresholdS) },
        { key: "health_bloat_ratio_threshold", value: String(s.bloatRatio) },
        { key: "health_bloat_min_size_mb", value: String(s.minSizeMb) },
      ];
      for (const u of updates) {
        const { error } = await supabase
          .from("platform_settings")
          .upsert({ ...u }, { onConflict: "key" });
        if (error) throw error;
      }
      return s;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-health", "alert-settings"] });
      toast.success("Paramètres d'alerte enregistrés");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'enregistrement"),
  });
}

export interface AlertTestResult {
  ok?: boolean;
  isTest?: boolean;
  hasIssues?: boolean;
  slowCount?: number;
  bloatCount?: number;
  webhookSent?: boolean;
  emailQueued?: boolean;
  skipped?: string;
  [key: string]: unknown;
}

export function useTestHealthAlert() {
  return useMutation({
    mutationFn: async (): Promise<AlertTestResult> => {
      const { data, error } = await supabase.functions.invoke(
        "system-health-monitor",
        { body: { test: true } },
      );
      if (error) throw error;
      return data as AlertTestResult;
    },
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.webhookSent) parts.push("webhook envoyé");
      if (data.emailQueued) parts.push("e-mail mis en file");
      if (parts.length === 0) parts.push("aucun canal configuré");
      toast.success(`Test exécuté : ${parts.join(" · ")}`);
    },
    onError: (err: any) => toast.error(err.message || "Échec du test d'alerte"),
  });
}

// ─────────────────────────────────────────────────────────────
// Manual emergency maintenance (VACUUM / ANALYZE)
// ─────────────────────────────────────────────────────────────

export function useRunMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      table,
      mode,
    }: {
      table: string;
      mode: "vacuum_analyze" | "analyze";
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-db-maintenance",
        { body: { table, mode } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["system-health", "table-sizes"] });
      toast.success(
        vars.mode === "vacuum_analyze"
          ? `VACUUM ANALYZE exécuté sur ${vars.table}`
          : `ANALYZE exécuté sur ${vars.table}`,
      );
    },
    onError: (err: any) => toast.error(err.message || "Échec de la maintenance"),
  });
}

// ─────────────────────────────────────────────────────────────
// Maintenance-mode flag (global app guard)
// ─────────────────────────────────────────────────────────────

export function useMaintenanceModeFlag(enabled = true) {
  return useQuery({
    queryKey: ["maintenance-mode-flag"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_maintenance_mode");
      if (error) throw error;
      return data === true;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
