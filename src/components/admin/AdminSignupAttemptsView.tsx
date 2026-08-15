import { useMemo, useState } from "react";
import { Search, RefreshCw, Shield, Trash2, Fingerprint, Flame, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSignupAttempts, usePurgeSignupAttempts, groupAttemptsByIp } from "@/hooks/useAdminSecurity";

export function AdminSignupAttemptsView() {
  const { data: attempts = [], isLoading, refetch, isFetching } = useSignupAttempts();
  const purge = usePurgeSignupAttempts();
  const [ipFilter, setIpFilter] = useState("");
  const [minCount, setMinCount] = useState(0);

  const grouped = useMemo(() => groupAttemptsByIp(attempts), [attempts]);
  const ipCounts = useMemo(() => new Map(grouped.map((g) => [g.ip, g.count])), [grouped]);

  const visible = grouped.filter(
    (g) => g.count >= minCount && (!ipFilter || g.ip.includes(ipFilter.trim()))
  );

  // Spark bars for "last 7 days" per IP (coarse histogram built client-side).
  const histogram = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => 0);
    const now = Date.now();
    for (const a of attempts) {
      const ageDays = (now - new Date(a.created_at).getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays < 7 && ageDays >= 0) buckets[Math.min(6, Math.floor(ageDays))] += 1;
    }
    return buckets;
  }, [attempts]);
  const histMax = Math.max(...histogram, 1);

  const severity = (count: number) =>
    count >= 10 ? { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30", label: "critique" }
    : count >= 5  ? { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", label: "élevée" }
    : count >= 3  ? { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30", label: "moyenne" }
    :               { bg: "bg-white/5", text: "text-slate-400", border: "border-white/10", label: "faible" };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Tentatives & IPs</h2>
            <p className="text-xs text-slate-500">Forage des tentatives d'inscription par adresse IP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            onClick={() => purge.mutate(24)}
            disabled={purge.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Nettoyer +24h
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            onClick={() => refetch()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* 7-day histogram */}
      <div className="rounded-xl border border-white/5 bg-[#101827] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-amber-400" />
          <h3 className="font-semibold text-white text-sm">Tentatives — 7 derniers jours</h3>
          <span className="ml-auto text-[10px] text-slate-600">aujourd'hui → il y a 7j</span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {histogram.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-slate-500 tabular-nums">{v}</span>
              <div
                className={cn(
                  "w-full rounded-t-md transition-all",
                  v >= 20 ? "bg-gradient-to-t from-red-500/40 to-red-400" : v >= 10 ? "bg-gradient-to-t from-amber-500/40 to-amber-400" : "bg-[#00D4FF]/20"
                )}
                style={{ height: `${Math.max(4, (v / histMax) * 64)}px` }}
              />
              <span className="text-[9px] text-slate-600">{["A", "-1", "-2", "-3", "-4", "-5", "-6"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Filtrer par adresse IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <Button
          size="sm"
          variant={minCount === 0 ? "outline" : "default"}
          className={minCount === 0 ? "border-white/10 text-slate-300 hover:bg-white/5" : "bg-amber-500/15 text-amber-300 border border-amber-500/25"}
          onClick={() => setMinCount(minCount === 0 ? 3 : 0)}
        >
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          IPs suspectes (≥3)
        </Button>
        {ipFilter && (
          <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setIpFilter("")}>
            Effacer
          </Button>
        )}
      </div>

      {/* Grouped table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-3 text-slate-400 font-medium">Adresse IP</th>
                <th className="text-right p-3 text-slate-400 font-medium">Tentatives</th>
                <th className="text-left p-3 text-slate-400 font-medium">Première</th>
                <th className="text-left p-3 text-slate-400 font-medium">Dernière</th>
                <th className="text-left p-3 text-slate-400 font-medium">Niveau</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Chargement...</td></tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <Fingerprint className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Aucune tentative trouvée</p>
                    <p className="text-xs text-slate-600 mt-1">Les données remontent à 30 jours maximum.</p>
                  </td>
                </tr>
              ) : (
                visible.map((g) => {
                  const sev = severity(g.count);
                  return (
                    <tr key={g.ip} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <button
                          className="font-mono text-white text-xs hover:text-[#00D4FF] transition-colors"
                          onClick={() => setIpFilter(g.ip)}
                        >
                          {g.ip}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", sev.bg, sev.text, sev.border)}>
                          {g.count}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(g.firstSeen).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(g.lastSeen).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3">
                        <span className={cn("text-[11px]", sev.text)}>{sev.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {visible.length} IP{visible.length > 1 ? "s" : ""} affichée{visible.length > 1 ? "s" : ""} · {attempts.length} tentatives sur 30 jours
        {ipCounts.size > 0 ? ` · ${ipCounts.size} IP uniques` : ""}. Cliquez sur une IP pour la filtrer.
      </p>
    </div>
  );
}