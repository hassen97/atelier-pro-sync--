import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, Send, CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useDefectiveParts } from "@/hooks/useWarranty";
import { useUpdateDefectivePartRMA } from "@/hooks/useRMA";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";

const PAGE_SIZE = 20;

const statusLabels: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20", icon: Package },
  sent: { label: "Envoyé", className: "bg-primary/10 text-primary border-primary/20", icon: Send },
  replaced: { label: "Remplacé", className: "bg-success/10 text-success border-success/20", icon: RefreshCw },
  refunded: { label: "Remboursé", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  rejected: { label: "Rejeté", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  // Legacy
  returned_to_supplier: { label: "Retourné", className: "bg-primary/10 text-primary border-primary/20", icon: Send },
  written_off: { label: "Perdu", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

export function SupplierRMAList() {
  const { data: parts = [], isLoading } = useDefectiveParts();
  const updateRMA = useUpdateDefectivePartRMA();
  const { format } = useCurrency();
  const [page, setPage] = useState(1);

  if (isLoading) return <Skeleton className="h-40" />;

  if ((parts as any[]).length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune pièce défectueuse / RMA</p>
        </CardContent>
      </Card>
    );
  }

  const handleStatusChange = (part: any, newStatus: string) => {
    updateRMA.mutate({
      id: part.id,
      status: newStatus,
      supplier_id: part.supplier_id,
      refund_amount: Number(part.refund_amount) || 0,
      product_id: part.product_id,
      quantity: part.quantity,
    });
  };

  const totalPages = Math.max(1, Math.ceil((parts as any[]).length / PAGE_SIZE));
  const paginatedParts = (parts as any[]).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          RMA Fournisseur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {paginatedParts.map((part: any) => {
          const status = statusLabels[part.status] || statusLabels.pending;
          return (
            <div key={part.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border">
              <div className="min-w-0 flex-1 basis-52">
                <p className="text-sm font-medium truncate">{part.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  Qté: {part.quantity} • {part.supplier?.name || "Fournisseur inconnu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(part.created_at).toLocaleDateString("fr-FR")}
                  {part.sent_date && ` • Envoyé: ${new Date(part.sent_date).toLocaleDateString("fr-FR")}`}
                </p>
                {Number(part.refund_amount) > 0 && (
                  <p className="text-xs font-medium text-success mt-0.5">Remboursé: {format(Number(part.refund_amount))}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <Badge variant="secondary" className={`hidden sm:inline-flex ${status.className}`}>{status.label}</Badge>
                <Select
                  value={part.status}
                  onValueChange={(value) => handleStatusChange(part, value)}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="sent">Envoyé</SelectItem>
                    <SelectItem value="replaced">Remplacé</SelectItem>
                    <SelectItem value="refunded">Remboursé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{(parts as any[]).length} pièces • Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
