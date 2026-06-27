import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ShoppingCart, Wrench, Receipt, Wallet } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useSessionTotals, useCloseSession } from "@/hooks/useRegisterSession";
import { printRegisterZReport } from "@/lib/receiptPdf";
import { format as formatDate } from "date-fns";
import { toast } from "sonner";

interface CloseRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseRegisterDialog({ open, onOpenChange }: CloseRegisterDialogProps) {
  const { format } = useCurrency();
  const { settings } = useShopSettingsContext();
  const { data: totals, isLoading } = useSessionTotals();
  const closeSession = useCloseSession();
  const [printing, setPrinting] = useState(false);

  const sales = totals?.sales ?? 0;
  const repairs = totals?.repairs ?? 0;
  const expenses = totals?.expenses ?? 0;
  const net = totals?.net ?? 0;

  const handleConfirm = async () => {
    setPrinting(true);
    try {
      await closeSession.mutateAsync();

      printRegisterZReport({
        shopName: (settings as any).shop_name || "Boutique",
        dateTime: formatDate(new Date(), "dd/MM/yyyy HH:mm"),
        sales: format(sales),
        repairs: format(repairs),
        expenses: format(expenses),
        net: format(net),
      });

      toast.success("Caisse clôturée — nouveau cycle démarré");
      onOpenChange(false);
    } catch {
      /* error toast handled in mutation */
    } finally {
      setPrinting(false);
    }
  };

  const rows = [
    { label: "Total Ventes", value: format(sales), icon: ShoppingCart, sign: "" },
    { label: "Total Réparations", value: format(repairs), icon: Wrench, sign: "" },
    { label: "Total Dépenses", value: `- ${format(expenses)}`, icon: Receipt, sign: "" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clôture de Caisse</DialogTitle>
          <DialogDescription>
            Vérifiez les totaux de la session en cours avant de clôturer. La caisse
            sera remise à zéro et un nouveau cycle démarrera.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <r.icon className="h-4 w-4" />
                  {r.label}
                </span>
                <span className="font-mono text-sm font-semibold">{r.value}</span>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-primary" />
                Net en Caisse
              </span>
              <span className="font-mono text-lg font-bold text-primary">{format(net)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={printing}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={printing || isLoading}>
            {printing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            Confirmer et Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
