import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Store, Phone, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
}

const dismissKey = (userId: string) =>
  `onboarding-reminder-dismissed-${userId}-${new Date().toISOString().slice(0, 10)}`;

export function OnboardingReminderModal({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    try {
      const dismissed = localStorage.getItem(dismissKey(userId));
      if (!dismissed) {
        // Slight delay so it doesn't pop instantly on page mount
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [userId]);

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(userId), "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">
            Donnez vie à votre boutique 🚀
          </DialogTitle>
          <DialogDescription className="text-center">
            Votre compte est actif, il ne reste qu'à configurer votre atelier
            pour offrir une expérience pro à vos clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <Store className="h-4 w-4 shrink-0 text-primary" />
            <span>Nom et logo de la boutique</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            <span>Téléphone et WhatsApp</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span>Adresse et horaires d'ouverture</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={dismiss} className="sm:flex-1">
            Plus tard
          </Button>
          <Button
            onClick={() => {
              dismiss();
              navigate("/onboarding/setup");
            }}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 sm:flex-1"
          >
            Configurer maintenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
