import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSupplierBalance, Supplier } from "@/hooks/useSuppliers";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, X, Camera } from "lucide-react";
import { ProofPickerSheet } from "@/components/ui/ProofPickerSheet";

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function SupplierPaymentDialog({ open, onOpenChange, supplier }: SupplierPaymentDialogProps) {
  const updateBalance = useUpdateSupplierBalance();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { format } = useCurrency();

  const proofPreviewUrl = useMemo(
    () => (proofFile ? URL.createObjectURL(proofFile) : null),
    [proofFile]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !amount) return;
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    let proofUrl: string | undefined;

    if (proofFile) {
      setUploading(true);
      try {
        // Resolve owner id (employees inherit owner's bucket folder via storage RLS).
        const { data: authData } = await supabase.auth.getUser();
        const callerId = authData.user?.id;
        if (!callerId) throw new Error("Not authenticated");
        const { data: teamRow } = await supabase
          .from("team_members")
          .select("owner_id")
          .eq("member_user_id", callerId)
          .eq("status", "active")
          .maybeSingle();
        const ownerId = (teamRow as any)?.owner_id || callerId;

        const ext = proofFile.name.split(".").pop();
        // Path format: <ownerId>/<supplierId>/<timestamp>.<ext>
        // Required by the supplier-proofs storage RLS (owner-or-team scoped).
        const filePath = `${ownerId}/${supplier.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("supplier-proofs")
          .upload(filePath, proofFile);

        if (!uploadError) {
          // Store the storage path (not a public URL). The viewer
          // generates a short-lived signed URL on demand.
          proofUrl = filePath;
        }
      } catch {
        // proceed without proof if upload fails
      } finally {
        setUploading(false);
      }
    }

    try {
      await updateBalance.mutateAsync({
        id: supplier.id,
        amount: paymentAmount,
        proofUrl,
        description: description || undefined,
      });
      setAmount("");
      setDescription("");
      setProofFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const currentDebt = supplier ? Math.abs(Math.min(0, Number(supplier.balance))) : 0;
  const isPending = updateBalance.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        {supplier && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{supplier.name}</p>
              <p className="text-sm text-muted-foreground">
                Dette actuelle: <span className="text-destructive font-medium">{format(currentDebt)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant du paiement</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                max={currentDebt > 0 ? currentDebt : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Virement bancaire, espèces..."
              />
            </div>

            <div className="space-y-2">
              <Label>Preuve de paiement (optionnel)</Label>
              {proofFile && proofPreviewUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={proofPreviewUrl}
                    alt="Preuve"
                    className="w-full max-h-40 object-contain bg-muted/30"
                  />
                  <button
                    type="button"
                    onClick={() => setProofFile(null)}
                    className="absolute top-2 right-2 rounded-full p-1 bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-xs text-muted-foreground p-2 truncate">{proofFile.name}</p>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setPickerOpen(true)}
                >
                  <Camera className="h-4 w-4" />
                  Choisir un fichier
                </Button>
              )}
              <ProofPickerSheet
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onFileSelected={setProofFile}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
