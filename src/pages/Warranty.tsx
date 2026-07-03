import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, Clock, CheckCircle2, XCircle, Undo2, Package, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useWarrantyTickets, useDefectiveParts } from "@/hooks/useWarranty";
import { useProductReturns } from "@/hooks/useProductReturns";
import { ProductReturnDrawer } from "@/components/returns/ProductReturnDrawer";
import { WarrantyDrawer } from "@/components/returns/WarrantyDrawer";
import { SupplierRMAList } from "@/components/returns/SupplierRMAList";
import { LossReport } from "@/components/returns/LossReport";
import { QuickScanReturn } from "@/components/returns/QuickScanReturn";
import { useCurrency } from "@/hooks/useCurrency";
import { StatCard } from "@/components/ui/stat-card";

const PAGE_SIZE = 20;

const ticketStatusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Résolu", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Annulé", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const reasonLabels: Record<string, string> = {
  supplier_defect: "Défaut fournisseur",
  tech_error: "Erreur technique",
  customer_damage: "Dommage client",
};

// Skeleton card for loading states
function SkeletonCard() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function PaginationControls({ page, total, onPageChange }: { page: number; total: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">{total} résultats • Page {page} / {totalPages}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Warranty() {
  const { data: tickets = [], isLoading: ticketsLoading } = useWarrantyTickets();
  const { data: parts = [], isLoading: partsLoading } = useDefectiveParts();
  const { data: returns = [], isLoading: returnsLoading } = useProductReturns();
  const [returnDrawerOpen, setReturnDrawerOpen] = useState(false);
  const [warrantyDrawerOpen, setWarrantyDrawerOpen] = useState(false);
  const { format } = useCurrency();

  // Pagination state
  const [returnsPage, setReturnsPage] = useState(1);
  const [warrantyPage, setWarrantyPage] = useState(1);

  const isLoading = ticketsLoading || partsLoading || returnsLoading;

  // Stats
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const returnsThisMonth = (returns as any[]).filter((r: any) => r.created_at?.startsWith(monthKey)).length;
  const warrantyThisMonth = (tickets as any[]).filter((t: any) => t.created_at?.startsWith(monthKey)).length;
  const totalLossThisMonth = (tickets as any[])
    .filter((t: any) => t.created_at?.startsWith(monthKey))
    .reduce((s: number, t: any) => s + Number(t.total_cost || 0), 0)
    + (returns as any[])
      .filter((r: any) => r.created_at?.startsWith(monthKey))
      .reduce((s: number, r: any) => s + Number(r.refund_amount || 0), 0);
  const pendingRMA = (parts as any[]).filter((p: any) => p.status === "pending" || p.status === "sent").length;

  // Paginated slices
  const paginatedReturns = (returns as any[]).slice((returnsPage - 1) * PAGE_SIZE, returnsPage * PAGE_SIZE);
  const paginatedTickets = (tickets as any[]).slice((warrantyPage - 1) * PAGE_SIZE, warrantyPage * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Retours & RMA" description="Gestion des retours produits, garanties SAV et RMA fournisseur" />

      {/* Quick Scan */}
      <QuickScanReturn />

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Retours ce mois" value={returnsThisMonth} icon={Undo2} />
          <StatCard title="Garanties ce mois" value={warrantyThisMonth} icon={Shield} />
          <StatCard title="Pertes ce mois" value={format(totalLossThisMonth)} icon={TrendingDown} variant="destructive" />
          <StatCard title="RMA en attente" value={pendingRMA} icon={AlertTriangle} variant="warning" />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="returns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="returns">Retours Produits</TabsTrigger>
          <TabsTrigger value="warranty">Garantie SAV</TabsTrigger>
          <TabsTrigger value="rma">RMA Fournisseur</TabsTrigger>
          <TabsTrigger value="losses">Rapport Pertes</TabsTrigger>
        </TabsList>

        {/* Tab 1: Product Returns */}
        <TabsContent value="returns" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setReturnDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Nouveau retour
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Undo2 className="h-4 w-4 text-primary" />
                Retours produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {returnsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (returns as any[]).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun retour produit</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedReturns.map((ret: any) => (
                      <div key={ret.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ret.product_name} x{ret.quantity}</p>
                          <p className="text-xs text-muted-foreground">
                            {ret.customer?.name || "Client anonyme"} • {ret.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ret.created_at).toLocaleDateString("fr-FR")}
                            {" • "}
                            {ret.refund_method === "cash" ? "Remboursement espèces" : "Avoir client"}
                            {" • "}
                            {ret.stock_destination === "available" ? "→ Stock" : "→ Déchet"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            {ret.status === "completed" ? "Terminé" : "En attente"}
                          </Badge>
                          <span className="text-sm font-medium font-mono-numbers">{format(Number(ret.refund_amount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls page={returnsPage} total={(returns as any[]).length} onPageChange={setReturnsPage} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Warranty */}
        <TabsContent value="warranty" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setWarrantyDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Nouveau ticket
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Tickets de garantie
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (tickets as any[]).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun ticket de garantie</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedTickets.map((ticket: any) => {
                      const status = ticketStatusConfig[ticket.status] || ticketStatusConfig.pending;
                      const StatusIcon = status.icon;
                      const repair = ticket.original_repair;
                      return (
                        <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${status.className}`}>
                              <StatusIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {repair?.device_model || "Réparation"} — {repair?.customer?.name || "Client anonyme"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {reasonLabels[ticket.return_reason] || ticket.return_reason}
                                {ticket.action_taken && ` • ${ticket.action_taken}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="secondary" className={status.className}>{status.label}</Badge>
                            <span className="text-sm font-medium font-mono-numbers">{format(Number(ticket.total_cost) || 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <PaginationControls page={warrantyPage} total={(tickets as any[]).length} onPageChange={setWarrantyPage} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Supplier RMA */}
        <TabsContent value="rma">
          <SupplierRMAList />
        </TabsContent>

        {/* Tab 4: Loss Report */}
        <TabsContent value="losses">
          <LossReport />
        </TabsContent>
      </Tabs>

      <ProductReturnDrawer open={returnDrawerOpen} onOpenChange={setReturnDrawerOpen} />
      <WarrantyDrawer open={warrantyDrawerOpen} onOpenChange={setWarrantyDrawerOpen} />
    </div>
  );
}
