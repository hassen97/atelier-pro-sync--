import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package } from "lucide-react";
import { useDefectiveParts, useUpdateDefectivePartStatus } from "@/hooks/useWarranty";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  returned_to_supplier: { label: "Retourné", className: "bg-primary/10 text-primary border-primary/20" },
  written_off: { label: "Perdu", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function DefectivePartsList() {
  const { data: parts = [], isLoading } = useDefectiveParts();
  const updateStatus = useUpdateDefectivePartStatus();

  if (isLoading) {
    return <Skeleton className="h-40" />;
  }

  if (parts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune pièce défectueuse</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Pièces défectueuses / RMA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(parts as any[]).map((part: any) => {
          const status = statusLabels[part.status] || statusLabels.pending;
          return (
            <div key={part.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">{part.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  Qté: {part.quantity} • {part.supplier?.name || "Fournisseur inconnu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(part.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={part.status}
                  onValueChange={(value) => updateStatus.mutate({ id: part.id, status: value })}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="returned_to_supplier">Retourné</SelectItem>
                    <SelectItem value="written_off">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
