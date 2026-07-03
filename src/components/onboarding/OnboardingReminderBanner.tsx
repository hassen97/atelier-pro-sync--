import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  shopName?: string | null;
}

export function OnboardingReminderBanner({ shopName }: Props) {
  const navigate = useNavigate();

  return (
    <div
      role="alert"
      className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground sm:text-base">
              Votre boutique n'est pas encore configurée
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Ajoutez votre logo, vos coordonnées et vos horaires en 2 minutes pour
              une page de suivi pro.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/onboarding/setup")}
          className="shrink-0 bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          Compléter maintenant
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
