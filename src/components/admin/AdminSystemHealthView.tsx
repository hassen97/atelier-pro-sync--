import { AdminStatCard } from "./AdminStatCard";
import {
  useDbTableSizes,
  useActiveConnections,
  useSlowQueries,
  useMaintenanceMode,
  useSetMaintenanceMode,
} from "@/hooks/useSystemHealth";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  Database,
  HeartPulse,
  AlertTriangle,
  Loader2,
  Timer,
  ShieldAlert,
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
                  <th className="py-2 pl-4 font-medium text-right">Bloat</th>
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
                          "py-2 pl-4 text-right font-mono-numbers font-semibold",
                          bloated ? "text-red-400" : "text-slate-400"
                        )}
                      >
                        {Number(t.dead_ratio)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              Active un indicateur de maintenance à l'échelle de la plateforme.
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
