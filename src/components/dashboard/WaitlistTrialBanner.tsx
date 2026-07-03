import { useEffect, useState } from "react";
import { Gift, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Bannière affichée uniquement aux propriétaires qui bénéficient
 * du cadeau "3 jours Pro" reçu via la liste d'attente.
 * Disparaît automatiquement à expiration.
 */
export function WaitlistTrialBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    (async () => {
      // Check if user has a trial granted via waitlist
      const { data: waitlistRow } = await supabase
        .from("waitlist" as any)
        .select("trial_granted_at")
        .eq("signed_up_user_id", user.id)
        .maybeSingle();

      if (cancelled || !waitlistRow || !(waitlistRow as any).trial_granted_at) return;

      const { data: sub } = await supabase
        .from("shop_subscriptions")
        .select("expires_at, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !sub?.expires_at) return;
      const exp = new Date(sub.expires_at);
      if (exp.getTime() <= Date.now()) return;
      setExpiresAt(exp);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
      setHoursLeft(diff > 0 ? diff : null);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt || hoursLeft === null || hoursLeft <= 0) return null;

  const label =
    hoursLeft >= 24
      ? `${Math.floor(hoursLeft / 24)}j ${Math.round(hoursLeft % 24)}h`
      : `${Math.max(1, Math.round(hoursLeft))}h`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-fuchsia-500/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 text-white shadow-lg shadow-cyan-500/30">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              🎁 Cadeau de bienvenue : 3 jours Pro offerts
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Merci d'avoir rejoint la liste d'attente — votre essai expire dans{" "}
              <b className="text-cyan-300">{label}</b>.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/pricing")}
          className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400 self-start sm:self-center"
        >
          Voir les plans
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
