import { useState } from "react";
import { motion } from "framer-motion";
import { useSubscription, useMyOrders } from "@/hooks/useSubscription";
import { usePublicPlans, getPlanDisplayFeatures } from "@/hooks/useSubscriptionPlans";
import { usePlanPermissions } from "@/hooks/usePlanPermissions";
import { useTeamMembers } from "@/hooks/useTeam";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Zap, Star, Check, ArrowRight, Calendar, Clock,
  CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink, Users, Package, Wrench,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: "Approuvé", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: XCircle },
  pending: { label: "En attente", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
};

export function BillingDashboard() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: orders, isLoading: ordersLoading } = useMyOrders();
  const { data: plans, isLoading: plansLoading } = usePublicPlans();
  const { features, getLimit } = usePlanPermissions();
  const { data: members = [] } = useTeamMembers();
  const navigate = useNavigate();

  const currentPlan = subscription?.plan;
  const daysLeft = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const paidPlans = plans?.filter((p) => p.price > 0 && p.is_active) ?? [];
  const freePlan = plans?.find((p) => p.price === 0);

  const limitEmployees = getLimit("max_employees");
  const limitProducts = getLimit("max_products");
  const limitRepairs = getLimit("max_monthly_repairs");

  const usageBars = [
    ...(limitEmployees > 0 ? [{ label: "Employés", current: members.length, max: limitEmployees, icon: Users }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)/15%), hsl(var(--primary)/5%))",
          border: "1px solid hsl(var(--primary)/20%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, hsl(var(--primary)/15%), transparent 70%)" }} />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--primary)/20%)", border: "1px solid hsl(var(--primary)/30%)" }}>
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1">
            {subLoading ? (
              <Skeleton className="h-6 w-32 mb-2" />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {currentPlan?.name ?? freePlan?.name ?? "Plan Gratuit"}
                  </h3>
                  {subscription?.status === "active" && (
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border">
                      Actif
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPlan?.price
                    ? `${currentPlan.price} ${currentPlan.currency}${currentPlan.period ?? ""}`
                    : "Gratuit"}
                </p>
              </>
            )}
          </div>

          {daysLeft !== null && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Renouvellement
              </div>
              <p className="font-semibold text-foreground text-sm">
                {subscription?.expires_at
                  ? format(new Date(subscription.expires_at), "dd MMM yyyy", { locale: fr })
                  : "—"}
              </p>
              <p className={`text-xs mt-0.5 ${daysLeft < 7 ? "text-amber-500" : "text-muted-foreground"}`}>
                {daysLeft === 0 ? "Expire aujourd'hui" : `Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        {currentPlan && getPlanDisplayFeatures(currentPlan as any).length > 0 && (
          <div className="relative mt-4 pt-4 border-t border-border/30 flex flex-wrap gap-x-6 gap-y-1.5">
            {getPlanDisplayFeatures(currentPlan as any).map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary" /> {f}
              </span>
            ))}
          </div>
        )}

        {/* Usage Limits */}
        {usageBars.length > 0 && (
          <div className="relative mt-4 pt-4 border-t border-border/30 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Utilisation</p>
            {usageBars.map(({ label, current, max, icon: Icon }) => {
              const pct = Math.min(100, Math.round((current / max) * 100));
              const isNear = pct >= 80;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3 w-3" /> {label}
                    </span>
                    <span className={isNear ? "text-warning font-medium" : "text-muted-foreground"}>
                      {current}/{max}
                    </span>
                  </div>
                  <Progress value={pct} className={`h-1.5 ${isNear ? "[&>div]:bg-warning" : ""}`} />
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Pricing Grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Changer de plan</h3>
        {plansLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans?.filter((p) => p.is_active).map((plan) => {
              const isCurrent = plan.id === subscription?.plan_id || (!subscription && plan.price === 0);
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-xl p-4"
                  style={{
                    background: plan.highlight
                      ? "linear-gradient(135deg, hsl(var(--primary)/12%), hsl(var(--primary)/5%))"
                      : "hsl(var(--muted)/40%)",
                    border: plan.highlight
                      ? "1px solid hsl(var(--primary)/30%)"
                      : "1px solid hsl(var(--border)/50%)",
                  }}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-2 right-3 text-[10px] px-2 py-0.5"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                      <Star className="h-3 w-3 mr-1" /> Populaire
                    </Badge>
                  )}
                  <h4 className="font-semibold text-foreground text-sm mb-0.5">{plan.name}</h4>
                  <div className="mb-3">
                    <span className="text-xl font-bold text-foreground">
                      {plan.price === 0 ? "Gratuit" : plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-xs ml-1">{plan.currency}{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-1 mb-4">
                    {getPlanDisplayFeatures(plan).slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button size="sm" variant="outline" disabled className="w-full text-xs">
                      Plan actuel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full text-xs gap-1"
                      style={plan.highlight ? {
                        background: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                      } : {}}
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => navigate(`/checkout?plan=${plan.id}`)}
                    >
                      {plan.price === 0 ? "Démarrer gratuitement" : "Mettre à niveau"} <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing History */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Historique des paiements</h3>
        {ordersLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !orders?.length ? (
          <div className="rounded-xl border border-border/50 p-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun paiement pour le moment</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Montant</TableHead>
                  <TableHead className="text-xs">Méthode</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Preuve</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => {
                  const s = statusConfig[order.status] ?? statusConfig.pending;
                  const Icon = s.icon;
                  return (
                    <TableRow key={order.id} className="border-border/30">
                      <TableCell className="text-sm font-medium">{(order.plan as any)?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm font-mono-numbers">
                        {order.amount} {order.currency}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{order.gateway_key}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${s.color} border`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.proof_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from("payment-proofs")
                                .createSignedUrl(order.proof_url, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
