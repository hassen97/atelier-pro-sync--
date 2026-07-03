import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Shield, Calendar, Wrench, DollarSign, Package } from "lucide-react";
import { useSearchRepairForWarranty, useCreateWarrantyTicket } from "@/hooks/useWarranty";
import { useAllProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface WarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarrantyDialog({ open, onOpenChange }: WarrantyDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [returnReason, setReturnReason] = useState("supplier_defect");
  const [actionTaken, setActionTaken] = useState("");
  const [laborCost, setLaborCost] = useState(0);
  const [partsCost, setPartsCost] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedParts, setSelectedParts] = useState<{ product_id: string; product_name: string; quantity: number }[]>([]);

  const searchRepair = useSearchRepairForWarranty();
  const createWarranty = useCreateWarrantyTicket();
  const { data: products = [] } = useAllProducts();
  const { format } = useCurrency();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchRepair.mutate(searchQuery);
    }
  };

  const handleSubmit = () => {
    if (!selectedRepair) return;
    createWarranty.mutate({
      original_repair_id: selectedRepair.id,
      return_reason: returnReason,
      action_taken: actionTaken || undefined,
      labor_cost: laborCost,
      parts_cost: partsCost,
      total_cost: laborCost + partsCost,
      amount_paid: amountPaid,
      notes: notes || undefined,
      replaced_parts: selectedParts,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedRepair(null);
    setReturnReason("supplier_defect");
    setActionTaken("");
    setLaborCost(0);
    setPartsCost(0);
    setAmountPaid(0);
    setNotes("");
    setSelectedParts([]);
  };

  const addPart = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (product && !selectedParts.find(p => p.product_id === productId)) {
      setSelectedParts(prev => [...prev, {
        product_id: productId,
        product_name: product.name,
        quantity: 1,
      }]);
    }
  };

  const removePart = (productId: string) => {
    setSelectedParts(prev => prev.filter(p => p.product_id !== productId));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Traitement Garantie / Retour
          </DialogTitle>
          <DialogDescription>
            Recherchez la réparation originale puis créez un ticket de garantie
          </DialogDescription>
        </DialogHeader>

        {/* Search Section */}
        <div className="space-y-3">
          <Label>Rechercher la réparation originale</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="IMEI, N° ticket ou téléphone client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchRepair.isPending}>
              Rechercher
            </Button>
          </div>

          {/* Search Results */}
          {searchRepair.data && searchRepair.data.length > 0 && !selectedRepair && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchRepair.data.map((repair: any) => (
                <Card
                  key={repair.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedRepair(repair)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{repair.device_model}</p>
                        <p className="text-xs text-muted-foreground">
                          {repair.customer?.name || "Client anonyme"} • {repair.customer?.phone || ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(repair.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{repair.status}</Badge>
                        <p className="text-sm font-mono-numbers mt-1">{format(Number(repair.total_cost))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchRepair.data && searchRepair.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Aucune réparation trouvée</p>
          )}
        </div>

        {/* Selected Repair Details */}
        {selectedRepair && (
          <div className="space-y-4 border-t pt-4">
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">Réparation originale</span>
                  <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setSelectedRepair(null)}>
                    Changer
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Appareil:</span> {selectedRepair.device_model}</div>
                  <div><span className="text-muted-foreground">Client:</span> {selectedRepair.customer?.name || "Anonyme"}</div>
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(selectedRepair.created_at).toLocaleDateString("fr-FR")}</div>
                  <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {format(Number(selectedRepair.total_cost))}</div>
                </div>
                {selectedRepair.repair_parts?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">Pièces utilisées:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRepair.repair_parts.map((p: any) => (
                        <Badge key={p.id} variant="secondary" className="text-xs">
                          {p.quantity}x @ {format(Number(p.unit_price))}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warranty Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Raison du retour</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier_defect">Défaut fournisseur</SelectItem>
                    <SelectItem value="tech_error">Erreur technique</SelectItem>
                    <SelectItem value="customer_damage">Dommage client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action entreprise</Label>
                <Input
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Ex: Remplacement écran..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Main d'œuvre</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Coût pièces</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={partsCost}
                  onChange={(e) => setPartsCost(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Montant payé</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Parts Replacement */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Pièces remplacées (déduit du stock)
              </Label>
              <Select onValueChange={addPart}>
                <SelectTrigger><SelectValue placeholder="Ajouter une pièce..." /></SelectTrigger>
                <SelectContent>
                  {(products as any[]).filter((p: any) => p.quantity > 0).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedParts.length > 0 && (
                <div className="space-y-1">
                  {selectedParts.map((part) => (
                    <div key={part.product_id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <span>{part.product_name} x{part.quantity}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removePart(part.product_id)}>
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes additionnelles..." />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold font-mono-numbers">{format(laborCost + partsCost)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createWarranty.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Créer ticket garantie
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
