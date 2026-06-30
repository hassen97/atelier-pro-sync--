import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * One-click public demo: asks the `demo-login` edge function for a fresh,
 * server-minted session for the shared read-only demo account, then enters
 * the dashboard. No credentials are ever exposed to the client.
 */
export function useDemoLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startDemo = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-login");
      if (error || !data?.access_token || !data?.refresh_token) {
        throw error ?? new Error("Réponse invalide");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      toast.success("Bienvenue dans la démo RepairPro 👋");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("demo login failed", err);
      toast.error("Impossible de lancer la démo. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }, [loading, navigate]);

  return { startDemo, loading };
}
