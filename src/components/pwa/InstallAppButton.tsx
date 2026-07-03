import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton({
  variant = "default",
  className,
}: {
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect already-installed (running as standalone PWA)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("Application installée !");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <Button variant="outline" disabled className={className}>
        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
        Application installée
      </Button>
    );
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS or browsers that don't support beforeinstallprompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info(
          "Sur iPhone : ouvrez le menu Partager et choisissez « Sur l'écran d'accueil »",
          { duration: 8000 }
        );
      } else {
        toast.info(
          "Ouvrez le menu de Chrome (⋮) puis « Installer l'application » ou « Ajouter à l'écran d'accueil »",
          { duration: 8000 }
        );
      }
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <Button variant={variant} onClick={handleInstall} className={className}>
      {deferredPrompt ? (
        <Download className="mr-2 h-4 w-4" />
      ) : (
        <Smartphone className="mr-2 h-4 w-4" />
      )}
      Installer l'application
    </Button>
  );
}
