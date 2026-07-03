import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ShoppingBag, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useCurrency } from "@/hooks/useCurrency";

export function QuickScanReturn() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const effectiveUserId = useEffectiveUserId();
  const { format } = useCurrency();

  const handleScan = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 3 || !effectiveUserId) return;

    setSearching(true);
    try {
      // Search products by barcode
      const { data: products } = await supabase
        .from("products")
        .select("id, name, barcodes")
        .eq("user_id", effectiveUserId)
        .contains("barcodes", [value.trim()]);

      const productIds = (products || []).map(p => p.id);
      const hits: any[] = [];

      if (productIds.length > 0) {
        // Find last sale with this product
        const { data: saleItems } = await supabase
          .from("sale_items")
          .select("*, sale:sales(id, created_at, total_amount, customer:customers(name))")
          .in("product_id", productIds)
          .order("created_at", { ascending: false })
          .limit(3);

        (saleItems || []).forEach((si: any) => {
          hits.push({
            type: "sale",
            date: si.sale?.created_at,
            customer: si.sale?.customer?.name || "Anonyme",
            amount: si.sale?.total_amount,
            product: (products || []).find(p => p.id === si.product_id)?.name,
          });
        });

        // Find last repair with this product
        const { data: repairParts } = await supabase
          .from("repair_parts")
          .select("*, repair:repairs(id, created_at, device_model, customer:customers(name))")
          .in("product_id", productIds)
          .order("created_at", { ascending: false })
          .limit(3);

        (repairParts || []).forEach((rp: any) => {
          hits.push({
            type: "repair",
            date: rp.repair?.created_at,
            customer: rp.repair?.customer?.name || "Anonyme",
            device: rp.repair?.device_model,
            product: (products || []).find(p => p.id === rp.product_id)?.name,
          });
        });
      }

      setResults(hits);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Scanner un code-barres pour rechercher l'historique..."
          value={query}
          onChange={(e) => handleScan(e.target.value)}
          className="pl-9"
        />
      </div>
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r, i) => (
            <Card key={i}>
              <CardContent className="p-2 flex items-center gap-2 text-sm">
                {r.type === "sale" ? <ShoppingBag className="h-4 w-4 text-primary shrink-0" /> : <Wrench className="h-4 w-4 text-orange-500 shrink-0" />}
                <span className="truncate">{r.product} — {r.customer}</span>
                <Badge variant="outline" className="ml-auto text-xs shrink-0">
                  {r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "—"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
