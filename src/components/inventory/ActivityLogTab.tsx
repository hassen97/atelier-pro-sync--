import { useState } from "react";
import { Package, ShoppingCart, Pencil, Trash2, BarChart3, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLog, ACTIVITY_LOG_PAGE_SIZE } from "@/hooks/useActivityLog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  product_created: { label: "Produit ajouté", icon: Package, color: "bg-success/10 text-success border-success/20" },
  product_updated: { label: "Produit modifié", icon: Pencil, color: "bg-primary/10 text-primary border-primary/20" },
  stock_adjusted: { label: "Stock ajusté", icon: BarChart3, color: "bg-warning/10 text-warning border-warning/20" },
  product_deleted: { label: "Produit supprimé", icon: Trash2, color: "bg-destructive/10 text-destructive border-destructive/20" },
  sale_completed: { label: "Vente effectuée", icon: ShoppingCart, color: "bg-accent/10 text-accent-foreground border-accent/20" },
};

export function ActivityLogTab() {
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const { data: result = { data: [], count: 0 }, isLoading } = useActivityLog({
    action: actionFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
  });

  const activities = result.data;
  const totalCount = result.count;
  const totalPages = Math.ceil(totalCount / ACTIVITY_LOG_PAGE_SIZE);

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(0);
  };

  const renderDetails = (action: string, details: Record<string, any> | null) => {
    if (!details) return null;
    switch (action) {
      case "product_created":
        return <span>«{details.name}» — Qté: {details.quantity}, Prix: {details.sell_price}</span>;
      case "product_updated":
        return <span>«{details.name}» {details.old_price !== details.new_price ? `Prix: ${details.old_price} → ${details.new_price}` : ""}</span>;
      case "stock_adjusted":
        return <span>«{details.name}» Stock: {details.old_quantity} → {details.new_quantity}</span>;
      case "product_deleted":
        return <span>«{details.name}» supprimé</span>;
      case "sale_completed":
        return <span>Montant: {details.total_amount} ({details.payment_method})</span>;
      default:
        return <span>{JSON.stringify(details)}</span>;
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={handleFilterChange(setActionFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type d'action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="product_created">Produit ajouté</SelectItem>
              <SelectItem value="product_updated">Produit modifié</SelectItem>
              <SelectItem value="stock_adjusted">Stock ajusté</SelectItem>
              <SelectItem value="product_deleted">Produit supprimé</SelectItem>
              <SelectItem value="sale_completed">Vente effectuée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="w-40" />
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="w-40" />
        </div>
        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground self-center">
            {totalCount} entrée{totalCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune activité enregistrée
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activities.map((entry) => {
            const config = ACTION_CONFIG[entry.action] || { label: entry.action, icon: Package, color: "bg-muted text-muted-foreground" };
            const Icon = config.icon;
            return (
              <Card key={entry.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={config.color}>{config.label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5 truncate">
                      {renderDetails(entry.action, entry.details)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
