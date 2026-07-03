import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetOwnerPassword } from "@/hooks/useAdmin";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function ResetPasswordDialog({ open, onOpenChange, userId, userName }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const resetPassword = useResetOwnerPassword();

  const isValid = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!isValid) return;
    await resetPassword.mutateAsync({ userId, newPassword });
    setNewPassword("");
    setConfirmPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe de {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div>
            <Label>Confirmer</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!isValid || resetPassword.isPending}>
            {resetPassword.isPending ? "Réinitialisation..." : "Réinitialiser"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
