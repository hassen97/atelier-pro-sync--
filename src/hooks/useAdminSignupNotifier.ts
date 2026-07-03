import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Subscribes to realtime inserts on `admin_signup_events` and fires
 * a browser Notification + toast when a new shop signs up.
 * Mounted inside AdminDashboard.
 */
export function useAdminSignupNotifier() {
  const browserEnabledRef = useRef(true);

  useEffect(() => {
    let mounted = true;

    // Read browser-toggle once
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "admin_notify_browser_enabled")
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) browserEnabledRef.current = (data as any)?.value !== "false";
      });

    const channel = supabase
      .channel("admin-signup-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_signup_events" },
        (payload) => {
          const row: any = payload.new;
          const label = `${row.full_name || row.username || "Nouveau compte"}${
            row.country ? ` · ${row.country}` : ""
          }`;
          toast.success("Nouvelle inscription", { description: label });

          if (
            browserEnabledRef.current &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("Nouvelle inscription RepairPro", {
                body: label,
                icon: "/favicon.ico",
                tag: `signup-${row.id}`,
              });
            } catch (e) {
              console.error("[useAdminSignupNotifier] notification error:", e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);
}
