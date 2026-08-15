import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SignupAttempt {
  id: string;
  ip_address: string;
  created_at: string;
}

export interface SignupEvent {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  created_at: string;
  seen_at: string | null;
}

export interface IpSummary {
  ip: string;
  count: number;
  lastSeen: string;
  firstSeen: string;
}

/** Attempts older than this window are considered "cold" for the dashboard. */
const ATTEMPTS_WINDOW_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const EVENTS_LIMIT = 100;
const EVENTS_KEY = ["admin-security-events"] as const;

/* ── Raw attempt rows (RLS now grants platform admins read access) ── */
export function useSignupAttempts() {
  return useQuery({
    queryKey: ["admin-security-attempts"],
    queryFn: async () => {
      const from = new Date(Date.now() - ATTEMPTS_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from("signup_attempts")
        .select("id, ip_address, created_at")
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as SignupAttempt[];
    },
    staleTime: 30_000,
    retry: 1,
  });
}

/* ── Grouped IP summaries with severity ranking ── */
export function groupAttemptsByIp(attempts: SignupAttempt[] = []): IpSummary[] {
  const byIp = new Map<string, { count: number; lastSeen: string; firstSeen: string }>();
  for (const a of attempts) {
    const cur = byIp.get(a.ip_address) ?? { count: 0, lastSeen: a.created_at, firstSeen: a.created_at };
    cur.count += 1;
    if (a.created_at > cur.lastSeen) cur.lastSeen = a.created_at;
    if (a.created_at < cur.firstSeen) cur.firstSeen = a.created_at;
    byIp.set(a.ip_address, cur);
  }
  return [...byIp.entries()]
    .map(([ip, v]) => ({ ip, ...v }))
    .sort((a, b) => b.count - a.count);
}

/* ── Signup events feed (live via realtime) ── */
export function useSignupEvents() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: EVENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_signup_events")
        .select("id, username, full_name, email, phone, country, created_at, seen_at")
        .order("created_at", { ascending: false })
        .limit(EVENTS_LIMIT);
      if (error) throw error;
      return (data ?? []) as SignupEvent[];
    },
    staleTime: 30_000,
    retry: 1,
  });

  // Live-append new events without a full refetch.
  useEffect(() => {
    const channel = supabase
      .channel("admin-security-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_signup_events" },
        (payload) => {
          queryClient.setQueryData<SignupEvent[]>(EVENTS_KEY, (old = []) => {
            const row = payload.new as unknown as SignupEvent;
            if (!row || old.some((e) => e.id === row.id)) return old;
            return [row, ...old].slice(0, EVENTS_LIMIT);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_signup_events" },
        (payload) => {
          queryClient.setQueryData<SignupEvent[]>(EVENTS_KEY, (old = []) =>
            old.map((e) =>
              e.id === (payload.new as any)?.id
                ? { ...e, seen_at: (payload.new as any).seen_at }
                : e
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/* ── Notification settings (email / browser toggles) ── */
export interface NotifySettings {
  email: string;
  emailEnabled: boolean;
  browserEnabled: boolean;
}

const NOTIFY_KEYS = ["admin_notify_email", "admin_notify_email_enabled", "admin_notify_browser_enabled"];

export function useNotifySettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-security-notify-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", NOTIFY_KEYS);
      const map = new Map<string, string>((data ?? []).map((r) => [r.key, r.value ?? ""]));
      return {
        email: map.get("admin_notify_email") ?? "",
        emailEnabled: (map.get("admin_notify_email_enabled") ?? "true") !== "false",
        browserEnabled: (map.get("admin_notify_browser_enabled") ?? "true") !== "false",
      } as NotifySettings;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<NotifySettings>) => {
      const rows: { key: string; value: string }[] = [];
      if (patch.email !== undefined) rows.push({ key: "admin_notify_email", value: patch.email });
      if (patch.emailEnabled !== undefined)
        rows.push({ key: "admin_notify_email_enabled", value: patch.emailEnabled ? "true" : "false" });
      if (patch.browserEnabled !== undefined)
        rows.push({ key: "admin_notify_browser_enabled", value: patch.browserEnabled ? "true" : "false" });

      for (const row of rows) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ value: row.value, updated_at: new Date().toISOString() })
          .eq("key", row.key);
        if (error) throw error;
      }
      return rows;
    },
    onSuccess: (_rows, vars) => {
      queryClient.setQueryData<NotifySettings>(["admin-security-notify-settings"], (old) => ({
        ...(old ?? { email: "", emailEnabled: true, browserEnabled: true }),
        ...vars,
      }));
      toast.success("Paramètres de notification mis à jour");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erreur lors de la sauvegarde"),
  });

  return { settings: query.data, isLoading: query.isLoading, update: mutation.mutateAsync };
}

/* ── Purge old attempts (calls the SECURITY DEFINER RPC) ── */
export function usePurgeSignupAttempts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keepHours: number = 24) => {
      const { data, error } = await supabase.rpc("purge_signup_attempts" as any, { keep_hours: keepHours });
      if (error) throw error;
      return { removed: (data ?? 0) as number, keepHours };
    },
    onSuccess: ({ removed, keepHours }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-security-attempts"] });
      toast.success(
        `${removed} tentative${removed > 1 ? "s" : ""} supprimée${removed > 1 ? "s" : ""} (plus de ${keepHours}h)`
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.message === "forbidden"
          ? "Accès refusé : réservé aux administrateurs de la plateforme"
          : err?.message ?? err?.details ?? "Erreur lors du nettoyage"
      ),
  });
}


/* ── Mark all signup events as seen ── */
export function useMarkEventsSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from("admin_signup_events")
        .update({ seen_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-security-events"] });
      toast.success("Événements marqués comme lus");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erreur"),
  });
}

/* ── Stateful aggregate used by the Security center ── */
export function useSecurityOverview() {
  const attempts = useSignupAttempts();
  const events = useSignupEvents();
  const { settings, isLoading: settingsLoading, update } = useNotifySettings();
  const purge = usePurgeSignupAttempts();
  const markSeen = useMarkEventsSeen();

  const [suspiciousThreshold] = useState(3);
  const grouped = groupAttemptsByIp(attempts.data);
  const suspiciousIps = grouped.filter((g) => g.count >= suspiciousThreshold);
  const last24h = (attempts.data ?? []).filter(
    (a) => Date.now() - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;
  const last24hEvents = (events.data ?? []).filter(
    (e) => Date.now() - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;
  const unreadEvents = (events.data ?? []).filter((e) => !e.seen_at);
  const maxBurst = grouped[0]?.count ?? 0;
  const floodDetected = last24h >= 50 || maxBurst >= 10;

  return {
    attempts,
    events,
    settings,
    settingsLoading,
    updateNotify: update,
    purge,
    markSeen,
    grouped,
    suspiciousIps,
    last24h,
    last24hEvents,
    unreadEvents,
    maxBurst,
    floodDetected,
  };
}
