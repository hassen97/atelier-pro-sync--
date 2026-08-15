import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUpdateStatus, applyUpdateNow } from "@/lib/swUpdate";
import { UpdateCheckOverlay } from "@/components/landing/UpdateCheckOverlay";

const GATE_DONE_KEY = "auth_update_gate_done";

type GatePhase = "checking" | "current" | "update" | "done";

/**
 * Cinematic update gate for authenticated users, shown ONCE per browser
 * session on app entry. Anonymous visitors never see it (the landing page
 * handles updates with a non-blocking toast instead).
 *
 * - "checking": time-boxed by getUpdateStatus (2.5s) so slow networks never
 *   strand the user on the splash.
 * - "current": brief confirmation tick, then the app is revealed.
 * - "update": blocks until the user refreshes — fresh hashed chunks are
 *   required, and an authenticated session can afford a hard reload safely.
 */
export function AuthUpdateGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<GatePhase>(() => {
    try {
      return sessionStorage.getItem(GATE_DONE_KEY) ? "done" : "checking";
    } catch {
      return "done";
    }
  });

  useEffect(() => {
    if (phase === "done" || loading) return;
    // Only gate authenticated sessions; anonymous visitors skip straight in.
    if (!user) {
      markDone();
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    function markDone() {
      try {
        sessionStorage.setItem(GATE_DONE_KEY, "1");
      } catch {
        /* sessionStorage unavailable — gate simply won't persist */
      }
      setPhase("done");
    }

    getUpdateStatus(2500)
      .then((status) => {
        if (!active) return;
        if (status === "update") {
          setPhase("update");
        } else {
          setPhase("current");
          timer = setTimeout(() => active && markDone(), 800);
        }
      })
      .catch(() => {
        if (active) markDone();
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [phase, loading, user]);

  if (phase === "done") return <>{children}</>;
  return <UpdateCheckOverlay state={phase} onRefresh={() => applyUpdateNow()} />;
}
