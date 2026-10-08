import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSupportWhatsapp, buildWhatsappLink } from "@/hooks/useSupportWhatsapp";

const HOUR = 1000 * 60 * 60;

export function TrialBanner() {
  const { data: subscription } = useSubscription();
  const { user } = useAuth();
  const { data: supportWhatsapp } = useSupportWhatsapp();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!subscription || subscription.status !== "trialing" || !subscription.expires_at) return;

    const updateTimer = () => {
      const diff = new Date(subscription.expires_at!).getTime() - Date.now();
      setMsLeft(diff);
      if (diff <= 0) {
        setTimeLeft("Expiré");
        return;
      }
      const days = Math.floor(diff / (24 * HOUR));
      const hours = Math.floor((diff % (24 * HOUR)) / HOUR);
      if (days > 0) {
        setTimeLeft(`${days}j ${hours}h`);
      } else {
        const minutes = Math.floor((diff % HOUR) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}min`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [subscription]);

  if (!subscription || subscription.status !== "trialing") return null;

  // < 48h left → urgent styling and explicit wording.
  const urgent = msLeft !== null && msLeft < 48 * HOUR;
  const expired = msLeft !== null && msLeft <= 0;
  const username = user?.email?.split("@")[0] ?? "";
  const waHref = buildWhatsappLink(
    supportWhatsapp,
    `Bonjour, je suis @${username}. Mon essai RepairPro se termine bientôt, je souhaite activer mon abonnement.`,
  );

  return (
    <div
      className={cn(
        "print:hidden border-b px-4 py-2",
        urgent ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/20",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm">
          {urgent ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-warning" />
          )}
          <span className={cn("font-medium", urgent ? "text-destructive" : "text-foreground")}>
            {expired ? (
              <>Votre essai est terminé. Vos données sont conservées — activez votre formule pour continuer.</>
            ) : urgent ? (
              <>
                Votre essai expire dans <span className="font-bold">{timeLeft}</span>. Vos données restent
                enregistrées — activez votre formule pour continuer sans interruption.
              </>
            ) : (
              <>
                Essai {subscription.plan?.name ? `${subscription.plan.name} ` : ""}:{" "}
                <span className="font-bold">{timeLeft}</span> restants
              </>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {urgent && waHref && (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3 w-3 mr-1" />
                WhatsApp
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant={urgent ? "destructive" : "outline"}
            onClick={() => navigate("/checkout")}
            className="h-7 text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Choisir un plan
          </Button>
        </div>
      </div>
    </div>
  );
}
