import { useState } from "react";
import {
  ShoppingCart,
  Wrench,
  Package,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Shield,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SelectedPart } from "@/components/repairs/RepairDialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardStats, useRecentRepairs, useLowStockAlerts } from "@/hooks/useDashboard";
import { useCreateRepair } from "@/hooks/useRepairs";
import { useDashboardRealtime } from "@/hooks/useRealtimeSubscription";
import { useCurrency } from "@/hooks/useCurrency";
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

const statusConfig = {
  pending: { label: "En attente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "En cours", icon: Loader2, className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Terminé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  delivered: { label: "Livré", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Annulé", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentRepairs = [], isLoading: repairsLoading } = useRecentRepairs(5);
  const { data: stockAlerts = [], isLoading: alertsLoading } = useLowStockAlerts(5);
  const createRepair = useCreateRepair();
  const { format } = useCurrency();
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
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
        description="Vue d'ensemble de votre activité"
      >
        <SubscriptionBadge />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
        <Button variant="outline" size="sm" className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10" onClick={() => navigate("/warranty")}>
          <Shield className="h-4 w-4 mr-2" />
          Garantie / Retour
        </Button>
        <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={() => setRepairDialogOpen(true)}>
          + Nouvelle réparation
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventes du mois"
          value={format(stats?.salesTotal || 0)}
          icon={ShoppingCart}
          variant="success"
        />
        <StatCard
          title="Réparations en cours"
          value={stats?.repairsInProgress || 0}
          subtitle={`${stats?.repairsCompleted || 0} terminées`}
          icon={Wrench}
          variant="accent"
        />
        <StatCard
          title="Alertes stock"
          value={stats?.stockAlerts || 0}
          subtitle="Produits en rupture imminente"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Total produits"
          value={stats?.totalProducts || 0}
          subtitle={`${stats?.totalCustomers || 0} clients`}
          icon={Package}
          variant="default"
        />
      </div>

      {/* Debts Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dettes clients</p>
                <p className="mt-1 text-xl font-bold font-mono-numbers text-warning">
                  {format(stats?.customerDebts || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-warning" />
                <ArrowUpRight className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dettes fournisseurs</p>
                <p className="mt-1 text-xl font-bold font-mono-numbers text-destructive">
                  {format(stats?.supplierDebts || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-destructive" />
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks (for team members) */}
      {teamInfo && <MyTasks />}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Repairs */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Réparations récentes</CardTitle>
                <CardDescription>Dernières fiches de réparation</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link to="/repairs">Voir tout →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentRepairs.length === 0 ? (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  Aucune réparation récente
                </div>
              ) : (
                recentRepairs.map((repair: any) => {
                  const status = statusConfig[repair.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={repair.id}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", status.className)}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {repair.customer?.name || "Client anonyme"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {repair.device_model} • {repair.problem_description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary" className={status.className}>
                          {status.label}
                        </Badge>
                        <span className="text-sm font-medium font-mono-numbers">
                          {format(Number(repair.total_cost) || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <CardTitle className="text-base">Alertes stock</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockAlerts.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-sm">
                  Aucune alerte de stock
                </div>
              ) : (
                stockAlerts.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Seuil: {item.min_quantity} unités
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      {item.quantity} restant{item.quantity > 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <Link to="/inventory">Voir l'inventaire</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
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
