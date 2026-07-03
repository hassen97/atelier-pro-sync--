import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function usePresence(userId: string | undefined) {
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    const updatePresence = async () => {
      const now = Date.now();
      // Throttle: skip if updated less than 30s ago
      if (now - lastUpdate.current < 30000) return;
      lastUpdate.current = now;

      await supabase
        .from("profiles")
        .update({ last_online_at: new Date().toISOString() })
        .eq("user_id", userId);
    };

    // Update immediately
    updatePresence();

    // Update on interval
    const interval = setInterval(updatePresence, UPDATE_INTERVAL);

    // Update on visibility change (tab focus)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);
}
