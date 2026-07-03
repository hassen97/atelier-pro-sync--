import { useState } from "react";
import {
  ShoppingCart,
  Wrench,
  Package,
  AlertTriangle,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Shield,
  Plus,
  PackagePlus,
  Receipt,
  TrendingUp,
  TrendingDown,
  Printer,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SelectedPart } from "@/components/repairs/RepairDialog";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDashboardStats, useRecentRepairs, useLowStockAlerts } from "@/hooks/useDashboard";
import { CurrentRegisterPanel } from "@/components/dashboard/CurrentRegisterPanel";
import { useCreateRepair } from "@/hooks/useRepairs";
import { useDashboardRealtime } from "@/hooks/useRealtimeSubscription";
import { useCurrency } from "@/hooks/useCurrency";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { printOrderReceipt, type OrderReceiptItem } from "@/lib/receiptPdf";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { RepairDialog } from "@/components/repairs/RepairDialog";

import { MyTasks } from "@/components/dashboard/MyTasks";
import { useMyTeamInfo } from "@/hooks/useTeam";
import { SubscriptionBadge } from "@/components/dashboard/SubscriptionBadge";
import { OnboardingReminderBanner } from "@/components/onboarding/OnboardingReminderBanner";
import { WaitlistTrialBanner } from "@/components/dashboard/WaitlistTrialBanner";
import { OnboardingReminderModal } from "@/components/onboarding/OnboardingReminderModal";
import { useOnboardingReminder } from "@/hooks/useOnboardingReminder";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig = {
  pending: { label: "En attente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "En cours", icon: Loader2, className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Terminé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  delivered: { label: "Livré", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Annulé", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentRepairs = [], isLoading: repairsLoading } = useRecentRepairs(6);
  const { data: stockAlerts = [], isLoading: alertsLoading } = useLowStockAlerts(10);
  const createRepair = useCreateRepair();
  const { format } = useCurrency();
  const { settings } = useShopSettingsContext();
  const queryClient = useQueryClient();

  // Enable realtime updates for dashboard data
  useDashboardRealtime();

  const { data: teamInfo } = useMyTeamInfo();
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const navigate = useNavigate();
  const onboardingReminder = useOnboardingReminder();

  const isLoading = statsLoading || repairsLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Tableau de bord" description="Vue d'ensemble de votre activité" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="md:col-span-2 h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const handleExport = () => {
    const csvContent = [
      ["Rapport Dashboard", new Date().toLocaleDateString("fr-FR")],
      [],
      ["Statistiques"],
      ["Ventes du mois", stats?.salesTotal || 0],
      ["Réparations en cours", stats?.repairsInProgress || 0],
      ["Réparations terminées", stats?.repairsCompleted || 0],
      ["Alertes stock", stats?.stockAlerts || 0],
      ["Total produits", stats?.totalProducts || 0],
      ["Total clients", stats?.totalCustomers || 0],
      ["Dettes clients", stats?.customerDebts || 0],
      ["Dettes fournisseurs", stats?.supplierDebts || 0],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Rapport exporté avec succès");
  };

  // Top 3 most critical stock items (prefer 0-stock, then lowest)
  const criticalItems = [...stockAlerts]
    .sort((a: any, b: any) => (a.quantity ?? 0) - (b.quantity ?? 0))
    .slice(0, 3);

  const printOrder = (items: any[]) => {
    if (!items.length) {
      toast.error("Aucun produit à commander");
      return;
    }
    const orderItems: OrderReceiptItem[] = items.map((p) => ({
      name: p.name,
      sku: p.sku,
      quantity: p.quantity ?? 0,
      orderQty: Math.max((p.min_quantity || 5) - (p.quantity ?? 0), 1),
    }));
    printOrderReceipt({
      shopName: settings.shop_name || "RepairPro",
      address: settings.address || undefined,
      phone: settings.phone || undefined,
      dateTime: formatDate(new Date(), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr }),
      items: orderItems,
    });
  };

  const trendPct = stats?.salesTrendPct;
  const trendUp = (trendPct ?? 0) >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <WaitlistTrialBanner />
      {onboardingReminder.show && onboardingReminder.userId && (
        <>
          <OnboardingReminderBanner shopName={onboardingReminder.shopName} />
          <OnboardingReminderModal userId={onboardingReminder.userId} />
        </>
      )}
      <PageHeader
        title="Tableau de bord"
        description={`Vue d'ensemble · ${formatDate(new Date(), "EEEE d MMMM yyyy", { locale: fr })}`}
      >
        <SubscriptionBadge />
        <Button
          variant="outline"
          size="sm"
          className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
          onClick={() => navigate("/warranty")}
        >
          <Shield className="h-4 w-4 mr-2" />
          Garantie / Retour
        </Button>
      </PageHeader>

      {/* Quick Action Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          className="bg-gradient-primary hover:opacity-90 justify-start h-11"
          onClick={() => setRepairDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Réparation
        </Button>
        <Button variant="secondary" className="justify-start h-11" onClick={() => navigate("/pos")}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Nouvelle Vente
        </Button>
        <Button variant="secondary" className="justify-start h-11" onClick={() => navigate("/inventory")}>
          <PackagePlus className="h-4 w-4 mr-2" />
          Entrée Stock
        </Button>
        <Button variant="secondary" className="justify-start h-11" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Caisse en cours (wide) */}
        <div className="md:col-span-2">
          <CurrentRegisterPanel />
        </div>

        {/* Right column: Ventes du mois + Alertes stock */}
        <div className="grid grid-cols-1 gap-5">
          {/* Ventes du mois */}
          <div className="rounded-xl bg-muted/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ventes du mois
              </p>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight font-mono-numbers">
              {format(stats?.salesTotal || 0)}
            </p>
            {trendPct !== null && trendPct !== undefined ? (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-sm font-semibold",
                  trendUp ? "text-success" : "text-destructive",
                )}
              >
                {trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {trendUp ? "+" : ""}
                {Math.round(trendPct)}%
                <span className="font-normal text-muted-foreground">vs mois dernier</span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Pas d'historique le mois dernier</p>
            )}
          </div>

          {/* Alertes Stock */}
          <div className="rounded-xl bg-muted/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alertes stock
              </p>
              {(stats?.stockAlerts || 0) > 0 && (
                <Badge variant="destructive">{stats?.stockAlerts}</Badge>
              )}
            </div>
            {criticalItems.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucune alerte de stock</p>
            ) : (
              <div className="mt-3 space-y-2">
                {criticalItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.quantity ?? 0) <= 0
                          ? "Rupture"
                          : `${item.quantity} restant${item.quantity > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={() => printOrder([item])}
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Commander
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              {criticalItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => printOrder(criticalItems)}
                >
                  Tout commander
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs text-primary" asChild>
                <Link to="/inventory">Inventaire →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SecondaryStat
          label="Réparations en cours"
          value={stats?.repairsInProgress || 0}
          hint={`${stats?.repairsCompleted || 0} terminées`}
          icon={Wrench}
        />
        <SecondaryStat
          label="Total produits"
          value={stats?.totalProducts || 0}
          hint={`${stats?.totalCustomers || 0} clients`}
          icon={Package}
        />
        <SecondaryStat
          label="Dettes clients"
          value={format(stats?.customerDebts || 0)}
          icon={CreditCard}
          valueClassName="text-warning"
        />
        <SecondaryStat
          label="Dettes fournisseurs"
          value={format(stats?.supplierDebts || 0)}
          icon={Receipt}
          valueClassName="text-destructive"
        />
      </div>

      {/* My Tasks (for team members) */}
      {teamInfo && <MyTasks />}

      {/* Réparations récentes — compact table */}
      <div className="rounded-xl bg-muted/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Réparations récentes</h2>
            <p className="text-xs text-muted-foreground">Dernières fiches de réparation</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <Link to="/repairs">Voir tout →</Link>
          </Button>
        </div>
        {recentRepairs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune réparation récente
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Prix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRepairs.map((repair: any) => {
                const status =
                  statusConfig[repair.status as keyof typeof statusConfig] || statusConfig.pending;
                return (
                  <TableRow key={repair.id}>
                    <TableCell className="font-medium">
                      {repair.customer?.name || "Client anonyme"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block truncate max-w-[180px]">{repair.device_model}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono-numbers font-medium">
                      {format(Number(repair.total_cost) || 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Repair Dialog */}
      <RepairDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        onSubmit={async (data, selectedParts: SelectedPart[] = []) => {
          const created = await createRepair.mutateAsync({
            device_model: data.device_model || "",
            problem_description: data.problem_description || "",
            customer_id: data.customer_id || null,
            imei: data.imei,
            diagnosis: data.diagnosis,
            labor_cost: data.labor_cost,
            parts_cost: data.parts_cost,
            total_cost: data.total_cost,
            amount_paid: data.amount_paid,
            notes: data.notes,
            estimated_ready_date: data.estimated_ready_date || null,
            technician_note: data.technician_note || null,
          });

          if (selectedParts.length > 0 && created?.id) {
            const partsToInsert = selectedParts.map((p) => ({
              repair_id: created.id,
              product_id: p.product_id,
              quantity: p.quantity,
              unit_price: p.unit_price,
            }));
            await supabase.from("repair_parts").insert(partsToInsert);

            for (const part of selectedParts) {
              const { data: product } = await supabase
                .from("products")
                .select("quantity")
                .eq("id", part.product_id)
                .single();
              if (product) {
                await supabase
                  .from("products")
                  .update({ quantity: Math.max(0, product.quantity - part.quantity), updated_at: new Date().toISOString() })
                  .eq("id", part.product_id);
              }
            }
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
          }

          setRepairDialogOpen(false);
        }}
        isLoading={createRepair.isPending}
      />
    </div>
  );
}

function SecondaryStat({
  label,
  value,
  hint,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
      </div>
      <p className={cn("mt-1.5 text-xl font-bold tracking-tight font-mono-numbers", valueClassName)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
