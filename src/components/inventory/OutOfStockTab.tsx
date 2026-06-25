import { useMemo, useState } from "react";
import { Printer, PackageX, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useOutOfStockProducts } from "@/hooks/useProducts";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface ShortageItem {
  id: string;
  name: string;
  sku: string | null;
  barcodes: string[] | null;
  quantity: number;
  min_quantity: number;
  category?: { id: string; name: string } | null;
}

export function OutOfStockTab() {
  const { data: rawItems = [], isLoading } = useOutOfStockProducts();
  const { settings } = useShopSettingsContext();
  const [filterMode, setFilterMode] = useState<"all" | "out">("all");

  const items = useMemo(() => {
    const list = rawItems as ShortageItem[];
    return filterMode === "out" ? list.filter((p) => (p.quantity ?? 0) <= 0) : list;
  }, [rawItems, filterMode]);

  const suggestedQty = (p: ShortageItem) =>
    Math.max((p.min_quantity || 5) - (p.quantity ?? 0), 1);

  const handlePrint = () => {
    if (items.length === 0) {
      toast.error("Aucun produit à imprimer");
      return;
    }
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bon de commande — ${escapeHtml(shopName)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 80mm; padding: 4mm 3mm; font-family: 'Courier New', monospace; color: #000; font-size: 11px; }
          .shop { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; }
          .meta { text-align: center; font-size: 10px; margin-bottom: 2mm; }
          .title { text-align: center; font-weight: bold; font-size: 12px; margin: 2mm 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 1.5mm 0; }
          .date { text-align: center; font-size: 10px; margin-bottom: 2mm; }
          table { width: 100%; border-collapse: collapse; }
          th { font-size: 10px; text-align: left; border-bottom: 1px solid #000; padding: 1mm 0.5mm; }
          th.center, td.center { text-align: center; }
          td { font-size: 10px; padding: 1.2mm 0.5mm; border-bottom: 1px dotted #999; vertical-align: top; }
          td.name { width: 60%; }
          .sku { font-size: 9px; color: #444; }
          td.qty { font-weight: bold; }
          .total { margin-top: 2mm; font-size: 11px; font-weight: bold; text-align: right; }
          .sign { margin-top: 8mm; font-size: 10px; }
          .sign-line { margin-top: 6mm; border-top: 1px solid #000; width: 50mm; padding-top: 1mm; }
          .footer { text-align: center; font-size: 9px; margin-top: 4mm; }
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
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
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
        <Button onClick={handlePrint} disabled={items.length === 0} className="gap-2 bg-gradient-primary hover:opacity-90">
          <Printer className="h-4 w-4" />
          Imprimer la liste fournisseur
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
