import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateEmployeeTransaction, type EmployeeTransaction } from "@/hooks/useEmployeeTransactions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transaction: EmployeeTransaction | null;
}

export function EditEmployeeTransactionDialog({ open, onOpenChange, transaction }: Props) {
  const update = useUpdateEmployeeTransaction();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
      setDescription(transaction.description || "");
      setDate(transaction.transaction_date);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    await update.mutateAsync({
      id: transaction.id,
      amount: num,
      description: description.trim() || null,
      transaction_date: date,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Modifier la transaction</DialogTitle>
            <DialogDescription>
              {transaction.expense_id
                ? "L'écriture liée dans la caisse sera mise à jour automatiquement."
                : "Modifie le montant, la date ou la note."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Montant</Label>
            <Input id="edit-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={update.isPending || !amount}>
              {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
