import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Search, Undo2, Package, CreditCard } from "lucide-react";
import { useSearchSaleForReturn, useCreateProductReturn } from "@/hooks/useProductReturns";
import { useCurrency } from "@/hooks/useCurrency";

interface ProductReturnDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductReturnDrawer({ open, onOpenChange }: ProductReturnDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [stockAvailable, setStockAvailable] = useState(true);
  const [refundCash, setRefundCash] = useState(true);

  const searchSale = useSearchSaleForReturn();
  const createReturn = useCreateProductReturn();
  const { format } = useCurrency();

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      searchSale.mutate(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, open]);

  // Load recent sales on open
  useEffect(() => {
    if (open && !searchSale.data) {
      searchSale.mutate("");
    }
  }, [open]);

  const refundAmount = selectedItem ? returnQty * Number(selectedItem.unit_price) : 0;

  const handleSubmit = () => {
    if (!selectedSale || !selectedItem) return;
    createReturn.mutate({
      sale_id: selectedSale.id,
      sale_item_id: selectedItem.id,
      customer_id: selectedSale.customer_id || undefined,
      product_id: selectedItem.product_id,
      product_name: selectedItem.product?.name || "Produit",
      quantity: returnQty,
      unit_price: Number(selectedItem.unit_price),
      refund_amount: refundAmount,
      refund_method: refundCash ? "cash" : "store_credit",
      stock_destination: stockAvailable ? "available" : "defective",
      reason,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
        localStorage.removeItem("repairpro_draft_product_return");
      },
    });
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedSale(null);
    setSelectedItem(null);
    setReturnQty(1);
    setReason("");
    setNotes("");
    setStockAvailable(true);
    setRefundCash(true);
  };

  // Auto-save draft for reason/notes
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (reason || notes) {
        localStorage.setItem("repairpro_draft_product_return", JSON.stringify({ reason, notes, returnQty, stockAvailable, refundCash }));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [reason, notes, returnQty, stockAvailable, refundCash, open]);

  // Restore draft on open
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem("repairpro_draft_product_return");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.reason) setReason(draft.reason);
        if (draft.notes) setNotes(draft.notes);
        if (draft.returnQty) setReturnQty(draft.returnQty);
        if (draft.stockAvailable !== undefined) setStockAvailable(draft.stockAvailable);
        if (draft.refundCash !== undefined) setRefundCash(draft.refundCash);
      }
    } catch {}
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" />
            Retour Produit
          </SheetTitle>
          <SheetDescription>Recherchez la vente originale pour traiter le retour</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Rechercher la vente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom produit, code-barres, tél client, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {!searchQuery && <p className="text-xs text-muted-foreground">Ventes récentes affichées par défaut</p>}
          </div>

          {/* Search Results */}
          {searchSale.data && searchSale.data.length > 0 && !selectedSale && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchSale.data.map((sale: any) => (
                <Card key={sale.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedSale(sale)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{sale.customer?.name || "Client anonyme"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString("fr-FR")} • {sale.sale_items?.length || 0} article(s)
                        </p>
                      </div>
                      <span className="text-sm font-mono-numbers font-medium">{format(Number(sale.total_amount))}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchSale.data && searchSale.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Aucune vente trouvée</p>
          )}

          {/* Selected Sale — Pick Item */}
          {selectedSale && !selectedItem && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sélectionnez l'article à retourner</Label>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedSale(null)}>Changer</Button>
              </div>
              {selectedSale.sale_items?.map((item: any) => (
                <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setSelectedItem(item); setReturnQty(1); }}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.product?.name || "Produit"}</p>
                      <p className="text-xs text-muted-foreground">Qté: {item.quantity} • {format(Number(item.unit_price))}/u</p>
                    </div>
                    <span className="text-sm font-mono-numbers">{format(item.quantity * Number(item.unit_price))}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Return Form */}
          {selectedItem && (
            <div className="space-y-4 border-t pt-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{selectedItem.product?.name || "Produit"}</p>
                  <p className="text-xs text-muted-foreground">
                    Acheté: {selectedItem.quantity} unité(s) à {format(Number(selectedItem.unit_price))}
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs mt-1 h-6 px-2" onClick={() => setSelectedItem(null)}>Changer d'article</Button>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Quantité à retourner</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedItem.quantity}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.min(Number(e.target.value), selectedItem.quantity))}
                />
              </div>

              <div className="space-y-2">
                <Label>Raison du retour</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Produit défectueux, erreur de commande..." />
              </div>

              {/* Stock destination toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{stockAvailable ? "Stock disponible" : "Défectueux / Perte"}</p>
                    <p className="text-xs text-muted-foreground">{stockAvailable ? "Remis en vente" : "Non revendable"}</p>
                  </div>
                </div>
                <Switch checked={stockAvailable} onCheckedChange={setStockAvailable} />
              </div>

              {/* Refund method toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{refundCash ? "Remboursement espèces" : "Avoir client"}</p>
                    <p className="text-xs text-muted-foreground">{refundCash ? "Sortie de caisse" : "Crédit sur le compte client"}</p>
                  </div>
                </div>
                <Switch checked={refundCash} onCheckedChange={setRefundCash} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes additionnelles..." />
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Remboursement: </span>
                  <span className="font-bold font-mono-numbers">{format(refundAmount)}</span>
                </div>
                <Button onClick={handleSubmit} disabled={createReturn.isPending || !reason}>
                  Confirmer le retour
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
