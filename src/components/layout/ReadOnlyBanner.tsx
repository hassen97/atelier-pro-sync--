import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function ReadOnlyBanner() {
  const { isImpersonating, isReadOnly, impersonatedShopName, exitImpersonation } = useImpersonation();

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
