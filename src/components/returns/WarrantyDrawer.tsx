import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Shield, Calendar, Wrench, DollarSign, Package, AlertTriangle,
  Minus, Plus, History, ChevronRight, RotateCcw, Hash, Smartphone,
} from "lucide-react";
import { useSearchRepairForWarranty, useCreateWarrantyTicket, getWarrantyExpiry } from "@/hooks/useWarranty";
import { useAllProducts } from "@/hooks/useProducts";
import { useRepairs } from "@/hooks/useRepairs";
import { useShopSettings } from "@/hooks/useShopSettings";
import { useCurrency } from "@/hooks/useCurrency";

interface WarrantyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Repair pre-selected from the warranty checker (skips the search step). */
  initialRepair?: any;
  /** Called after a ticket is successfully created (e.g. switch to tickets tab). */
  onCreated?: () => void;
}

const REASONS = [
  { value: "supplier_defect", label: "Défaut fournisseur" },
  { value: "tech_error", label: "Erreur technique" },
  { value: "customer_damage", label: "Dommage client" },
];

const ACTION_PRESETS = [
  "Remplacement écran",
  "Remplacement batterie",
  "Résoudure / réparation carte",
  "RMA fournisseur",
  "Re-flash logiciel",
  "Aucune action — défaut constaté",
];

interface SelectedPart {
  product_id: string;
  product_name: string;
  quantity: number;
  cost_price: number;
}

// Maps the original repair's parts (from the search join) into the picker shape.
function mapOriginalParts(repair: any): SelectedPart[] {
  return ((repair?.repair_parts || []) as any[])
    .filter((rp: any) => rp.product_id)
    .map((rp: any) => ({
      product_id: rp.product_id,
      product_name: rp.product?.name || "Pièce d'origine",
      quantity: Math.max(1, Number(rp.quantity) || 1),
      cost_price: Number(rp.product?.cost_price ?? 0),
    }));
}

