import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, CheckCircle2, Smartphone, User } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { type RepairStatus } from "./RepairStatusSelect";

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: {
    id: string; customer: string; customer_id: string | null;
    device: string; total: number; paid: number;
  } | null;
  pendingStatus: RepairStatus | null;
  onConfirm: (data: { paymentAmount: number; isFullPayment: boolean }) => void;
  isLoading?: boolean;
}

export function PaymentConfirmDialog({ open, onOpenChange, repair, pendingStatus, onConfirm, isLoading = false }: PaymentConfirmDialogProps) {
  const [paymentOption, setPaymentOption] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const { format } = useCurrency();

  const remaining = repair ? Math.max(0, repair.total - repair.paid) : 0;
  const isAlreadyPaid = remaining <= 0;
  const hasCustomer = repair?.customer_id != null;

  useEffect(() => { if (open) { setPaymentOption("full"); setPartialAmount(""); } }, [open]);

  const handleConfirm = () => {
    if (!repair) return;
    const paymentAmount = isAlreadyPaid
      ? 0
      : paymentOption === "full"
        ? remaining
        : Math.min(Number(partialAmount) || 0, remaining);
    onConfirm({ paymentAmount, isFullPayment: isAlreadyPaid || paymentOption === "full" });
  };

  const debtAmount = paymentOption === "partial" ? remaining - (Number(partialAmount) || 0) : 0;
  const statusLabel = pendingStatus === "completed" ? "Terminé" : "Livré";

  if (!repair) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer le paiement</DialogTitle>
          <DialogDescription>Avant de passer au statut "{statusLabel}", confirmez le paiement de cette réparation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Smartphone className="h-4 w-4" /><span>{repair.device}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /><span>{repair.customer}</span></div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Total réparation</span><span className="font-medium">{format(repair.total)}</span></div>
            <div className="flex justify-between text-sm"><span>Déjà payé</span><span className="font-medium">{format(repair.paid)}</span></div>
            <div className="border-t pt-2 flex justify-between text-sm font-semibold"><span>Reste à payer</span><span className="text-primary">{format(remaining)}</span></div>
          </div>

          {isAlreadyPaid ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <p className="text-sm text-success">
                Cette réparation est déjà entièrement payée. Confirmez pour changer le statut vers "{statusLabel}".
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>Comment souhaitez-vous procéder ?</Label>
                <RadioGroup value={paymentOption} onValueChange={(value) => setPaymentOption(value as "full" | "partial")}>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="full" id="full" className="mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="full" className="font-medium cursor-pointer">Marquer comme entièrement payé</Label>
                      <p className="text-xs text-muted-foreground">Le client paie les {format(remaining)} restants</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="partial" id="partial" className="mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="partial" className="font-medium cursor-pointer">Paiement partiel ou aucun paiement</Label>
                      {paymentOption === "partial" && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Montant reçu:</span>
                            <Input type="number" min="0" max={remaining} step="0.001" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} placeholder="0.000" className="w-32" />
                          </div>
                          {debtAmount > 0 && <p className="text-xs text-warning">→ {format(debtAmount)} sera ajouté aux dettes du client</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {!hasCustomer && paymentOption === "partial" && debtAmount > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">Aucun client associé à cette réparation. La dette de {format(debtAmount)} ne pourra pas être enregistrée.</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-gradient-primary">{isLoading ? "Traitement..." : "Confirmer et changer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
