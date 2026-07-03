import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useCurrency } from "@/hooks/useCurrency";

interface LabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  barcode: string;
  price: number;
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  productName,
  barcode,
  price,
}: LabelPrintDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [barcodeImg, setBarcodeImg] = useState<string | null>(null);
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  useEffect(() => {
    if (!open || !barcode) return;

    setGenerating(true);
    setBarcodeImg(null);

    import("jsbarcode").then((mod) => {
      const JsBarcode = mod.default;
      const canvas = document.createElement("canvas");
      try {
        JsBarcode(canvas, barcode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
        setBarcodeImg(canvas.toDataURL("image/png"));
      } catch {
        // Invalid barcode format — fallback to text only
        setBarcodeImg(null);
      }
      setGenerating(false);
    });
  }, [open, barcode]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) return;

    const shopName = settings.shop_name || "RepairPro";
    const priceFormatted = format(Number(price) || 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Étiquette — ${productName}</title>
        <style>
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 50mm;
            height: 30mm;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5mm;
            overflow: hidden;
          }
          .shop-name {
            font-size: 6pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #333;
            margin-bottom: 1mm;
          }
          .product-name {
            font-size: 7pt;
            font-weight: 600;
            text-align: center;
            margin-bottom: 1mm;
            max-width: 45mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .barcode-img {
            max-width: 44mm;
            height: auto;
          }
          .price {
            font-size: 9pt;
            font-weight: bold;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        <div class="shop-name">${shopName}</div>
        <div class="product-name">${productName}</div>
        ${barcodeImg ? `<img class="barcode-img" src="${barcodeImg}" alt="${barcode}" />` : `<div style="font-size:7pt;font-family:monospace;">${barcode}</div>`}
        <div class="price">${priceFormatted}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Aperçu étiquette 50×30mm
          </DialogTitle>
        </DialogHeader>

        {/* Label Preview */}
        <div className="flex justify-center py-2">
          <div
            className="border-2 border-dashed border-border rounded"
            style={{ width: "180px", height: "108px", padding: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px" }}
          >
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              {settings.shop_name || "RepairPro"}
            </p>
            <p className="text-[9px] font-semibold text-center truncate max-w-full">{productName}</p>
            {generating ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : barcodeImg ? (
              <img src={barcodeImg} alt={barcode} className="max-w-full" style={{ height: "40px" }} />
            ) : (
              <p className="font-mono text-[8px] text-center">{barcode}</p>
            )}
            <p className="text-[10px] font-bold">{format(Number(price) || 0)}</p>
          </div>
        </div>

        {/* Hidden canvas for generation */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handlePrint} disabled={generating} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimer l'étiquette
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
