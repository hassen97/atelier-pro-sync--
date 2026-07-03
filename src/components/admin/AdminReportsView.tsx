import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Download, FileSpreadsheet, Filter, TrendingUp, TrendingDown,
  Store, Wrench, DollarSign, Search, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAdminReports, type ReportRange, type TopShopRow } from "@/hooks/useAdminReports";
import { exportReportsToExcel, exportReportsToPdf } from "@/lib/adminReportExport";

/* ─── Helpers ─── */
const fmtNumber = (n: number) => Math.round(n).toLocaleString("fr-FR");
const fmtMoneyShort = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K TND` : `${fmtNumber(n)} TND`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0D1A2D] p-3 text-xs shadow-xl">
      <p className="mb-2 text-slate-500">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold font-mono">
          {p.name}: {typeof p.value === "number" && /rev|revenu/i.test(p.name)
            ? `${fmtNumber(p.value)} TND`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({
  label, value, sub, trend, accent = "#00D4FF", Icon: IconComp,
}: {
  label: string; value: string; sub?: string; trend?: string;
  accent?: string; Icon: React.ElementType;
}) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04]">
    <div className="mb-4 flex items-start justify-between">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
        <IconComp size={15} style={{ color: accent }} />
      </div>
    </div>
    <div className="mb-2 font-mono text-2xl font-bold tracking-tighter text-white">{value}</div>
    <div className="flex items-center gap-2">
      {trend && trend !== "—" && (
        <span className={cn("text-xs font-semibold", trend.startsWith("+") ? "text-emerald-400" : "text-red-400")}>
          {trend.startsWith("+")
            ? <TrendingUp size={11} className="mr-0.5 inline" />
            : <TrendingDown size={11} className="mr-0.5 inline" />}
          {trend}
        </span>
      )}
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  </div>
);

const statusBadge = (status: TopShopRow["status"]) => {
  const map = {
    active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const label = { active: "Actif", pending: "En attente", suspended: "Suspendu" };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", map[status])}>
      {label[status]}
    </span>
  );
};

/* ─── Component ─── */
export const AdminReportsView = () => {
  const [range, setRange] = useState<ReportRange>("6m");
  const [shopFilter, setShopFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const { data, isLoading, isError, error } = useAdminReports(range);

  const filteredShops = useMemo(() => {
    if (!data) return [];
    return data.topShops.filter(s => {
      if (shopFilter !== "all" && s.user_id !== shopFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, shopFilter, search]);

  const totalRevenueShown = useMemo(
    () => filteredShops.reduce((s, sh) => s + sh.revenue, 0) || 1,
    [filteredShops],
  );

  const handleExport = async (kind: "xlsx" | "pdf") => {
    if (!data) return;
    setExporting(kind);
    try {
      // Apply same filters used in the table for the shops sheet
      const dataset = { ...data, topShops: filteredShops };
      if (kind === "xlsx") exportReportsToExcel(dataset, range);
      else await exportReportsToPdf(dataset, range);
      toast.success(`Rapport ${kind.toUpperCase()} téléchargé`);
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'export");
    } finally {
      setExporting(null);
    }
  };

  /* ── Loading / Error ── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
        <p className="text-xs uppercase tracking-widest">Chargement des rapports…</p>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-red-400">
        Erreur : {(error as Error)?.message || "Impossible de charger les rapports"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Rapports & Export</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Analysez les performances de la plateforme et exportez vos données
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exporting !== null}
            onClick={() => handleExport("xlsx")}
            className="border-white/10 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 gap-1.5"
          >
            {exporting === "xlsx" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet size={13} />}
            Export Excel
          </Button>
          <Button
            size="sm"
            disabled={exporting !== null}
            onClick={() => handleExport("pdf")}
            className="bg-gradient-to-r from-[#00D4FF] to-[#0066FF] text-white hover:opacity-90 hover:shadow-[0_4px_12px_rgba(0,212,255,0.3)] gap-1.5 transition-all"
          >
            {exporting === "pdf" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download size={13} />}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter size={12} /> Filtres
        </div>

        <div className="flex gap-1">
          {(["1m", "3m", "6m", "1y"] as ReportRange[]).map(v => (
            <button
              key={v}
              onClick={() => setRange(v)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                range === v
                  ? "bg-[#00D4FF]/15 text-[#00D4FF]"
                  : "bg-white/5 text-slate-500 hover:text-slate-300",
              )}
            >
              {v === "1m" ? "1 mois" : v === "3m" ? "3 mois" : v === "6m" ? "6 mois" : "1 an"}
            </button>
          ))}
        </div>

        <div className="hidden sm:block h-5 w-px bg-white/[0.07]" />

        <Select value={shopFilter} onValueChange={setShopFilter}>
          <SelectTrigger className="h-8 w-56 border-white/10 bg-white/5 text-xs text-slate-400">
            <SelectValue placeholder="Toutes les boutiques" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0D1526] text-slate-300">
            <SelectItem value="all">Toutes les boutiques</SelectItem>
            {data.topShops.map(s => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Revenu total"
          value={fmtMoneyShort(data.kpis.totalRevenue)}
          trend={data.kpis.revenueTrend}
          sub={data.rangeLabel}
          accent="#00D4FF"
          Icon={DollarSign}
        />
        <KpiCard
          label="Total réparations"
          value={fmtNumber(data.kpis.totalRepairs)}
          trend={data.kpis.repairsTrend}
          sub="toutes boutiques"
          accent="#6366F1"
          Icon={Wrench}
        />
        <KpiCard
          label="Ticket moyen"
          value={`${data.kpis.avgTicket.toFixed(1)} TND`}
          sub="par réparation"
          accent="#10B981"
          Icon={TrendingUp}
        />
        <KpiCard
          label="Boutiques actives"
          value={fmtNumber(data.kpis.activeShops)}
          sub={data.rangeLabel}
          accent="#F59E0B"
          Icon={Store}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue area chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Évolution du revenu</h3>
              <p className="mt-0.5 text-xs text-slate-500">Mensuel · Toutes boutiques</p>
            </div>
            <div className="flex gap-4 text-xs">
              {[["#00D4FF", "Revenu"], ["#6366F1", "Réparations"]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
          </div>
          {data.revenueSeries.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-600">
              Pas de données sur la période
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.revenueSeries}>
                <defs>
                  {[["revGrad", "#00D4FF"], ["repGrad", "#6366F1"]].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenu" stroke="#00D4FF" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
                <Area type="monotone" dataKey="repairs" name="Réparations" stroke="#6366F1" strokeWidth={2.5} fill="url(#repGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Device pie */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
          <h3 className="text-sm font-semibold text-white">Par appareil</h3>
          <p className="mb-4 mt-0.5 text-xs text-slate-500">Distribution des réparations</p>
          {data.deviceMix.length === 0 ? (
            <div className="h-[140px] flex items-center justify-center text-xs text-slate-600">
              Aucune réparation
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={data.deviceMix} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {data.deviceMix.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-col gap-2.5">
                {data.deviceMix.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
                      </div>
                      <span className="w-8 text-right font-mono text-xs font-semibold text-white">{d.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Repair types bar chart */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-white">Volume par type de réparation</h3>
          <p className="mt-0.5 text-xs text-slate-500">Nombre de réparations par catégorie</p>
        </div>
        {data.repairTypes.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-slate-600">
            Pas de données
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, data.repairTypes.length * 28)}>
            <BarChart data={data.repairTypes} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Réparations" radius={[0, 5, 5, 0]}>
                {data.repairTypes.map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 + i * 20}, 80%, ${55 + i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Shop performance table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.05] px-5 py-4">
          <div className="flex-1 min-w-[180px]">
            <h3 className="text-sm font-semibold text-white">Performance par boutique</h3>
            <p className="mt-0.5 text-xs text-slate-500">Classement détaillé · {filteredShops.length} boutique{filteredShops.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-44 border-white/10 bg-white/5 pl-8 text-xs text-slate-300 placeholder:text-slate-600 focus-visible:ring-[#00D4FF]/30"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              onClick={() => handleExport("xlsx")}
              className="h-8 border-white/10 bg-white/5 text-xs text-slate-400 hover:text-white gap-1.5"
            >
              <Download size={12} /> Exporter
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.015]">
                {["#", "Boutique", "Réparations", "Revenu", "Part du CA", "Statut"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-600">
                    Aucune boutique ne correspond aux filtres
                  </td>
                </tr>
              ) : filteredShops.map(s => {
                const share = ((s.revenue / totalRevenueShown) * 100).toFixed(1);
                return (
                  <tr key={s.user_id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.025] last:border-0">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">#{s.rank}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-white">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.city}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-slate-300">{s.repairs}</td>
                    <td className="px-5 py-3.5 font-mono text-sm text-slate-300">{fmtNumber(s.revenue)} TND</td>
                    <td className="px-5 py-3.5">
                      <div className="mb-1 font-mono text-xs text-slate-500">{share}%</div>
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#6366F1] transition-all duration-700"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(s.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsView;
