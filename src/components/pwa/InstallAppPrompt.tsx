import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { InstallAppButton } from "./InstallAppButton";
import { useIsMobile } from "@/hooks/use-mobile";

const DISMISS_KEY = "rp_install_prompt_dismissed_at";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-offer after 3 days

/** Mobile-only bottom card inviting the user to add RepairPro to the home screen. */
export function InstallAppPrompt() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - dismissedAt < SNOOZE_MS) return;
    const t = setTimeout(() => setVisible(true), 20_000);
    return () => clearTimeout(t);
  }, [isMobile]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="print:hidden fixed inset-x-3 bottom-20 z-40 rounded-xl border border-border bg-card p-4 shadow-xl animate-fade-in">
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Installez RepairPro sur votre téléphone</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ouvrez-le en 1 clic depuis l'écran d'accueil, comme une vraie application — sans chercher l'adresse.
          </p>
        </div>
      </div>
      <InstallAppButton className="mt-3 w-full" />
    </div>
  );
}
