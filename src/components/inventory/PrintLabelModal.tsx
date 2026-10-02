import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useCurrency } from "@/hooks/useCurrency";

export interface LabelProduct {
  name: string;
  price: number;
  promoPercentage: number | null;
  codes: string[];
}

interface PrintLabelModalProps {
  product: LabelProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BarcodeSvg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    import("jsbarcode")
      .then(({ default: JsBarcode }) => {
        if (cancelled || !ref.current) return;
        try {
          JsBarcode(ref.current, value, {
            format: "CODE128",
            width: 1.4,
            height: 32,
            displayValue: false,
            margin: 0,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch {
          setError(true);
        }
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
    };
  }, [value]);
  if (error) return <div style={{ fontSize: "7pt" }}>Code invalide</div>;
  return <svg ref={ref} style={{ maxWidth: "46mm", height: "9mm", display: "block", margin: "0 auto" }} preserveAspectRatio="none" />;
}

function Label({ shopName, product, code, format }: { shopName: string; product: LabelProduct; code: string; format: (n: number) => string }) {
  const promo = Number(product.promoPercentage) || 0;
  const hasPromo = promo > 0 && promo < 100;
  const finalPrice = hasPromo ? Math.round(product.price * (1 - promo / 100) * 1000) / 1000 : product.price;
  return (
    <div
      className="label-50x30"
      style={{
        width: "50mm",
        height: "30mm",
        boxSizing: "border-box",
        padding: "1.2mm 2mm",
        background: "#fff",
        color: "#000",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.3px", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {shopName}
      </div>
      <div style={{ fontSize: "7.5pt", fontWeight: 700, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {product.name}
      </div>
      {hasPromo ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", lineHeight: 1 }}>
          <span style={{ fontSize: "6.5pt", textDecoration: "line-through" }}>{format(product.price)}</span>
          <span style={{ fontSize: "10.5pt", fontWeight: 800 }}>{format(finalPrice)}</span>
          <span style={{ fontSize: "6pt", fontWeight: 700, background: "#000", color: "#fff", padding: "0.3mm 1mm", borderRadius: "0.6mm" }}>-{promo}%</span>
        </div>
      ) : (
        <div style={{ fontSize: "11pt", fontWeight: 800, lineHeight: 1 }}>{format(product.price)}</div>
      )}
      <div>
        <BarcodeSvg value={code} />
        <div style={{ fontSize: "6pt", fontFamily: "'Courier New', monospace", letterSpacing: "0.5px", lineHeight: 1.1, marginTop: "0.3mm" }}>{code}</div>
      </div>
    </div>
  );
}

export function PrintLabelModal({ product, open, onOpenChange }: PrintLabelModalProps) {
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();
  const codes = useMemo(() => product?.codes.filter(Boolean) ?? [], [product]);
  const [code, setCode] = useState("");

  useEffect(() => {
    setCode(codes[0] ?? "");
  }, [codes]);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "label-print-page-style";
    style.textContent = "@media print { @page { size: 50mm 30mm; margin: 0; } }";
    document.head.appendChild(style);
    document.body.classList.add("label-printing");
    const cleanup = () => {
      document.body.classList.remove("label-printing");
      style.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1000);
    }, 50);
  };

  if (!product) return null;
  const shopName = settings.shop_name || "Mon Atelier";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Imprimer l'étiquette</DialogTitle>
            <DialogDescription>Aperçu de l'étiquette thermique 50 × 30 mm.</DialogDescription>
          </DialogHeader>
          {codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ce produit n'a pas de code-barres ni de SKU.</p>
          ) : (
            <div className="space-y-4">
              {codes.length > 1 && (
                <Select value={code} onValueChange={setCode}>
                  <SelectTrigger><SelectValue placeholder="Choisir un code" /></SelectTrigger>
                  <SelectContent>
                    {codes.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex justify-center rounded-md bg-muted p-6">
                <div className="shadow-lg" style={{ transform: "scale(1.6)", transformOrigin: "center", margin: "8mm 0" }}>
                  {code && <Label shopName={shopName} product={product} code={code} format={format} />}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            <Button onClick={handlePrint} disabled={!code}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {open && code &&
        createPortal(
          <div className="label-print-root" aria-hidden="true">
            <Label shopName={shopName} product={product} code={code} format={format} />
          </div>,
          document.body,
        )}
    </>
  );
}
