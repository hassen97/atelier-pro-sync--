import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string;
  sku?: string;
  barcode?: string;
  cost_price: number;
  sell_price: number;
  quantity: number;
  min_quantity: number;
  category?: string;
  description?: string;
  _rowIndex: number;
  _errors: string[];
}

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

// ─── Column aliases map (FR + EN) ─────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string> = {
  // name
  nom: "name", name: "name", produit: "name", product: "name",
  // sku
  sku: "sku", référence: "sku", reference: "sku", ref: "sku",
  // barcode
  "code-barres": "barcode", codebarres: "barcode", barcode: "barcode",
  "code barres": "barcode", ean: "barcode", upc: "barcode",
  // cost_price
  coût: "cost_price", cout: "cost_price", "coût achat": "cost_price",
  "prix achat": "cost_price", "prix d'achat": "cost_price", cost: "cost_price",
  "cost price": "cost_price", "prix coût": "cost_price",
  // sell_price
  prix: "sell_price", "prix vente": "sell_price", "prix de vente": "sell_price",
  "sell price": "sell_price", price: "sell_price", tarif: "sell_price",
  // quantity
  quantité: "quantity", quantite: "quantity", qty: "quantity",
  stock: "quantity", quantity: "quantity",
  // min_quantity
  "stock min": "min_quantity", "qté min": "min_quantity", "min qty": "min_quantity",
  "minimum": "min_quantity", "min_quantity": "min_quantity", "seuil": "min_quantity",
  // category
  catégorie: "category", categorie: "category", category: "category",
  // description
  description: "description", notes: "description",
};

// ─── Helper: parse a number cell ─────────────────────────────────────────────

function toNumber(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.,\-]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ─── Parse the XLSX workbook ──────────────────────────────────────────────────

function parseWorkbook(wb: XLSX.WorkBook): ParsedRow[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  if (raw.length === 0) return [];

  // Normalise column headers
  const normalised = raw.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      const key = k.toLowerCase().trim();
      const mapped = COLUMN_ALIASES[key] || key;
      out[mapped] = v;
    }
    return out;
  });

  return normalised.map((row, idx) => {
    const errors: string[] = [];
    const name = String(row.name || "").trim();
    if (!name) errors.push("Nom manquant");

    const sellPrice = toNumber(row.sell_price);
    if (sellPrice <= 0 && name) errors.push("Prix de vente invalide");

    return {
      name,
      sku: row.sku ? String(row.sku).trim() : undefined,
      barcode: row.barcode ? String(row.barcode).trim() : undefined,
      cost_price: toNumber(row.cost_price),
      sell_price: sellPrice,
      quantity: Math.round(toNumber(row.quantity)),
      min_quantity: Math.round(toNumber(row.min_quantity)) || 5,
      category: row.category ? String(row.category).trim() : undefined,
      description: row.description ? String(row.description).trim() : undefined,
      _rowIndex: idx + 2, // 1-indexed, +1 for header
      _errors: errors,
    };
  });
}

// ─── Download template helper ─────────────────────────────────────────────────

