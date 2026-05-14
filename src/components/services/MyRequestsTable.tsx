import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyServiceRequests, useCancelServiceRequest, type ServiceRequestRow } from "@/hooks/useServiceRequests";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyValueList } from "@/components/services/KeyValueList";

const statusVariant = (s: ServiceRequestRow["status"]) => {
  switch (s) {
    case "pending": return { label: "En attente", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
    case "in_progress": return { label: "En cours", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" };
    case "completed": return { label: "Terminée", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
    case "cancelled": return { label: "Annulée", cls: "bg-muted text-muted-foreground border-border" };
  }
};

export function MyRequestsTable() {
  const { data = [], isLoading } = useMyServiceRequests();
  const cancel = useCancelServiceRequest();
  const { format: fmtCurrency } = useCurrency();
  const [detail, setDetail] = useState<ServiceRequestRow | null>(null);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Chargement...</div>;
  if (!data.length) return <div className="text-sm text-muted-foreground p-8 text-center">Aucune demande pour le moment.</div>;

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const s = statusVariant(r.status);
              const summary = r.input_data?.imei || r.input_data?.model || "—";
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM HH:mm", { locale: fr })}</TableCell>
                  <TableCell className="font-medium">{r.service_name_snapshot}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{summary}</TableCell>
                  <TableCell className="text-xs">{fmtCurrency(Number(r.service_price_snapshot))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Voir</Button>
                    {r.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
                        Annuler
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Service :</span> <strong>{detail.service_name_snapshot}</strong></div>
              <div><span className="text-muted-foreground">Statut :</span> {statusVariant(detail.status).label}</div>
              <div>
                <div className="text-muted-foreground mb-1.5">Données envoyées :</div>
                <div className="rounded bg-muted/50 p-3">
                  <KeyValueList data={detail.input_data} />
                </div>
              </div>
              {detail.admin_note && (
                <div>
                  <div className="text-muted-foreground mb-1">Note de l'administrateur :</div>
                  <div className="rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap">{detail.admin_note}</div>
                </div>
              )}
              {detail.result_data && Object.keys(detail.result_data).length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1.5">Résultat :</div>
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-3">
                    <KeyValueList data={detail.result_data} />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
