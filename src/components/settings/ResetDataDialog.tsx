import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle } from "lucide-react";

const DATA_CATEGORIES = [
  { id: "products", label: "Produits et catégories" },
  { id: "customers", label: "Clients" },
  { id: "suppliers", label: "Fournisseurs" },
  { id: "repairs", label: "Réparations (et pièces utilisées)" },
  { id: "sales", label: "Ventes (et articles vendus)" },
  { id: "invoices", label: "Factures" },
  { id: "expenses", label: "Dépenses" },
] as const;

interface ResetDataDialogProps {
  onConfirm: (categories: string[]) => Promise<boolean>;
  isResetting: boolean;
}

export function ResetDataDialog({ onConfirm, isResetting }: ResetDataDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const allSelected = selected.length === DATA_CATEGORIES.length;
  const isConfirmValid = confirmText === "SUPPRIMER" && selected.length > 0;

  const toggleCategory = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : DATA_CATEGORIES.map((c) => c.id));
  };

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    const success = await onConfirm(selected);
    if (success) {
      setOpen(false);
      setConfirmText("");
      setSelected([]);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setConfirmText("");
      setSelected([]);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          Réinitialiser les données
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Réinitialiser les données
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                <strong>Choisissez les données à supprimer.</strong> Cette action est irréversible !
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor="select-all" className="text-foreground font-medium cursor-pointer">
                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </Label>
                </div>

                <div className="border rounded-md p-3 space-y-2">
                  {DATA_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={selected.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <Label htmlFor={`cat-${cat.id}`} className="text-foreground cursor-pointer">
                        {cat.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Label htmlFor="confirm-text" className="text-foreground font-medium">
                  Tapez <span className="font-mono text-destructive">SUPPRIMER</span> pour confirmer :
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="mt-2"
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isResetting}
          >
            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isResetting
              ? "Suppression..."
              : `Supprimer${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