function downloadTemplate() {
  const headers = [
    "nom", "sku", "code-barres", "prix achat", "prix vente",
    "quantité", "stock min", "catégorie", "description",
  ];
  const example = [
    "Écran iPhone 14", "SCR-IP14", "1234567890123", "45", "90",
    "10", "3", "Écrans", "Écran OLED original",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  // Column widths
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produits");
  XLSX.writeFile(wb, "modele_import_produits.xlsx");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExcelImportDialog({ open, onOpenChange, onImported }: ExcelImportDialogProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidRows = rows.filter((r) => r._errors.length > 0);

  const processFile = (file: File) => {
    setFileName(file.name);
    setDone(false);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const parsed = parseWorkbook(wb);
        setRows(parsed);
        if (parsed.length === 0) {
          toast.error("Aucune donnée trouvée dans le fichier");
        }
      } catch {
        toast.error("Impossible de lire le fichier. Vérifiez que c'est bien un .xlsx ou .csv");
        setRows([]);
        setFileName("");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleImport = async () => {
    if (!effectiveUserId || validRows.length === 0) return;
    setImporting(true);
    setProgress(0);

    let success = 0;
    let failed = 0;
    const BATCH = 20;

    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH).map((row) => ({
        user_id: effectiveUserId,
        name: row.name,
        sku: row.sku || null,
        barcodes: row.barcode ? [row.barcode] : [],
        cost_price: row.cost_price,
        sell_price: row.sell_price,
        quantity: row.quantity,
        min_quantity: row.min_quantity,
        description: row.description || null,
      }));

      const { error } = await supabase.from("products").insert(batch);
      if (error) {
        failed += batch.length;
        console.error("Import batch error:", error);
      } else {
        success += batch.length;
      }
      setProgress(Math.round(((i + BATCH) / validRows.length) * 100));
    }

    setImporting(false);
    setDone(true);
    setImportResult({ success, failed });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });

    if (success > 0) {
      toast.success(`${success} produit${success > 1 ? "s" : ""} importé${success > 1 ? "s" : ""} avec succès`);
      onImported();
    }
    if (failed > 0) {
      toast.error(`${failed} produit${failed > 1 ? "s" : ""} non importé${failed > 1 ? "s" : ""}`);
    }
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setDone(false);
    setImportResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!importing) {
      if (!v) reset();
      onOpenChange(v);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-success" />
            Importer des produits via Excel
          </DialogTitle>
          <DialogDescription>
            Importez plusieurs produits en une seule fois depuis un fichier .xlsx ou .csv.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Download template */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium">Télécharger le modèle</p>
                <p className="text-xs text-muted-foreground">Utilisez ce fichier comme base pour votre import</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
                <Download className="h-4 w-4 mr-2" />
                Modèle .xlsx
              </Button>
            </div>

            {/* Drop zone */}
            {rows.length === 0 && (
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Glissez un fichier ici ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés : .xlsx, .xls, .csv
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* File loaded summary */}
            {rows.length > 0 && !done && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{fileName}</span>
                    <Badge variant="secondary">{rows.length} lignes</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-4 w-4 mr-1" />
                    Changer de fichier
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-success">{validRows.length} valides</p>
                      <p className="text-xs text-muted-foreground">Prêts à importer</p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    invalidRows.length > 0
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-muted/30 border-border"
                  )}>
                    <AlertTriangle className={cn("h-5 w-5 shrink-0", invalidRows.length > 0 ? "text-destructive" : "text-muted-foreground")} />
                    <div>
                      <p className={cn("text-sm font-semibold", invalidRows.length > 0 ? "text-destructive" : "text-muted-foreground")}>
                        {invalidRows.length} erreur{invalidRows.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Seront ignorées</p>
                    </div>
                  </div>
                </div>

                {/* Preview table */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nom</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">SKU / Code</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Prix vente</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Coût</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Qté</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((row) => (
                        <tr key={row._rowIndex} className={cn(
                          "border-t border-border",
                          row._errors.length > 0 && "bg-destructive/3 opacity-60"
                        )}>
                          <td className="px-3 py-2">
                            {row.name || <span className="text-muted-foreground italic">—</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                            {row.sku || row.barcode || "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numbers">
                            {row.sell_price > 0 ? row.sell_price.toFixed(3) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numbers hidden sm:table-cell">
                            {row.cost_price > 0 ? row.cost_price.toFixed(3) : "—"}
                          </td>
                          <td className="px-3 py-2 text-center">{row.quantity}</td>
                          <td className="px-3 py-2 text-center">
                            {row._errors.length === 0 ? (
                              <Badge className="bg-success/10 text-success border-success/20 text-xs">✓</Badge>
                            ) : (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs"
                                title={row._errors.join(", ")}>
                                ✗
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 50 && (
                    <div className="px-3 py-2 text-center text-xs text-muted-foreground border-t border-border bg-muted/30">
                      Aperçu limité aux 50 premières lignes • {rows.length} lignes au total
                    </div>
                  )}
                </div>

                {/* Errors detail */}
                {invalidRows.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-destructive">Lignes avec erreurs (ignorées) :</p>
                    {invalidRows.slice(0, 5).map((row) => (
                      <div key={row._rowIndex} className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/10 rounded px-3 py-1.5">
                        <span className="font-medium text-foreground">Ligne {row._rowIndex}</span>
                        {row.name && ` — « ${row.name} »`}
                        {" : "}{row._errors.join(", ")}
                      </div>
                    ))}
                    {invalidRows.length > 5 && (
                      <p className="text-xs text-muted-foreground">… et {invalidRows.length - 5} autre(s)</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Import progress */}
            {importing && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Import en cours…</p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
              </div>
            )}

            {/* Done state */}
            {done && importResult && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <div>
                  <p className="text-base font-semibold">
                    {importResult.success} produit{importResult.success !== 1 ? "s" : ""} importé{importResult.success !== 1 ? "s" : ""}
                  </p>
                  {importResult.failed > 0 && (
                    <p className="text-sm text-destructive mt-1">
                      {importResult.failed} produit{importResult.failed !== 1 ? "s" : ""} non importé{importResult.failed !== 1 ? "s" : ""} (erreurs)
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={reset}>Importer un autre fichier</Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-background">
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={importing}>
            Annuler
          </Button>
          {rows.length > 0 && !done && (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
              className="bg-gradient-primary hover:opacity-90"
            >
              {importing ? (
                <>Import en cours…</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer {validRows.length} produit{validRows.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
