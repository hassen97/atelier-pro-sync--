import { useState } from "react";
import { Rocket, TrendingUp, Clock, ShieldAlert, Check, Loader2, Zap } from "lucide-react";
import { useAdminReferrals, useApproveReferralReward, type AdminReferralRow } from "@/hooks/useReferrals";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function fmtName(p?: { username: string | null; full_name: string | null; email: string | null } | null) {
  if (!p) return "—";
  return p.full_name || p.username || p.email || "—";
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  joined: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20",
  rewarded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const statusLabel: Record<string, string> = {
  pending: "En attente",
  joined: "Inscrit",
  rewarded: "Récompensé",
};

export function AdminGrowthEngineView() {
  const { data, isLoading } = useAdminReferrals();
  const approve = useApproveReferralReward();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleApprove = async (row: AdminReferralRow) => {
    if (row.isFraudFlagged) {
      const ok = window.confirm(
        "⚠️ FRAUDE POSSIBLE : le parrain et le filleul partagent la même empreinte d'appareil. Approuver quand même la récompense de 30 jours ?",
      );
      if (!ok) return;
    }
    setPendingId(row.id);
    try {
      await approve.mutateAsync(row.id);
      toast.success("Récompense accordée — abonnement prolongé de 30 jours.");
    } catch (e) {
      toast.error((e as Error)?.message || "Échec de l'approbation.");
    } finally {
      setPendingId(null);
    }
  };

  const kpis = [
    { label: "Total Invitations", value: data?.totalInvites ?? 0, icon: Rocket, color: "#00D4FF", glow: "rgba(0,212,255,0.25)" },
    { label: "Taux de Conversion", value: `${(data?.conversionRate ?? 0).toFixed(1)}%`, icon: TrendingUp, color: "#34D399", glow: "rgba(52,211,153,0.25)" },
    { label: "Récompenses en attente", value: data?.pendingRewards ?? 0, icon: Clock, color: "#FBBF24", glow: "rgba(251,191,36,0.25)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#6366F1] flex items-center justify-center shadow-[0_0_18px_rgba(0,212,255,0.35)]">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Growth Engine</h2>
          <p className="text-xs text-slate-500">Terminal de croissance · Parrainage B2B</p>
        </div>
      </div>

      {/* Telemetry row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="relative rounded-2xl border border-white/[0.06] bg-[#0B1120]/80 p-5 overflow-hidden"
              style={{ boxShadow: `0 0 28px ${k.glow}` }}
            >
              <div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-30"
                style={{ background: k.color }}
              />
              <div className="relative">
                <div
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3"
                  style={{ background: `${k.color}1a`, color: k.color }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-3xl font-bold font-mono-numbers" style={{ color: k.color }}>
                  {isLoading ? "—" : k.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Ledger */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0B1120]/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">Registre des parrainages</h3>
          <span className="text-[11px] text-slate-500">{data?.rows.length ?? 0} entrées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                <th className="px-5 py-3 font-medium">Parrain</th>
                <th className="px-5 py-3 font-medium">Filleul</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Empreinte</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </td>
                </tr>
              ) : !data?.rows.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    Aucun parrainage enregistré.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-white/[0.04] transition-colors",
                      row.isFraudFlagged ? "bg-red-500/[0.07] hover:bg-red-500/[0.12]" : "hover:bg-white/[0.02]",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {row.isFraudFlagged && (
                          <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span className="text-slate-200 font-medium">{fmtName(row.referrer_profile)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {row.referred_email || fmtName(row.referred_profile)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-[11px] font-medium rounded-full px-2.5 py-1 border", statusStyles[row.status])}>
                        {statusLabel[row.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(row.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <code className={cn("text-[10px] font-mono", row.isFraudFlagged ? "text-red-400" : "text-slate-600")}>
                        {row.ip_fingerprint ? `${row.ip_fingerprint.slice(0, 10)}…` : "—"}
                      </code>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {row.status === "joined" ? (
                        <button
                          onClick={() => handleApprove(row)}
                          disabled={pendingId === row.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50",
                            row.isFraudFlagged
                              ? "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25",
                          )}
                        >
                          {pendingId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Approuver (30j)
                        </button>
                      ) : row.status === "rewarded" ? (
                        <span className="text-[11px] text-emerald-500/70">✓ Accordé</span>
                      ) : (
                        <span className="text-[11px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
