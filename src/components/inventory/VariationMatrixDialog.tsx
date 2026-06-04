import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { useCreateProduct } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

interface MatrixRow {
  name: string;
  barcode: string;
  cost_price: string;
  sell_price: string;
}

interface VariationMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function VariationMatrixDialog({ open, onOpenChange, onSaved }: VariationMatrixDialogProps) {
  const [modelInput, setModelInput] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [attrInput, setAttrInput] = useState("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const barcodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const createProduct = useCreateProduct();
  const { currencyCode } = useCurrency();

  const addTag = (value: string, list: string[], setList: (v: string[]) => void) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
  };

  const removeTag = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((v) => v !== value));
  };

  const generateMatrix = () => {
    if (models.length === 0 || attributes.length === 0) {
      toast.error("Ajoutez au moins un modèle et un attribut");
      return;
    }
    const rows: MatrixRow[] = [];
    for (const model of models) {
      for (const attr of attributes) {
        rows.push({ name: `${model} — ${attr}`, barcode: "", cost_price: "", sell_price: "" });
      }
    }
    setMatrix(rows);
    setSavedCount(0);
    // Focus first barcode input
    setTimeout(() => barcodeRefs.current[0]?.focus(), 100);
  };

  const updateRow = (index: number, field: keyof MatrixRow, value: string) => {
    setMatrix((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next barcode input
      const next = barcodeRefs.current[index + 1];
      if (next) next.focus();
    }
  };

  const handleSaveAll = useCallback(async () => {
    const toSave = matrix.filter((row) => row.name.trim());
    if (toSave.length === 0) return;

    setSaving(true);
    let count = 0;

    for (const row of toSave) {
      try {
        await createProduct.mutateAsync({
          name: row.name,
          barcodes: row.barcode.trim() ? [row.barcode.trim()] : [],
          cost_price: parseFloat(row.cost_price) || 0,
          sell_price: parseFloat(row.sell_price) || 0,
          quantity: 0,
          min_quantity: 5,
        } as any);
        count++;
        setSavedCount(count);
      } catch {
        toast.error(`Erreur pour : ${row.name}`);
      }
    }

    setSaving(false);
    toast.success(`${count} déclinaisons enregistrées`);
    onSaved?.();
    onOpenChange(false);
    // Reset
    setMatrix([]);
    setModels([]);
    setAttributes([]);
    setSavedCount(0);
  }, [matrix, createProduct, onSaved, onOpenChange]);

  const handleClose = () => {
    onOpenChange(false);
    setMatrix([]);
    setModels([]);
    setAttributes([]);
    setSavedCount(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            Générateur de déclinaisons
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Models */}
          <div className="space-y-2">
            <Label>Modèles (ex: iPhone 13, iPhone 14)</Label>
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {models.map((m) => (
                <Badge key={m} variant="secondary" className="gap-1 pl-2 pr-1">
                  {m}
                  <button type="button" onClick={() => removeTag(m, models, setModels)}>
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nom du modèle..."
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(modelInput, models, setModels);
                    setModelInput("");
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => { addTag(modelInput, models, setModels); setModelInput(""); }}
              >
                Ajouter
              </Button>
            </div>
          </div>

          {/* Attributes */}
          <div className="space-y-2">
            <Label>Attributs (ex: Noir, Blanc, Or)</Label>
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {attributes.map((a) => (
                <Badge key={a} className="gap-1 pl-2 pr-1 bg-accent/10 text-accent border-accent/20">
                  {a}
                  <button type="button" onClick={() => removeTag(a, attributes, setAttributes)}>
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de l'attribut..."
                value={attrInput}
                onChange={(e) => setAttrInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(attrInput, attributes, setAttributes);
                    setAttrInput("");
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => { addTag(attrInput, attributes, setAttributes); setAttrInput(""); }}
              >
                Ajouter
              </Button>
            </div>
          </div>

          <Button
            type="button"
            onClick={generateMatrix}
            className="w-full gap-2 bg-gradient-to-r from-warning/80 to-warning hover:opacity-90"
            disabled={models.length === 0 || attributes.length === 0}
          >
            <Zap className="h-4 w-4" />
            Générer {models.length > 0 && attributes.length > 0 ? `${models.length * attributes.length} combinaisons` : "la matrice"}
          </Button>

          {/* Matrix Table */}
          {matrix.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code-barres</TableHead>
                     <TableHead className="w-28">Coût ({currencyCode})</TableHead>
                     <TableHead className="w-28">Vente ({currencyCode})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-sm">{row.name}</TableCell>
                      <TableCell>
                        <Input
                          ref={(el) => (barcodeRefs.current[index] = el)}
                          placeholder="Scanner..."
                          value={row.barcode}
                          onChange={(e) => updateRow(index, "barcode", e.target.value)}
                          onKeyDown={(e) => handleBarcodeKeyDown(e, index)}
                          className="font-mono text-sm h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0.000"
                          value={row.cost_price}
                          onChange={(e) => updateRow(index, "cost_price", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0.000"
                          value={row.sell_price}
                          onChange={(e) => updateRow(index, "sell_price", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement {savedCount}/{matrix.length}...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Annuler</Button>
          {matrix.length > 0 && (
            <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Enregistrer tout ({matrix.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
