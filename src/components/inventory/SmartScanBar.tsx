import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ScanBarcode, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ScannableProduct {
  id: string;
  name: string;
  barcodes: string[];
  sku?: string | null;
  stock: number;
}

interface SmartScanBarProps {
  products: ScannableProduct[];
  isLocked: boolean;
  onProductScanned: (productId: string, productName: string, newStock: number) => void;
  onUnknownBarcode: (barcode: string) => void;
  onStockIncrement: (id: string, quantity: number) => void;
}

export interface SmartScanBarRef {
  focus: () => void;
}

function playBeep(type: "success" | "error") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // AudioContext not available
  }
}

export const SmartScanBar = forwardRef<SmartScanBarRef, SmartScanBarProps>(
  ({ products, isLocked, onProductScanned, onUnknownBarcode, onStockIncrement }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [lastScanned, setLastScanned] = useState<{ name: string; stock: number; type: "found" | "unknown" } | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Auto-focus on mount
    useEffect(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }, []);

    const handleScan = (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      // Search in barcodes array first, then fallback to sku
      const found = products.find(
        (p) =>
          (p.barcodes && p.barcodes.includes(trimmed)) ||
          p.sku === trimmed
      );

      if (found) {
        playBeep("success");
        const newStock = found.stock + 1;
        onStockIncrement(found.id, newStock);
        onProductScanned(found.id, found.name, newStock);
        setLastScanned({ name: found.name, stock: newStock, type: "found" });
        setPopoverOpen(true);
        setTimeout(() => {
          setPopoverOpen(false);
          inputRef.current?.focus();
        }, 2500);
      } else {
        playBeep("error");
        setLastScanned({ name: trimmed, stock: 0, type: "unknown" });
        setPopoverOpen(true);
        setTimeout(() => setPopoverOpen(false), 1500);
        onUnknownBarcode(trimmed);
      }

      setValue("");
    };

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full sm:w-64">
            <ScanBarcode
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                isLocked ? "text-muted-foreground" : "text-primary"
              )}
            />
            <Input
              ref={inputRef}
              placeholder="Scan global — En attente..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScan(value);
                }
              }}
              className={cn(
                "pl-9 font-mono text-sm border-2 transition-all",
                !isLocked && "border-primary/30 focus:border-primary shadow-sm shadow-primary/10",
                isLocked && "opacity-50 cursor-not-allowed"
              )}
              disabled={isLocked}
              autoComplete="off"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start" side="bottom">
          {lastScanned?.type === "found" ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">{lastScanned.name}</p>
                <p className="text-xs text-muted-foreground">
                  +1 ajouté · Stock : <span className="font-bold text-foreground">{lastScanned.stock}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Code inconnu</p>
                <p className="text-xs text-muted-foreground font-mono">{lastScanned?.name}</p>
                <p className="text-xs text-primary mt-0.5">Ouverture du formulaire...</p>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

SmartScanBar.displayName = "SmartScanBar";
