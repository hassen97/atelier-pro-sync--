import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { resolveSupplierProofUrl } from "@/lib/supplierProofs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Phone,
  MessageCircle,
  Edit,
  RefreshCcw,
  ChevronDown,
  Receipt,
  ExternalLink,
  ShoppingCart,
  BookOpen,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { getThermalPrintCss, printThermalHtml, thermalEscape } from "@/lib/receiptPdf";
import {
  Supplier,
  SupplierTransaction,
  useSupplierTransactions,
  useSupplierPurchases,
  useRecalculateSupplierBalance,
} from "@/hooks/useSuppliers";

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^00/, "+");
}

interface SupplierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onEdit: (supplier: Supplier) => void;
  onPayment: (supplier: Supplier) => void;
}

export function SupplierDetailSheet({
  open,
  onOpenChange,
  supplier,
  onEdit,
  onPayment,
}: SupplierDetailSheetProps) {
  const { format: formatCurrency } = useCurrency();
  const [whatsappPopoverOpen, setWhatsappPopoverOpen] = useState(false);

  const { data: transactions = [], isLoading: txLoading } = useSupplierTransactions(
    open ? supplier?.id ?? null : null
  );
  const { data: purchases = [], isLoading: purchasesLoading } = useSupplierPurchases(
    open ? supplier?.id ?? null : null
  );
  const recalculate = useRecalculateSupplierBalance();

  if (!supplier) return null;

  const currentDebt = Math.abs(Math.min(0, Number(supplier.balance)));

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const openWhatsApp = (templateNum: 1 | 2) => {
    if (!supplier.phone) return;
    const phone = cleanPhone(supplier.phone);
    let text = "";
    if (templateNum === 1) {
      text = `Bonjour ${supplier.name}, je souhaite passer une commande pour les articles suivants...`;
    } else {
      text = `Bonjour ${supplier.name}, je viens de vous envoyer un paiement de ${formatCurrency(currentDebt)} DT. Merci de confirmer.`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    setWhatsappPopoverOpen(false);
  };

  const handlePrintTransaction = async (tx: SupplierTransaction & { computedBalance: number }) => {
    // Resolve a viewable URL for the proof (legacy public URL or signed URL for private bucket)
    const proofViewUrl = tx.proof_url ? await resolveSupplierProofUrl(tx.proof_url, 600) : null;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Paiement fournisseur</title><style>${getThermalPrintCss("72mm", "12px")}</style></head>
      <body class="thermal-print-root"><main class="thermal-print-container">
        <p class="shop-name">REÇU FOURNISSEUR</p>
        <div class="sep-bold"></div>
        <p class="field">Fournisseur : ${thermalEscape(supplier.name)}</p>
        <p class="field">Date : ${format(new Date(tx.created_at), "dd/MM/yyyy", { locale: fr })}</p>
        <p class="field">Type : ${tx.type === "purchase" ? "Achat" : "Paiement"}</p>
        <p class="field">Description : ${thermalEscape(tx.description || "—")}</p>
        ${proofViewUrl ? `<p class="field">Preuve jointe</p><img src="${thermalEscape(proofViewUrl)}" style="display:block;max-width:60mm;margin:2mm auto;height:auto;" alt="preuve" />` : ""}
        <div class="sep-bold"></div>
        <div class="total-row grand"><span>Montant :</span><span class="val">${formatCurrency(tx.amount)}</span></div>
        <div class="total-row"><span>Solde :</span><span class="val">${formatCurrency(Math.abs(tx.computedBalance))}</span></div>
        <div class="sep-bold"></div>
      </main></body></html>`;
    printThermalHtml(html, "width=400,height=600");
  };

  const handleViewProof = async (proofValue: string | null | undefined) => {
    const url = await resolveSupplierProofUrl(proofValue, 300);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // Compute running balance client-side for display
  const txWithBalance: (SupplierTransaction & { computedBalance: number })[] = [];
  let running = 0;
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  for (const tx of sortedTx) {
    if (tx.type === "purchase") {
      running -= tx.amount;
    } else {
      running += tx.amount;
    }
    txWithBalance.push({ ...tx, computedBalance: running });
  }
  // Reverse for display (newest first)
  const displayTx = [...txWithBalance].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader className="pb-4 border-b">
          {/* Supplier header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-accent/10 text-accent font-semibold text-lg">
                  {getInitials(supplier.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-lg">{supplier.name}</SheetTitle>
                {supplier.phone && (
                  <p className="text-sm text-muted-foreground">{supplier.phone}</p>
                )}
                <Badge
                  className={cn(
                    "mt-1",
                    currentDebt > 0
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                  )}
                >
                  {currentDebt > 0 ? `À payer: ${formatCurrency(currentDebt)}` : "Soldé"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap pt-1">
            {supplier.phone && (
              <>
                <a href={`tel:${cleanPhone(supplier.phone)}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Appeler
                  </Button>
                </a>
                <Popover open={whatsappPopoverOpen} onOpenChange={setWhatsappPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-[hsl(142,70%,45%)] border-[hsl(142,70%,45%)]/30 hover:bg-[hsl(142,70%,45%)]/10">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Choisir un modèle de message</p>
                    <button
                      onClick={() => openWhatsApp(1)}
                      className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      <p className="font-medium text-xs text-muted-foreground mb-0.5">Commande</p>
                      <p className="text-xs truncate">Bonjour {supplier.name}, je souhaite passer une commande...</p>
                    </button>
                    <button
                      onClick={() => openWhatsApp(2)}
                      className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      <p className="font-medium text-xs text-muted-foreground mb-0.5">Confirmation paiement</p>
                      <p className="text-xs truncate">Bonjour {supplier.name}, paiement de {formatCurrency(currentDebt)}...</p>
                    </button>
                    {supplier.phone && (
                      <a
                        href={`https://wa.me/${cleanPhone(supplier.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 w-full px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-xs text-muted-foreground"
                        onClick={() => setWhatsappPopoverOpen(false)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Message personnalisé
                      </a>
                    )}
                  </PopoverContent>
                </Popover>
              </>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(supplier)}>
              <Edit className="h-3.5 w-3.5" />
              Modifier
            </Button>
            {currentDebt > 0 && (
              <Button size="sm" className="gap-1.5 bg-gradient-primary hover:opacity-90" onClick={() => onPayment(supplier)}>
                <Receipt className="h-3.5 w-3.5" />
                Payer
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="ledger" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="ledger" className="flex-1 gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Grand Livre
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex-1 gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              Achats
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Financial Ledger */}
          <TabsContent value="ledger" className="mt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {displayTx.length} transaction{displayTx.length !== 1 ? "s" : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={recalculate.isPending}
                onClick={() => recalculate.mutate(supplier.id)}
              >
                <RefreshCcw className={cn("h-3 w-3", recalculate.isPending && "animate-spin")} />
                Recalculer
              </Button>
            </div>

            {txLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : displayTx.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucune transaction enregistrée
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Montant</TableHead>
                      <TableHead className="text-xs text-right">Solde</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTx.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(tx.created_at), "dd/MM/yy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs",
                              tx.type === "purchase"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-success/10 text-success border-success/20"
                            )}
                          >
                            {tx.type === "purchase" ? "Achat" : "Paiement"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">
                          <div className="flex items-center gap-1">
                            {tx.description || "—"}
                            {tx.proof_url && (
                              <button
                                type="button"
                                onClick={() => handleViewProof(tx.proof_url)}
                                className="inline-flex items-center"
                                aria-label="Voir la preuve"
                              >
                                <ExternalLink className="h-3 w-3 text-primary" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-xs text-right font-medium", tx.type === "purchase" ? "text-destructive" : "text-success")}>
                          {tx.type === "purchase" ? "-" : "+"}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className={cn("text-xs text-right font-semibold", tx.computedBalance < 0 ? "text-destructive" : "text-success")}>
                          {formatCurrency(Math.abs(tx.computedBalance))}
                          {tx.computedBalance < 0 ? " D" : " ✓"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintTransaction(tx)}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Purchase History */}
          <TabsContent value="purchases" className="mt-3">
            {purchasesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucun achat enregistré
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Article</TableHead>
                      <TableHead className="text-xs text-center">Qté</TableHead>
                      <TableHead className="text-xs text-right">P.U.</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(p.created_at), "dd/MM/yy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[130px] truncate">
                          {p.item_name}
                        </TableCell>
                        <TableCell className="text-xs text-center">{p.quantity}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(p.unit_price)}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">{formatCurrency(p.total_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
