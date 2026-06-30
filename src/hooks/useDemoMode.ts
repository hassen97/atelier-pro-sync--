import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Detects whether the currently signed-in user is the shared public demo account.
 * The demo account id is published (read-only) in `platform_settings.demo_user_id`.
 */
export function useDemoMode() {
  const { user } = useAuth();
  const [demoUserId, setDemoUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "demo_user_id")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setDemoUserId((data as { value?: string } | null)?.value ?? null);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const isDemo = loaded && !!user && !!demoUserId && user.id === demoUserId;

  return { isDemo, demoUserId, loaded };
}
