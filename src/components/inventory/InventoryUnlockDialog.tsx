import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InventoryUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (code: string) => Promise<boolean>;
  verifying: boolean;
}

export function InventoryUnlockDialog({ open, onOpenChange, onVerify, verifying }: InventoryUnlockDialogProps) {
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    const success = await onVerify(code);
    if (success) {
      setCode("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Déverrouiller l'inventaire
          </DialogTitle>
          <DialogDescription>
            Entrez le code temporaire fourni par le propriétaire pour modifier l'inventaire.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-code">Code à 6 chiffres</Label>
            <Input
              id="unlock-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-[0.5em]"
              maxLength={6}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={code.length !== 6 || verifying}
          >
            {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            {verifying ? "Vérification..." : "Déverrouiller"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
