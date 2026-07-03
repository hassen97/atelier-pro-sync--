import { useState, useEffect } from "react";
import { Printer, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import type { Repair } from "./RepairCard";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { generateThermalReceipt, generatePhoneLabel } from "@/lib/receiptPdf";
import { supabase } from "@/integrations/supabase/client";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { getShopInitials, formatTicketNumberPadded, formatTicketNumber } from "@/lib/utils";

interface RepairReceiptDialogProps {
  repair: Repair | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepairReceiptDialog({ repair, open, onOpenChange }: RepairReceiptDialogProps) {
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();
  const { isEmployee } = useInventoryAccess();
  const [receiptMode, setReceiptMode] = useState<string>(settings.receipt_mode || "detailed");
  const [printerWidth, setPrinterWidth] = useState<"80mm" | "58mm">("80mm");
  const [publicDomain, setPublicDomain] = useState<string>("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    setReceiptMode(settings.receipt_mode || "detailed");
  }, [settings.receipt_mode]);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "public_site_domain")
      .maybeSingle()
      .then(({ data }) => { if (data?.value) setPublicDomain(data.value); });
  }, []);

  const handlePrint = async () => {
    if (!repair) return;
    setPrinting(true);
    try {
      const remaining = repair.total - repair.paid;
      let items: { name: string; qty: number; unitPrice: number; total: number }[] = [];

      // Employees see only total (simple mode) — parts/labor costs are confidential
      const effectiveMode = isEmployee ? "simple" : receiptMode;

      if (effectiveMode === "detailed") {
        items = repair.parts.map((p) => ({ name: p.name, qty: 1, unitPrice: p.cost, total: p.cost }));
        items.push({ name: "Main d'œuvre", qty: 1, unitPrice: repair.labor, total: repair.labor });
      }

      const token = repair.tracking_token || repair.id;
      const domain = publicDomain || window.location.origin;
      const trackingUrl = `${domain}/r/${token}`;

      const initials = getShopInitials(settings.shop_name);
      const ticketNum = (repair as any).ticket_number ?? null;
      const ticketLabel = formatTicketNumberPadded(initials, ticketNum);

      await generateThermalReceipt(
        {
          type: "repair",
          id: repair.id,
          ticketNumber: ticketNum,
          ticketLabel: ticketLabel || null,
          date: new Date(repair.depositDate).toLocaleDateString("fr-TN"),
          time: new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }),
          customer: { name: repair.customer, phone: repair.phone },
          device: repair.device,
          imei: repair.imei,
          problem: receiptMode === "simple" ? repair.issue : undefined,
          items,
          subtotal: repair.total,
          taxEnabled: settings.tax_enabled,
          total: repair.total,
          paid: repair.paid,
          remaining,
          trackingUrl,
          receivedBy: (repair as any).received_by || undefined,
          repairedBy: (repair as any).repaired_by || undefined,
          deviceCondition: (repair as any).device_condition || undefined,
          category: (repair as any).category || null,
        },
        settings,
        format,
        printerWidth
      );
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintLabel = async () => {
    if (!repair) return;
    setPrinting(true);
    try {
      const initials = getShopInitials(settings.shop_name);
      const ticketNum = (repair as any).ticket_number ?? null;
      const ticketLabel = formatTicketNumberPadded(initials, ticketNum);
      await generatePhoneLabel(
        {
          ticketNumber: ticketNum,
          ticketLabel: ticketLabel || null,
          customer: repair.customer,
          phone: repair.phone,
          device: repair.device,
          category: (repair as any).category || null,
          problem: repair.issue,
          depositDate: new Date(repair.depositDate).toLocaleDateString("fr-TN"),
          receivedBy: (repair as any).received_by || undefined,
          repairedBy: (repair as any).repaired_by || undefined,
          unlockCode: (repair as any).device_unlock_code || undefined,
        },
        settings.shop_name,
        printerWidth
      );
    } finally {
      setPrinting(false);
    }
  };

  if (!repair) return null;

  const remaining = repair.total - repair.paid;
  const previewInitials = getShopInitials(settings.shop_name);
  const previewTicketLabel = formatTicketNumber(previewInitials, (repair as any).ticket_number ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fiche de Réparation</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Preview summary */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-xs font-mono">
            <p className="text-center font-bold text-sm">{settings.shop_name}</p>
            <p className="text-center text-muted-foreground">BON DE RÉPARATION</p>
            {previewTicketLabel && (
              <>
                <p className="text-center text-[10px] tracking-widest text-muted-foreground mt-1">TICKET N°</p>
                <p className="text-center font-bold text-lg tracking-wider">{previewTicketLabel}</p>
              </>
            )}
            <div className="border-t my-1" />
            <p><span className="text-muted-foreground">Client :</span> {repair.customer}</p>
            <p><span className="text-muted-foreground">Appareil :</span> {repair.device}</p>
            {repair.imei && <p><span className="text-muted-foreground">IMEI :</span> {repair.imei}</p>}
            <div className="border-t my-1" />
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{format(repair.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payé</span><span className="text-success">{format(repair.paid)}</span></div>
            {remaining > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Reste</span><span className="text-destructive">{format(remaining)}</span></div>}
          </div>

          {/* Options */}
          <div className={cn("grid gap-2", isEmployee ? "grid-cols-1" : "grid-cols-2")}>
            {!isEmployee && (
              <div className="space-y-1">
                <Label className="text-xs">Mode reçu</Label>
                <Select value={receiptMode} onValueChange={setReceiptMode}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Détaillé (pièces)</SelectItem>
                    <SelectItem value="simple">Simple (total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Format imprimante</Label>
              <Select value={printerWidth} onValueChange={(v) => setPrinterWidth(v as "80mm" | "58mm")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80mm (standard)</SelectItem>
                  <SelectItem value="58mm">58mm (compact)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePrint} size="sm" className="w-full" disabled={printing}>
              <Printer className="h-4 w-4 mr-2" />
              {printing ? "..." : "Reçu client"}
            </Button>
            <Button onClick={handlePrintLabel} size="sm" variant="outline" className="w-full" disabled={printing}>
              <Tag className="h-4 w-4 mr-2" />
              {printing ? "..." : "Étiquette tél."}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}