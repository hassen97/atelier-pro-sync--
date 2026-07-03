import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useCreateEmployeeTransaction, type EmployeeTxType } from "@/hooks/useEmployeeTransactions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: EmployeeTxType;
  employeeId: string;
  employeeName: string;
  defaultAmount?: number;
}

const META: Record<EmployeeTxType, { title: string; desc: string; cashOption: boolean; cta: string }> = {
  avance_salaire: {
    title: "Accorder une avance",
    desc: "Avance sur salaire à déduire de la paie de fin de mois.",
    cashOption: true,
    cta: "Enregistrer l'avance",
  },
  prime_bonus: {
    title: "Verser une prime",
    desc: "Prime ou bonus accordé à l'employé (à ajouter au net).",
    cashOption: false,
    cta: "Enregistrer la prime",
  },
  remboursement_frais: {
    title: "Saisir une dépense remboursable",
    desc: "L'employé a avancé de l'argent pour la boutique. À lui rembourser.",
    cashOption: false,
    cta: "Enregistrer la dépense",
  },
  salary_payment: {
    title: "Marquer le salaire comme payé",
    desc: "Enregistre le versement du net à payer à l'employé.",
    cashOption: true,
    cta: "Confirmer le paiement",
  },
};

export function EmployeeTransactionDialog({ open, onOpenChange, type, employeeId, employeeName, defaultAmount }: Props) {
  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : "");
  const [description, setDescription] = useState("");
  const [paidInCash, setPaidInCash] = useState(true);
  const meta = META[type];
  const create = useCreateEmployeeTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    await create.mutateAsync({
      employeeId,
      employeeName,
      type,
      amount: num,
      description: description.trim() || undefined,
      paidInCash: meta.cashOption ? paidInCash : false,
    });
    setAmount("");
    setDescription("");
    setPaidInCash(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription>
              {meta.desc} <span className="font-medium text-foreground">({employeeName})</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Note interne…"
            />
          </div>

          {meta.cashOption && (
            <label className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer">
              <Checkbox
                checked={paidInCash}
                onCheckedChange={(v) => setPaidInCash(!!v)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Payé en espèces</span> — créer automatiquement une dépense dans la caisse pour équilibrer le tiroir.
              </span>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending || !amount}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {meta.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
