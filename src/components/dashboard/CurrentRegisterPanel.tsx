import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Wrench, Receipt, Wallet } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useSessionTotals, useOpenSession } from "@/hooks/useRegisterSession";
import { Skeleton } from "@/components/ui/skeleton";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";

export function CurrentRegisterPanel() {
  const { format } = useCurrency();
  const { data: totals, isLoading } = useSessionTotals();
  const { data: session } = useOpenSession();

  const items = [
    { label: "Ventes", value: totals?.sales ?? 0, icon: ShoppingCart, prefix: "" },
    { label: "Réparations", value: totals?.repairs ?? 0, icon: Wrench, prefix: "" },
    { label: "Dépenses", value: totals?.expenses ?? 0, icon: Receipt, prefix: "- " },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Caisse en cours
        </CardTitle>
        {session?.opened_at && (
          <span className="text-xs text-muted-foreground">
            Ouverte {formatDate(new Date(session.opened_at), "d MMM HH:mm", { locale: fr })}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((it) => (
              <div key={it.label} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <it.icon className="h-3.5 w-3.5" />
                  {it.label}
                </div>
                <div className="mt-1 font-mono text-sm font-semibold">
                  {it.prefix}
                  {format(it.value)}
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Wallet className="h-3.5 w-3.5" />
                Net en caisse
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-primary">
                {format(totals?.net ?? 0)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
