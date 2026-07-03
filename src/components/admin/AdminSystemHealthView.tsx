import { useState, useEffect } from "react";
import { AdminStatCard } from "./AdminStatCard";
import {
  useDbTableSizes,
  useActiveConnections,
  useSlowQueries,
  useMaintenanceMode,
  useSetMaintenanceMode,
  useHealthAlertSettings,
  useSaveHealthAlertSettings,
  useTestHealthAlert,
  useRunMaintenance,
  type HealthAlertSettings,
} from "@/hooks/useSystemHealth";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  Database,
  HeartPulse,
  AlertTriangle,
  Loader2,
  Timer,
  ShieldAlert,
  BellRing,
  Send,
  Wrench,
  Save,
  Webhook,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const BLOAT_THRESHOLD = 20; // %

function shortTableName(full: string) {
  // "public.products" -> "products" (keep non-public schema prefix for clarity)
  const [schema, ...rest] = full.split(".");
  const name = rest.join(".");
  return schema === "public" ? name : full;
}

export function AdminSystemHealthView() {
  const sizes = useDbTableSizes();
  const conns = useActiveConnections();
  const slow = useSlowQueries();
  const maintenance = useMaintenanceMode();
  const setMaintenance = useSetMaintenanceMode();

  const alertSettings = useHealthAlertSettings();
  const saveAlerts = useSaveHealthAlertSettings();
  const testAlert = useTestHealthAlert();
  const runMaintenance = useRunMaintenance();

  // Local editable copy of the alert settings form
  const [form, setForm] = useState<HealthAlertSettings | null>(null);
  useEffect(() => {
    if (alertSettings.data) setForm(alertSettings.data);
  }, [alertSettings.data]);

  // Per-table maintenance confirmation
  const [pending, setPending] = useState<
    { table: string; mode: "vacuum_analyze" | "analyze" } | null
  >(null);

  const tables = sizes.data ?? [];
  const totalSizeMb = tables.reduce((sum, t) => sum + Number(t.total_size_mb || 0), 0);
  const slowCount = slow.data?.length ?? 0;
  const totalConns = conns.data?.total ?? 0;
  const bloatedCount = tables.filter((t) => Number(t.dead_ratio) > BLOAT_THRESHOLD).length;

  // Derived system status
  let status: { label: string; color: "green" | "amber" | "red"; sub: string } = {
    label: "Sain",
    color: "green",
    sub: "Tous les indicateurs sont normaux",
  };
  if (slowCount > 0 || totalConns > 80 || totalSizeMb > 5000) {
    status = {
      label: "Critique",
      color: "red",
      sub: slowCount > 0 ? `${slowCount} requête(s) lente(s)` : "Charge élevée détectée",
    };
  } else if (bloatedCount > 0 || totalConns > 50 || totalSizeMb > 2000) {
    status = {
      label: "Attention",
      color: "amber",
      sub: bloatedCount > 0 ? `${bloatedCount} table(s) avec bloat élevé` : "Surveillance recommandée",
    };
  }

  const top5 = [...tables]
    .sort((a, b) => Number(b.total_size_mb) - Number(a.total_size_mb))
    .slice(0, 5)
    .map((t) => ({
      name: shortTableName(t.table_name),
      mb: Number(t.total_size_mb),
    }));

  const formatSize = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#00D4FF]/10">
          <HeartPulse className="h-5 w-5 admin-neon-blue" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Santé Système</h2>
          <p className="text-xs text-slate-500">
            Surveillance base de données · actualisation auto 30s
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {conns.isLoading ? (
          <CardSkeleton />
        ) : conns.isError ? (
          <CardError label="Connexions actives" />
        ) : (
          <AdminStatCard
            title="Connexions actives"
            value={totalConns}
            icon={Activity}
            color="blue"
            subtitle={`${conns.data?.active ?? 0} actives · ${conns.data?.idle ?? 0} inactives`}
          />
        )}

        {sizes.isLoading ? (
          <CardSkeleton />
        ) : sizes.isError ? (
          <CardError label="Taille totale DB" />
        ) : (
          <AdminStatCard
            title="Taille totale DB"
            value={formatSize(totalSizeMb)}
            icon={Database}
            color="green"
            subtitle={`${tables.length} table(s)`}
          />
        )}

        <AdminStatCard
          title="État du système"
          value={status.label}
          icon={status.color === "red" ? ShieldAlert : HeartPulse}
          color={status.color}
          subtitle={status.sub}
        />
      </div>

      {/* Storage radar */}
      <div className="admin-glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Top 5 tables — stockage (MB)</h3>
        </div>
        {sizes.isLoading ? (
          <div className="h-[260px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : sizes.isError ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-red-400">
            Métrique indisponible
          </div>
        ) : top5.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top5} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                width={110}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#0F172A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fff",
                }}
                formatter={(v: number) => [`${v} MB`, "Taille"]}
              />
              <Bar dataKey="mb" radius={[0, 4, 4, 0]}>
                {top5.map((_, i) => (
                  <Cell key={i} fill="#00D4FF" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Slow queries */}
      <div className="admin-glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Requêtes lentes (&gt; 1s)</h3>
        </div>
        {slow.isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : slow.isError ? (
          <p className="text-sm text-red-400 py-4">Métrique indisponible</p>
        ) : slowCount === 0 ? (
          <p className="text-sm text-emerald-400 py-4">
            Aucune requête lente en cours. ✓
          </p>
        ) : (
          <div className="space-y-2">
            {slow.data!.map((q) => (
              <div
                key={q.pid}
                className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-amber-400 font-mono">PID {q.pid}</span>
                  <span className="text-amber-400 font-semibold">
                    {q.duration_seconds}s
                  </span>
                </div>
                <code className="text-[11px] text-slate-400 break-all line-clamp-3">
                  {q.query}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bloat table */}
      <div className="admin-glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">
            Tables &amp; bloat ({">"} {BLOAT_THRESHOLD}% surligné)
          </h3>
        </div>
        {sizes.isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : sizes.isError ? (
          <p className="text-sm text-red-400 py-4">Métrique indisponible</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Aucune donnée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                  <th className="py-2 pr-4 font-medium">Table</th>
                  <th className="py-2 px-4 font-medium text-right">Taille</th>
                  <th className="py-2 px-4 font-medium text-right">Lignes</th>
                  <th className="py-2 px-4 font-medium text-right">Mortes</th>
                  <th className="py-2 px-4 font-medium text-right">Bloat</th>
                  <th className="py-2 pl-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => {
                  const bloated = Number(t.dead_ratio) > BLOAT_THRESHOLD;
                  return (
                    <tr
                      key={t.table_name}
                      className={cn(
                        "border-b border-white/[0.04] transition-colors",
                        bloated ? "bg-red-500/[0.07]" : "hover:bg-white/[0.02]"
                      )}
                    >
                      <td className="py-2 pr-4 text-slate-300 font-mono text-xs">
                        {shortTableName(t.table_name)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400 font-mono-numbers">
                        {formatSize(Number(t.total_size_mb))}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400 font-mono-numbers">
                        {Number(t.live_tuples).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400 font-mono-numbers">
                        {Number(t.dead_tuples).toLocaleString()}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-4 text-right font-mono-numbers font-semibold",
                          bloated ? "text-red-400" : "text-slate-400"
                        )}
                      >
                        {Number(t.dead_ratio)}%
                      </td>
                      <td className="py-2 pl-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 gap-1.5 text-xs",
                                bloated
                                  ? "text-red-300 hover:text-red-200 hover:bg-red-500/10"
                                  : "text-slate-400 hover:text-slate-200"
                              )}
                              disabled={
                                runMaintenance.isPending &&
                                pending?.table === t.table_name
                              }
                            >
                              {runMaintenance.isPending &&
                              runMaintenance.variables?.table === t.table_name ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Wrench className="h-3.5 w-3.5" />
                              )}
                              Maintenance
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                setPending({
                                  table: t.table_name,
                                  mode: "vacuum_analyze",
                                })
                              }
                            >
                              VACUUM ANALYZE
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setPending({
                                  table: t.table_name,
                                  mode: "analyze",
                                })
                              }
                            >
                              ANALYZE seulement
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Automatic alerts */}
      <div className="admin-glass-card rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">
              Alertes automatiques
            </h3>
          </div>
          <Switch
            checked={form?.enabled ?? false}
            disabled={alertSettings.isLoading || !form}
            onCheckedChange={(v) =>
              setForm((f) => (f ? { ...f, enabled: v } : f))
            }
          />
        </div>

        {!form ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Envoie un e-mail et/ou un webhook lorsqu'une requête lente ou un
              bloat de table dépasse les seuils. Vérification auto toutes les 5
              min.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">
                  E-mail destinataire
                </Label>
                <Input
                  type="email"
                  placeholder="admin@exemple.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="h-9 bg-slate-900/50 border-white/10 text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 flex items-center gap-1">
                  <Webhook className="h-3 w-3" /> URL Webhook
                </Label>
                <Input
                  type="url"
                  placeholder="https://hooks.slack.com/..."
                  value={form.webhookUrl}
                  onChange={(e) =>
                    setForm({ ...form, webhookUrl: e.target.value })
                  }
                  className="h-9 bg-slate-900/50 border-white/10 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">
                  Requête lente (s)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.slowThresholdS}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slowThresholdS: Number(e.target.value),
                    })
                  }
                  className="h-9 bg-slate-900/50 border-white/10 text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Bloat (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.bloatRatio}
                  onChange={(e) =>
                    setForm({ ...form, bloatRatio: Number(e.target.value) })
                  }
                  className="h-9 bg-slate-900/50 border-white/10 text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">
                  Taille min. (MB)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minSizeMb}
                  onChange={(e) =>
                    setForm({ ...form, minSizeMb: Number(e.target.value) })
                  }
                  className="h-9 bg-slate-900/50 border-white/10 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => form && saveAlerts.mutate(form)}
                disabled={saveAlerts.isPending}
                className="gap-1.5"
              >
                {saveAlerts.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testAlert.mutate()}
                disabled={testAlert.isPending}
                className="gap-1.5"
              >
                {testAlert.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Tester l'alerte
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Zone de danger</h3>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Mode Maintenance Global</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Une fois activé, seuls les Super Admins peuvent utiliser
              l'application. Les autres voient une page de maintenance.
            </p>
          </div>
          {maintenance.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          ) : (
            <Switch
              checked={maintenance.data ?? false}
              disabled={setMaintenance.isPending}
              onCheckedChange={(v) => setMaintenance.mutate(v)}
            />
          )}
        </div>
      </div>

      {/* Maintenance confirmation */}
      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.mode === "vacuum_analyze"
                ? "Lancer VACUUM ANALYZE ?"
                : "Lancer ANALYZE ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.mode === "vacuum_analyze"
                ? `Récupère l'espace des lignes mortes et rafraîchit les statistiques de « ${pending?.table} ». L'opération peut générer de la charge sur la table.`
                : `Rafraîchit uniquement les statistiques du planificateur pour « ${pending?.table} ». Opération légère.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) runMaintenance.mutate(pending);
                setPending(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="admin-glass-card rounded-xl p-5 h-[116px] flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
    </div>
  );
}

function CardError({ label }: { label: string }) {
  return (
    <div className="admin-glass-card rounded-xl p-5 h-[116px] flex flex-col justify-center">
      <p className="text-sm text-red-400">{label}</p>
      <p className="text-xs text-slate-500 mt-1">Métrique indisponible</p>
    </div>
  );
}