export function WarrantyDrawer({ open, onOpenChange, initialRepair, onCreated }: WarrantyDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [returnReason, setReturnReason] = useState("supplier_defect");
  const [actionTaken, setActionTaken] = useState("");
  const [laborCost, setLaborCost] = useState(0);
  const [partsCostOverride, setPartsCostOverride] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [partSearch, setPartSearch] = useState("");
  const [expiredAcknowledged, setExpiredAcknowledged] = useState(false);

  const searchRepair = useSearchRepairForWarranty();
  const createWarranty = useCreateWarrantyTicket();
  const { data: products = [] } = useAllProducts();
  const { data: repairsResult } = useRepairs();
  const { settings } = useShopSettings();
  const { format } = useCurrency();
  const warrantyDays = Number(settings?.warranty_days ?? 30);

  const originalParts = useMemo(() => mapOriginalParts(selectedRepair), [selectedRepair]);

  const selectRepair = (repair: any) => {
    setSelectedRepair(repair);
    setExpiredAcknowledged(false);
    setPartsCostOverride(null);
    // Smart prefill: warranty returns usually reuse the same parts — start from
    // the original repair's parts (the user can adjust or remove them).
    setSelectedParts(mapOriginalParts(repair));
  };

  // Prefill from the warranty checker when opened with a repair
  useEffect(() => {
    if (open && initialRepair) selectRepair(initialRepair);
  }, [open, initialRepair]);

  // Most recent delivered repairs — the vast majority of warranty returns are
  // recent jobs, so offer them as one-tap shortcuts instead of dead space.
  const recentDelivered = useMemo(
    () =>
      ((repairsResult?.data || []) as any[])
        .filter((r: any) => r.status === "delivered" && !r.is_warranty)
        .slice(0, 5),
    [repairsResult]
  );

  const handleSearch = () => {
    if (searchQuery.trim()) searchRepair.mutate(searchQuery);
  };

  // Parts picker: searchable across the FULL catalog (not just the first page)
  const partMatches = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return [];
    return (products as any[])
      .filter(
        (p: any) =>
          p.quantity > 0 &&
          !selectedParts.some((sp) => sp.product_id === p.id) &&
          (p.name?.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [partSearch, products, selectedParts]);

  const addPart = (product: any) => {
    setSelectedParts((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        cost_price: Number(product.cost_price ?? 0),
      },
    ]);
    setPartSearch("");
  };

  const removePart = (productId: string) => {
    setSelectedParts((prev) => prev.filter((p) => p.product_id !== productId));
  };

  const setPartQty = (productId: string, qty: number) => {
    setSelectedParts((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, quantity: Math.max(1, Math.min(99, qty)) } : p))
    );
  };

  // Parts cost auto-computed from stock cost prices; manual override optional.
  const autoPartsCost = selectedParts.reduce((s, p) => s + p.cost_price * p.quantity, 0);
  const partsCost = partsCostOverride ?? autoPartsCost;
  const totalLoss = (Number(laborCost) || 0) + partsCost;

  const expiry = selectedRepair ? getWarrantyExpiry(selectedRepair, warrantyDays) : null;
  const expiredBlocked = !!expiry && !expiry.covered && !expiredAcknowledged;

  const handleSubmit = () => {
    if (!selectedRepair || expiredBlocked) return;
    createWarranty.mutate(
      {
        original_repair_id: selectedRepair.id,
        return_reason: returnReason,
        action_taken: actionTaken || undefined,
        labor_cost: Number(laborCost) || 0,
        parts_cost: partsCost,
        total_cost: totalLoss,
        amount_paid: Number(amountPaid) || 0,
        notes: notes || undefined,
        replaced_parts: selectedParts,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
          onCreated?.();
        },
      }
    );
  };

  const resetForm = () => {
    setSearchQuery(""); setSelectedRepair(null); setReturnReason("supplier_defect");
    setActionTaken(""); setLaborCost(0); setPartsCostOverride(null); setAmountPaid(0);
    setNotes(""); setSelectedParts([]); setPartSearch(""); setExpiredAcknowledged(false);
  };

  const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Garantie / Retour Réparation
          </SheetTitle>
          <SheetDescription>Créez un ticket SAV à partir de la réparation originale</SheetDescription>
          {/* Stepper */}
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={selectedRepair ? "secondary" : "default"} className="gap-1.5">
              <span className="font-bold">1</span> Réparation originale
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant={selectedRepair ? "default" : "secondary"} className="gap-1.5">
              <span className="font-bold">2</span> Diagnostic & coûts
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-8">
          {/* ── Step 1: find the original repair ── */}
          <div className="space-y-2">
            <Label>Rechercher la réparation</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="IMEI, N° ticket ou tél..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                  autoFocus={!selectedRepair}
                />
              </div>
              <Button onClick={handleSearch} disabled={searchRepair.isPending} size="sm">Rechercher</Button>
            </div>
          </div>

          {/* Search results */}
          {searchRepair.data && searchRepair.data.length > 0 && !selectedRepair && (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {searchRepair.data.map((repair: any) => {
                const exp = getWarrantyExpiry(repair, warrantyDays);
                return (
                  <Card key={repair.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => selectRepair(repair)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{repair.device_model}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {repair.customer?.name || "Client anonyme"} • {repair.customer?.phone || ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {repair.ticket_number ? `Ticket #${repair.ticket_number} • ` : ""}
                            {new Date(repair.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {exp && (
                            <Badge variant="outline" className={exp.covered ? "text-success border-success/30" : "text-destructive border-destructive/30"}>
                              {exp.covered ? `Garantie ${exp.daysLeft} j` : "Expirée"}
                            </Badge>
                          )}
                          <p className="text-sm font-mono-numbers mt-1">{format(Number(repair.total_cost))}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {searchRepair.data && searchRepair.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Aucune réparation trouvée</p>
          )}

          {/* Empty state: how it works + recent delivered repairs (no dead space) */}
          {!selectedRepair && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Comment ça marche ?</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Retrouvez la réparation originale (IMEI, N° de ticket ou téléphone).</li>
                  <li>Le statut de garantie est vérifié automatiquement ({warrantyDays} jours).</li>
                  <li>Le coût des pièces remplacées est enregistré comme perte, jamais facturé au client.</li>
                </ol>
              </div>

              {recentDelivered.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4" />Réparations livrées récemment
                  </Label>
                  <div className="space-y-2">
                    {recentDelivered.map((repair: any) => {
                      const exp = getWarrantyExpiry(repair, warrantyDays);
                      return (
                        <div
                          key={repair.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => selectRepair(repair)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{repair.device_model}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {repair.customer?.name || "Client anonyme"} • livré il y a {daysSince(repair.delivery_date || repair.created_at)} j
                            </p>
                          </div>
                          {exp && (
                            <Badge variant="outline" className={exp.covered ? "text-success border-success/30 shrink-0" : "text-destructive border-destructive/30 shrink-0"}>
                              {exp.covered ? `Garantie ${exp.daysLeft} j` : "Expirée"}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: diagnosis & costs ── */}
          {selectedRepair && (
            <div className="space-y-4 border-t pt-4">
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">Réparation originale</span>
                    <Button variant="ghost" size="sm" className="ml-auto text-xs h-6" onClick={() => { setSelectedRepair(null); setSelectedParts([]); }}>Changer</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                    <div><span className="text-muted-foreground">Appareil:</span> {selectedRepair.device_model}</div>
                    <div><span className="text-muted-foreground">Client:</span> {selectedRepair.customer?.name || "Anonyme"}</div>
                    {selectedRepair.ticket_number != null && (
                      <div className="flex items-center gap-1"><Hash className="h-3 w-3" /> Ticket #{selectedRepair.ticket_number}</div>
                    )}
                    {selectedRepair.imei && (
                      <div className="flex items-center gap-1 truncate"><Smartphone className="h-3 w-3 shrink-0" /> {selectedRepair.imei}</div>
                    )}
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(selectedRepair.created_at).toLocaleDateString("fr-FR")} (il y a {daysSince(selectedRepair.created_at)} j)</div>
                    <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {format(Number(selectedRepair.total_cost))}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty verdict */}
              {expiry && (
                expiry.covered ? (
                  <p className="text-xs p-2 rounded bg-success/10 text-success">
                    ✓ Réparation sous garantie — expire le {expiry.expiry.toLocaleDateString("fr-FR")} ({expiry.daysLeft} j restants).
                  </p>
                ) : (
                  <div className="text-xs p-3 rounded bg-warning/10 text-warning space-y-2">
                    <p className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Garantie expirée depuis {Math.abs(expiry.daysLeft)} jour(s) (le {expiry.expiry.toLocaleDateString("fr-FR")}).
                      Vous pouvez aussi la traiter comme réparation payante.
                    </p>
                    {!expiredAcknowledged && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-warning/40 text-warning hover:bg-warning/10" onClick={() => setExpiredAcknowledged(true)}>
                        Créer quand même un ticket garantie
                      </Button>
                    )}
                  </div>
                )
              )}

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">💡 Garantie: le coût des pièces sera enregistré comme perte, pas facturé au client.</p>

              {/* Return reason — tappable chips (mobile-friendly) */}
              <div className="space-y-2">
                <Label>Raison du retour</Label>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReturnReason(r.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        returnReason === r.value
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Action entreprise</Label>
                <Input list="warranty-action-presets" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Ex: Remplacement écran" />
                <datalist id="warranty-action-presets">
                  {ACTION_PRESETS.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Main d'œuvre</Label>
                  <Input type="number" min={0} value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    Coût pièces
                    {partsCostOverride !== null && (
                      <button type="button" title="Revenir au calcul automatique" className="text-muted-foreground hover:text-foreground" onClick={() => setPartsCostOverride(null)}>
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </Label>
                  <Input type="number" min={0} value={partsCost} onChange={(e) => setPartsCostOverride(Number(e.target.value))} />
                  {partsCostOverride === null && selectedParts.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">Calculé auto depuis le coût en stock</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Montant payé</Label>
                  <Input type="number" min={0} value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} />
                </div>
              </div>

              {/* Parts — searchable, full catalog */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Package className="h-4 w-4" />Pièces remplacées</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une pièce (nom ou SKU)..."
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    className="pl-9"
                  />
                  {partMatches.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {partMatches.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                          onClick={() => addPart(p)}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">Stock: {p.quantity} • {format(Number(p.cost_price ?? 0))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedParts.length === 0 && originalParts.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSelectedParts(originalParts)}>
                    <RotateCcw className="h-3 w-3 mr-1" />Reprendre les pièces d'origine
                  </Button>
                )}

                {selectedParts.length > 0 && (
                  <div className="space-y-1">
                    {selectedParts.map((part) => (
                      <div key={part.product_id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50 text-sm">
                        <div className="min-w-0 truncate flex-1">
                          {part.product_name}
                          <span className="text-[10px] text-muted-foreground ml-1">({format(part.cost_price)}/u)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPartQty(part.product_id, part.quantity - 1)} disabled={part.quantity <= 1}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            value={part.quantity}
                            onChange={(e) => setPartQty(part.product_id, Number(e.target.value) || 1)}
                            className="h-6 w-14 text-center text-xs"
                          />
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPartQty(part.product_id, part.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removePart(part.product_id)}>Retirer</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes additionnelles..." />
              </div>
            </div>
          )}
        </div>

        {/* Sticky summary footer — always visible */}
        <div className="sticky bottom-0 -mx-6 px-6 py-3 border-t bg-background">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Total perte: </span>
              <span className="font-bold font-mono-numbers">{format(totalLoss)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={handleSubmit}
                disabled={!selectedRepair || createWarranty.isPending || expiredBlocked}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {createWarranty.isPending ? "Création..." : "Créer ticket garantie"}
              </Button>
              {!selectedRepair && <span className="text-[10px] text-muted-foreground">Sélectionnez d'abord une réparation</span>}
              {expiredBlocked && <span className="text-[10px] text-warning">Confirmez la création hors garantie ci-dessus</span>}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
