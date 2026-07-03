import { useState } from "react";
import { useSubmitFeedback } from "@/hooks/useFeedback";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bug, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [type, setType] = useState<"bug" | "suggestion">("bug");
  const [message, setMessage] = useState("");
  const submitFeedback = useSubmitFeedback();
  const { settings } = useShopSettingsContext();

  const handleSubmit = () => {
    if (!message.trim()) return;
    submitFeedback.mutate(
      { type, message, shopName: settings.shop_name },
      {
        onSuccess: () => {
          onOpenChange(false);
          setMessage("");
          setType("bug");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler un problème / Suggérer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Type de retour</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("bug")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                  type === "bug"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Bug className="h-4 w-4" />
                Bug
              </button>
              <button
                type="button"
                onClick={() => setType("suggestion")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                  type === "suggestion"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Lightbulb className="h-4 w-4" />
                Suggestion
              </button>
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === "bug" ? "Décrivez le problème rencontré..." : "Décrivez votre suggestion..."}
              className="min-h-[120px] mt-1.5"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Envoyé depuis : <strong>{settings.shop_name}</strong>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!message.trim() || submitFeedback.isPending}>
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
