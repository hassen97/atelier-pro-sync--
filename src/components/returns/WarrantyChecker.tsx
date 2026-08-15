import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldX, Search, Loader2, Wrench, Plus } from "lucide-react";
import { useSearchRepairForWarranty, getWarrantyExpiry } from "@/hooks/useWarranty";
import { useShopSettings } from "@/hooks/useShopSettings";
import { useCurrency } from "@/hooks/useCurrency";

interface WarrantyCheckerProps {
  onCreateTicket: (repair: any) => void;
}

/**
 * SAV command center hero: type an IMEI / ticket n° / phone number and get an
 * instant warranty verdict for the original repair (covered / expired), based
 * on the shop's configured warranty_days.
 */
export function WarrantyChecker({ onCreateTicket }: WarrantyCheckerProps) {
  const [query, setQuery] = useState("");
  const searchRepair = useSearchRepairForWarranty();
  const { settings } = useShopSettings();
  const { format } = useCurrency();
  const warrantyDays = Number(settings?.warranty_days ?? 30);

  const handleSearch = () => {
    if (query.trim().length >= 2) searchRepair.mutate(query);
  };

  const results = searchRepair.data || [];

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-tight">Vérificateur de garantie</p>
            <p className="text-xs text-muted-foreground">
              IMEI, n° de ticket ou téléphone — garantie {warrantyDays} jours
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: 35209810..., #1024, 22 555 123"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={searchRepair.isPending || query.trim().length < 2} size="sm" className="shrink-0">
            {searchRepair.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
          </Button>
        </div>

        {searchRepair.isPending && (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {!searchRepair.isPending && searchRepair.isSuccess && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucune réparation trouvée pour cette recherche.
          </p>
        )}

        {!searchRepair.isPending && results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {results.map((repair: any) => {
              const expiry = getWarrantyExpiry(repair, warrantyDays);
              const covered = expiry?.covered ?? false;
              return (
                <div
                  key={repair.id}
                  className={`rounded-lg border p-3 space-y-2 ${covered ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{repair.device_model}</span>
                        {repair.ticket_number != null && (
                          <span className="text-xs text-muted-foreground font-mono-numbers">#{repair.ticket_number}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {repair.customer?.name || "Client anonyme"}
                        {repair.customer?.phone ? ` • ${repair.customer.phone}` : ""}
                        {" • "}
                        {new Date(repair.created_at).toLocaleDateString("fr-FR")}
                        {" • "}
                        {format(Number(repair.total_cost || 0))}
                      </p>
                    </div>
                    {expiry ? (
                      covered ? (
                        <Badge className="bg-success/15 text-success border-success/30 shrink-0">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Sous garantie · {expiry.daysLeft} j restants
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 shrink-0">
                          <ShieldX className="h-3 w-3 mr-1" />
                          Expirée depuis {Math.abs(expiry.daysLeft)} j
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="shrink-0">Garantie n/a</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {expiry
                        ? `Expire le ${expiry.expiry.toLocaleDateString("fr-FR")}`
                        : "Date de référence introuvable"}
                    </p>
                    <Button size="sm" variant={covered ? "default" : "outline"} className="h-7 text-xs" onClick={() => onCreateTicket(repair)}>
                      <Plus className="h-3 w-3 mr-1" />
                      {covered ? "Créer un ticket garantie" : "Créer un ticket (hors garantie)"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
