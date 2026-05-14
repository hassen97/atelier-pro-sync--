import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { format } = useCurrency();
  const remaining = repair ? Math.max(0, repair.total - repair.paid) : 0;
  const isAlreadyPaid = remaining <= 0;
  const hasCustomer = repair?.customer_id != null;

  const [amountInput, setAmountInput] = useState("");

  useEffect(() => {
    if (open) setAmountInput(remaining > 0 ? String(remaining) : "0");
  }, [open, remaining]);

  const rawAmount = Number(amountInput) || 0;
  const paymentAmount = Math.min(Math.max(0, rawAmount), remaining);
  const debtAmount = Math.max(0, remaining - paymentAmount);
  const isFullPayment = isAlreadyPaid || paymentAmount >= remaining;
  const statusLabel = pendingStatus === "completed" ? "Terminé" : "Livré";

  const handleConfirm = () => {
    if (!repair) return;
    onConfirm({ paymentAmount: isAlreadyPaid ? 0 : paymentAmount, isFullPayment });
  };

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
            <div className="space-y-3">
              <Label htmlFor="amount-received" className="text-base">Montant reçu du client</Label>
              <Input
                id="amount-received"
                type="number"
                min="0"
                max={remaining}
                step="0.001"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="h-12 text-lg font-semibold"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setAmountInput(String(remaining))}>
                  Payé intégralement ({format(remaining)})
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAmountInput("0")}>
                  Aucun paiement
                </Button>
              </div>

              {isFullPayment ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <p className="text-sm text-success">Réparation entièrement payée.</p>
                </div>
              ) : paymentAmount > 0 ? (
                <p className="text-xs text-warning">→ {format(debtAmount)} sera ajouté aux dettes du client</p>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun paiement enregistré, {format(remaining)} restera en dette</p>
              )}

              {!hasCustomer && debtAmount > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">Aucun client associé à cette réparation. La dette de {format(debtAmount)} ne pourra pas être enregistrée.</p>
                </div>
              )}
            </div>
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
