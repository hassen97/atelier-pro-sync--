import { Printer, History, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useRegisterHistory, type RegisterHistoryRow } from "@/hooks/useRegisterSession";
import { printRegisterZReport } from "@/lib/receiptPdf";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";

export function RegisterHistoryTab() {
  const { format } = useCurrency();
  const { settings } = useShopSettingsContext();
  const { data: sessions, isLoading } = useRegisterHistory();

  const formatClosedAt = (value: string | null) =>
    value ? formatDate(new Date(value), "dd/MM/yyyy HH:mm", { locale: fr }) : "—";

  const handleReprint = (row: RegisterHistoryRow) => {
    printRegisterZReport({
      shopName: (settings as any).shop_name || "Boutique",
      dateTime: formatClosedAt(row.closed_at),
      sales: format(row.snapshot_ventes),
      repairs: format(row.snapshot_reparations),
      expenses: format(row.snapshot_depenses),
      net: format(row.snapshot_net),
      isReprint: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-primary" />
          Historique des Caisses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <Wallet className="h-8 w-8 opacity-40" />
            <p className="text-sm">Aucune clôture de caisse pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date de clôture</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Réparations</TableHead>
                  <TableHead className="text-right">Dépenses</TableHead>
                  <TableHead className="text-right">Net en Caisse</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatClosedAt(row.closed_at)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {format(row.snapshot_ventes)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {format(row.snapshot_reparations)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      - {format(row.snapshot_depenses)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {format(row.snapshot_net)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprint(row)}
                      >
                        <Printer className="h-4 w-4" />
                        Réimprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
