import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function TrialBanner() {
  const { data: subscription } = useSubscription();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!subscription || subscription.status !== "trialing" || !subscription.expires_at) return;

    const updateTimer = () => {
      const end = new Date(subscription.expires_at!).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Expiré");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setTimeLeft(`${days}j ${hours}h`);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}min`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [subscription]);

  if (!subscription || subscription.status !== "trialing") return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-amber-700 dark:text-amber-300 font-medium">
            Essai gratuit : <span className="font-bold">{timeLeft}</span> restants
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/checkout")}
          className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
        >
          <Zap className="h-3 w-3 mr-1" />
          Passer en Pro
        </Button>
      </div>
    </div>
  );
}
