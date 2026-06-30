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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Printer,
  ShoppingCart,
  Wrench,
  Receipt,
  Wallet,
  FileDown,
  Undo2,
  Package,
  CreditCard,
  Boxes,
  Sheet,
} from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import {
  useClosingReport,
  useCloseSession,
  type ClosingReport,
} from "@/hooks/useRegisterSession";
import {
  printRegisterZReport,
  generateClosingReportPdf,
  type ClosingBreakdownRow,
} from "@/lib/receiptPdf";
import { generateClosingReportExcel } from "@/lib/closingReportExcel";
import { format as formatDate } from "date-fns";
import { toast } from "sonner";

interface CloseRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseRegisterDialog({ open, onOpenChange }: CloseRegisterDialogProps) {
  const { format } = useCurrency();
  const { settings } = useShopSettingsContext();
  const { data: report, isLoading } = useClosingReport(open);
  const closeSession = useCloseSession();
  const [busy, setBusy] = useState<"pdf" | "thermal" | "excel" | "close" | null>(null);

  const t = report?.totals;
  const sales = t?.sales ?? 0;
  const repairs = t?.repairs ?? 0;
  const returns = t?.returns ?? 0;
  const expenses = t?.expenses ?? 0;
  const net = t?.net ?? 0;

  const shopName = (settings as any).shop_name || "Boutique";
  const nowStr = () => formatDate(new Date(), "dd/MM/yyyy HH:mm");

  const catRows = (r: ClosingReport): ClosingBreakdownRow[] =>
    r.byCategory.map((c) => ({
      label: c.category,
      value: format(c.revenue),
      meta: `${c.items}`,
    }));
  const prodRows = (r: ClosingReport): ClosingBreakdownRow[] =>
    (r.byProduct || []).map((p) => ({
      label: p.product_name,
      value: format(p.revenue),
      meta: `${p.quantity}`,
    }));
  const repairBreakdown = (r: ClosingReport): ClosingBreakdownRow[] =>
    (r.repairs.rows || []).map((rp) => ({
      label: rp.label,
      value: format(rp.amount),
      meta: rp.customer || undefined,
    }));
  const payRows = (r: ClosingReport): ClosingBreakdownRow[] =>
    r.byPaymentMethod.map((p) => ({ label: p.method, value: format(p.revenue) }));

  const handlePdf = async () => {
    if (!report) return;
    setBusy("pdf");
    try {
      await generateClosingReportPdf(
        {
          shopName,
          address: (settings as any).address,
          phone: (settings as any).phone,
          logoUrl: (settings as any).logo_url,
          dateTime: nowStr(),
          closedBy: null,
          byCategory: report.byCategory,
          byPaymentMethod: report.byPaymentMethod,
          returns: report.returns.rows,
          expenses: report.expenses.rows,
          totals: report.totals,
        },
        format
      );
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setBusy(null);
    }
  };

  const handleThermal = () => {
    if (!report) return;
    setBusy("thermal");
    try {
      printRegisterZReport({
        shopName,
        dateTime: nowStr(),
        sales: format(sales),
        repairs: format(repairs),
        expenses: format(expenses),
        returns: returns > 0 ? format(returns) : null,
        net: format(net),
        itemsSold: report.totals.itemsSold,
        byCategory: catRows(report),
        byPaymentMethod: payRows(report),
      });
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = async () => {
    setBusy("close");
    try {
      await closeSession.mutateAsync({ report: report ?? null });

      printRegisterZReport({
        shopName,
        dateTime: nowStr(),
        sales: format(sales),
        repairs: format(repairs),
        expenses: format(expenses),
        returns: returns > 0 ? format(returns) : null,
        net: format(net),
        itemsSold: report?.totals.itemsSold,
        byCategory: report ? catRows(report) : [],
        byPaymentMethod: report ? payRows(report) : [],
      });

      toast.success("Caisse clôturée — nouveau cycle démarré");
      onOpenChange(false);
    } catch {
      /* error toast handled in mutation */
    } finally {
      setBusy(null);
    }
  };

  const summaryRows = [
    { label: "Total Ventes", value: format(sales), icon: ShoppingCart, negative: false },
    { label: "Total Réparations", value: format(repairs), icon: Wrench, negative: false },
    ...(returns > 0
      ? [{ label: "Total Retours", value: `- ${format(returns)}`, icon: Undo2, negative: true }]
      : []),
    { label: "Total Dépenses", value: `- ${format(expenses)}`, icon: Receipt, negative: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clôture de Caisse</DialogTitle>
          <DialogDescription>
            Vérifiez le détail de la session en cours avant de clôturer. La caisse
            sera remise à zéro et un nouveau cycle démarrera.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4 py-1">
              {/* Summary */}
              <div className="space-y-2">
                {summaryRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <r.icon className="h-4 w-4" />
                      {r.label}
                    </span>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        r.negative ? "text-destructive" : ""
                      }`}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Wallet className="h-4 w-4 text-primary" />
                    Net en Caisse
                  </span>
                  <span className="font-mono text-lg font-bold text-primary">
                    {format(net)}
                  </span>
                </div>
              </div>

              {/* Category breakdown */}
              {report && report.byCategory.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Package className="h-3.5 w-3.5" /> Ventes par catégorie
                  </p>
                  <div className="rounded-lg border divide-y">
                    {report.byCategory.map((c) => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {c.category}{" "}
                          <span className="text-xs opacity-70">({c.items} art.)</span>
                        </span>
                        <span className="font-mono font-medium">{format(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment method breakdown */}
              {report && report.byPaymentMethod.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" /> Modes de paiement
                  </p>
                  <div className="rounded-lg border divide-y">
                    {report.byPaymentMethod.map((p) => (
                      <div
                        key={p.method}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {p.method}{" "}
                          <span className="text-xs opacity-70">({p.count})</span>
                        </span>
                        <span className="font-mono font-medium">{format(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Returns */}
              {report && report.returns.rows.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Undo2 className="h-3.5 w-3.5" /> Retours
                  </p>
                  <div className="rounded-lg border divide-y">
                    {report.returns.rows.map((r, i) => (
                      <div
                        key={`${r.product_name}-${i}`}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {r.product_name}{" "}
                          <span className="text-xs opacity-70">x{r.quantity}</span>
                        </span>
                        <span className="font-mono font-medium text-destructive">
                          - {format(r.refund_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePdf}
              disabled={!!busy || isLoading || !report}
            >
              {busy === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Exporter en PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleThermal}
              disabled={!!busy || isLoading || !report}
            >
              {busy === "thermal" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              80mm
            </Button>
          </div>
          <Button onClick={handleConfirm} disabled={!!busy || isLoading}>
            {busy === "close" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Valider la Clôture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
