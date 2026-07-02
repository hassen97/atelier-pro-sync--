import { useMemo, useRef, useState } from "react";
import { Printer, PackageX, AlertTriangle, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useOutOfStockProducts } from "@/hooks/useProducts";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { printThermalHtml } from "@/lib/receiptPdf";

interface ShortageItem {
  id: string;
  name: string;
  sku: string | null;
  barcodes: string[] | null;
  quantity: number;
  min_quantity: number;
  category?: { id: string; name: string } | null;
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.2;
const ZOOM_STEP = 0.2;

export function OutOfStockTab() {
  const { data: rawItems = [], isLoading } = useOutOfStockProducts();
  const { settings } = useShopSettingsContext();
  const [filterMode, setFilterMode] = useState<"all" | "out">("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1.2);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const items = useMemo(() => {
    const list = rawItems as ShortageItem[];
    return filterMode === "out" ? list.filter((p) => (p.quantity ?? 0) <= 0) : list;
  }, [rawItems, filterMode]);

  const suggestedQty = (p: ShortageItem) =>
    Math.max((p.min_quantity || 5) - (p.quantity ?? 0), 1);

  const buildReceiptHtml = () => {
    const shopName = settings.shop_name || "RepairPro";
    const address = settings.address || "";
    const phone = settings.phone || "";
    const dateStr = formatDate(new Date(), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

    const rows = items
      .map(
        (p) => `
        <tr>
          <td class="name">${escapeHtml(p.name)}${p.sku ? `<br/><span class="sku">${escapeHtml(p.sku)}</span>` : ""}</td>
          <td class="center">${p.quantity ?? 0}</td>
          <td class="center qty">${suggestedQty(p)}</td>
        </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Bon de commande — ${escapeHtml(shopName)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 80mm; }
          body {
            padding: 4mm 3mm;
            font-family: 'Courier New', Courier, monospace;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
            -webkit-font-smoothing: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .shop {
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            word-break: break-word;
          }
          .meta { text-align: center; font-size: 10.5px; margin-bottom: 1mm; word-break: break-word; }
          .title {
            text-align: center;
            font-weight: bold;
            font-size: 12.5px;
            margin: 2mm 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 1.5mm 0;
          }
          .date { text-align: center; font-size: 10.5px; margin-bottom: 2mm; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { font-size: 11px; text-align: left; border-bottom: 1px solid #000; padding: 1mm 0.5mm; }
          th.center, td.center { text-align: center; }
          td {
            font-size: 11px;
            padding: 1.4mm 0.5mm;
            border-bottom: 1px dotted #999;
            vertical-align: top;
            overflow-wrap: break-word;
            word-break: break-word;
          }
          td.name { width: 58%; }
          th.center, td.center { width: 21%; }
          .sku { font-size: 9.5px; color: #333; }
          td.qty { font-weight: bold; }
          .total { margin-top: 2mm; font-size: 12px; font-weight: bold; text-align: right; }
          .sign { margin-top: 8mm; font-size: 10.5px; }
          .sign-line { margin-top: 6mm; border-top: 1px solid #000; width: 50mm; max-width: 100%; padding-top: 1mm; }
          .footer { text-align: center; font-size: 9.5px; margin-top: 4mm; word-break: break-word; }
        </style>
      </head>
      <body>
        <div class="shop">${escapeHtml(shopName)}</div>
        ${address ? `<div class="meta">${escapeHtml(address)}</div>` : ""}
        ${phone ? `<div class="meta">Tél: ${escapeHtml(phone)}</div>` : ""}
        <div class="title">BON DE COMMANDE / RUPTURE</div>
        <div class="date">${dateStr}</div>
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th class="center">Stock</th>
              <th class="center">À cmd</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total articles : ${items.length}</div>
        <div class="sign">
          <div class="sign-line">Signature / Cachet</div>
        </div>
        <div class="footer">Généré par ${escapeHtml(shopName)}</div>
      </body>
      </html>
    `;
  };

  const openPreview = () => {
    if (items.length === 0) {
      toast.error("Aucun produit à imprimer");
      return;
    }
    setZoom(1.2);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    if (items.length === 0) {
      toast.error("Aucun produit à imprimer");
      return;
    }
    // Use the project's proven thermal print helper: it waits for the document
    // to load and does NOT auto-close the window, so the print job is not cut
    // off on mobile (iOS/Android) where the print dialog opens asynchronously.
    printThermalHtml(buildReceiptHtml());
  };

  const resizeIframe = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        iframe.style.height = `${doc.body.scrollHeight + 8}px`;
      }
    } catch {
      /* noop */
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Produits en rupture de stock</h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={filterMode}
            onValueChange={(v) => v && setFilterMode(v as "all" | "out")}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all">Rupture + stock faible</ToggleGroupItem>
            <ToggleGroupItem value="out">Rupture uniquement</ToggleGroupItem>
          </ToggleGroup>
          <span className="text-sm text-muted-foreground">
            {items.length} produit{items.length > 1 ? "s" : ""}
          </span>
        </div>
        <Button
          onClick={openPreview}
          disabled={items.length === 0}
          className="gap-2 bg-gradient-primary hover:opacity-90"
        >
          <Eye className="h-4 w-4" />
          Aperçu & Imprimer
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>SKU / Code-barres</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Seuil</TableHead>
                <TableHead className="text-center">Qté à commander</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Aucun produit en rupture 🎉
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => {
                  const isOut = (p.quantity ?? 0) <= 0;
                  const code = p.barcodes && p.barcodes.length > 0 ? p.barcodes[0] : p.sku;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        {code ? (
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{code}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.category?.name || "Non catégorisé"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "font-mono gap-1",
                            isOut
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-warning/10 text-warning border-warning/20"
                          )}
                        >
                          {isOut ? <PackageX className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {p.quantity ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono-numbers text-muted-foreground">{p.min_quantity || 5}</TableCell>
                      <TableCell className="text-center font-mono-numbers font-semibold">{suggestedQty(p)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Printer className="h-4 w-4" />
              Aperçu du reçu 80mm
            </DialogTitle>
            <DialogDescription>
              Vérifiez le contenu avant d'imprimer. Utilisez le zoom pour mieux lire.
            </DialogDescription>
          </DialogHeader>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3 px-4 py-2 border-b bg-muted/40">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Réduire le zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono-numbers w-14 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Augmenter le zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable preview area */}
          <div className="max-h-[55vh] overflow-auto bg-muted/30 p-4 flex justify-center">
            <div
              style={{
                width: 302 * zoom,
                transition: "width 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 302,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="Aperçu du reçu"
                  srcDoc={buildReceiptHtml()}
                  onLoad={resizeIframe}
                  className="w-[302px] border border-border bg-white shadow-sm"
                  style={{ display: "block" }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 pt-3 border-t flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-gradient-primary hover:opacity-90">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
