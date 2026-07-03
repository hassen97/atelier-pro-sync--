import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";

type TableName = "repairs" | "sales" | "products" | "customers" | "suppliers" | "team_tasks";

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  queryKeys: string[][];
}

export function useRealtimeSubscription({ tables, queryKeys }: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  useEffect(() => {
    if (!user || !effectiveUserId) return;

    const channel = supabase.channel("dashboard-realtime");

    // Subscribe to each table
    tables.forEach((table) => {
      // team_tasks uses owner_id instead of user_id
      const filterColumn = table === "team_tasks" ? "owner_id" : "user_id";
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `${filterColumn}=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log(`Realtime update on ${table}:`, payload.eventType);
          
          // Invalidate all related queries
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      );
    });

    channel.subscribe((status) => {
      console.log("Realtime subscription status:", status);
    });

    return () => {
      console.log("Unsubscribing from realtime");
      supabase.removeChannel(channel);
    };
  }, [user, effectiveUserId, queryClient, tables, queryKeys]);
}

// Pre-configured hook for dashboard
export function useDashboardRealtime() {
  useRealtimeSubscription({
    tables: ["repairs", "sales", "products", "customers"],
    queryKeys: [
      ["dashboard-stats"],
      ["recent-repairs"],
      ["low-stock-alerts"],
      ["repairs"],
    ],
  });
}

// Pre-configured hook for team tasks
export function useTeamRealtime() {
  useRealtimeSubscription({
    tables: ["team_tasks"],
    queryKeys: [["team-tasks"]],
  });
}
