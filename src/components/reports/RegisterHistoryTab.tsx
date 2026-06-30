import { useState } from "react";
import { Printer, History, Wallet, FileDown, Eye, Loader2, Sheet } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useRegisterHistory, type RegisterHistoryRow } from "@/hooks/useRegisterSession";
import {
  printRegisterZReport,
  generateClosingReportPdf,
  type ClosingBreakdownRow,
} from "@/lib/receiptPdf";
import { generateClosingReportExcel } from "@/lib/closingReportExcel";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export function RegisterHistoryTab() {
  const { format } = useCurrency();
  const { settings } = useShopSettingsContext();
  const { data: sessions, isLoading } = useRegisterHistory();
  const [detail, setDetail] = useState<RegisterHistoryRow | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [xlsBusy, setXlsBusy] = useState<string | null>(null);

  const shopName = (settings as any).shop_name || "Boutique";

  const formatClosedAt = (value: string | null) =>
    value ? formatDate(new Date(value), "dd/MM/yyyy HH:mm", { locale: fr }) : "—";

  const catRows = (row: RegisterHistoryRow): ClosingBreakdownRow[] =>
    (row.report_data?.byCategory || []).map((c) => ({
      label: c.category,
      value: format(c.revenue),
      meta: `${c.items}`,
    }));
  const prodRows = (row: RegisterHistoryRow): ClosingBreakdownRow[] =>
    (row.report_data?.byProduct || []).map((p) => ({
      label: p.product_name,
      value: format(p.revenue),
      meta: `${p.quantity}`,
    }));
  const payRows = (row: RegisterHistoryRow): ClosingBreakdownRow[] =>
    (row.report_data?.byPaymentMethod || []).map((p) => ({
      label: p.method,
      value: format(p.revenue),
    }));
  const repairBreakdown = (row: RegisterHistoryRow): ClosingBreakdownRow[] =>
    (row.report_data?.repairs.rows || []).map((rp) => ({
      label: rp.label,
      value: format(rp.amount),
      meta: rp.customer || undefined,
    }));

  const handleReprint = (row: RegisterHistoryRow) => {
    printRegisterZReport({
      shopName,
      dateTime: formatClosedAt(row.closed_at),
      sales: format(row.snapshot_ventes),
      repairs: format(row.snapshot_reparations),
      expenses: format(row.snapshot_depenses),
      returns: row.report_data?.totals.returns
        ? format(row.report_data.totals.returns)
        : null,
      net: format(row.snapshot_net),
      itemsSold: row.report_data?.totals.itemsSold,
      byCategory: catRows(row),
      byPaymentMethod: payRows(row),
      closedBy: row.closed_by_name,
      isReprint: true,
    });
  };

  const handlePdf = async (row: RegisterHistoryRow) => {
    if (!row.report_data) {
      toast.error("Aucun rapport détaillé pour cette clôture.");
      return;
    }
    setPdfBusy(row.id);
    try {
      await generateClosingReportPdf(
        {
          shopName,
          address: (settings as any).address,
          phone: (settings as any).phone,
          logoUrl: (settings as any).logo_url,
          dateTime: formatClosedAt(row.closed_at),
          closedBy: row.closed_by_name,
          isDuplicate: true,
          byCategory: row.report_data.byCategory,
          byPaymentMethod: row.report_data.byPaymentMethod,
          returns: row.report_data.returns.rows,
          expenses: row.report_data.expenses.rows,
          totals: row.report_data.totals,
        },
        format
      );
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setPdfBusy(null);
    }
  };

  const rd = detail?.report_data ?? null;

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
                  <TableHead>Clôturé par</TableHead>
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
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.closed_by_name || "—"}
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
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetail(row)}
                          disabled={!row.report_data}
                          title="Voir le détail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePdf(row)}
                          disabled={pdfBusy === row.id || !row.report_data}
                          title="Exporter en PDF"
                        >
                          {pdfBusy === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprint(row)}
                          title="Réimprimer (80mm)"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Detail modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la clôture</DialogTitle>
            <DialogDescription>
              {formatClosedAt(detail?.closed_at ?? null)}
              {detail?.closed_by_name ? ` — Clôturé par ${detail.closed_by_name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {!rd ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun rapport détaillé pour cette clôture.
            </p>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-4 py-1 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Ventes" value={format(rd.totals.sales)} />
                  <Stat label="Réparations" value={format(rd.totals.repairs)} />
                  <Stat label="Retours" value={`- ${format(rd.totals.returns)}`} />
                  <Stat label="Dépenses" value={`- ${format(rd.totals.expenses)}`} />
                  <Stat label="Articles vendus" value={String(rd.totals.itemsSold)} />
                  <Stat label="Net en caisse" value={format(rd.totals.net)} highlight />
                </div>

                {rd.byCategory.length > 0 && (
                  <Section title="Ventes par catégorie">
                    {rd.byCategory.map((c) => (
                      <Row
                        key={c.category}
                        left={`${c.category} (${c.items} art.)`}
                        right={format(c.revenue)}
                      />
                    ))}
                  </Section>
                )}

                {rd.byPaymentMethod.length > 0 && (
                  <Section title="Modes de paiement">
                    {rd.byPaymentMethod.map((p) => (
                      <Row
                        key={p.method}
                        left={`${p.method} (${p.count})`}
                        right={format(p.revenue)}
                      />
                    ))}
                  </Section>
                )}

                {rd.returns.rows.length > 0 && (
                  <Section title="Retours">
                    {rd.returns.rows.map((r, i) => (
                      <Row
                        key={`${r.product_name}-${i}`}
                        left={`${r.product_name} x${r.quantity}`}
                        right={`- ${format(r.refund_amount)}`}
                        danger
                      />
                    ))}
                  </Section>
                )}

                {rd.expenses.rows.length > 0 && (
                  <Section title="Dépenses">
                    {rd.expenses.rows.map((e, i) => (
                      <Row
                        key={`${e.category}-${i}`}
                        left={e.category}
                        right={`- ${format(e.amount)}`}
                        danger
                      />
                    ))}
                  </Section>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? "border-primary/40 bg-primary/10" : "bg-muted/30"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`font-mono font-semibold ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="rounded-lg border divide-y">{children}</div>
    </div>
  );
}

function Row({
  left,
  right,
  danger,
}: {
  left: string;
  right: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-muted-foreground">{left}</span>
      <span className={`font-mono font-medium ${danger ? "text-destructive" : ""}`}>
        {right}
      </span>
    </div>
  );
}
