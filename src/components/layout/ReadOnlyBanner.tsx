import { Eye, X, FlaskConical, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function ReadOnlyBanner() {
  const { isImpersonating, isReadOnly, isDemo, impersonatedShopName, exitImpersonation } =
    useImpersonation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Public demo account: friendly, persistent read-only notice with a sign-up CTA.
  if (isDemo) {
    const leaveDemo = async () => {
      await signOut();
      navigate("/auth?tab=register", { replace: true });
    };
    return (
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-primary/15 border-b border-primary/30 text-primary">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FlaskConical className="h-4 w-4" />
          <span>
            Mode démo — explorez librement RepairPro avec des données d'exemple.
          </span>
          <span className="ml-1 text-xs bg-primary/25 px-2 py-0.5 rounded-full">
            Lecture seule
          </span>
        </div>
        <Button
          size="sm"
          className="h-7 px-3 text-xs font-medium"
          onClick={leaveDemo}
        >
          Créer mon compte
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    );
  }

  if (!isImpersonating) return null;

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4" />
        <span>
          Mode lecture seule — Vous visualisez la boutique{" "}
          <strong className="text-amber-100">{impersonatedShopName}</strong>
        </span>
        {isReadOnly && (
          <span className="ml-1 text-xs bg-amber-500/25 px-2 py-0.5 rounded-full">
            Aucune modification possible
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-amber-200 hover:text-amber-100 hover:bg-amber-500/20"
        onClick={exitImpersonation}
      >
        <X className="h-4 w-4 mr-1" />
        Quitter
      </Button>
    </div>
  );
}
