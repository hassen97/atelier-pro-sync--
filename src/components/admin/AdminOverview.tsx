import {
  Store, Users, Wrench, DollarSign, Activity, Wifi, ClipboardList,
} from "lucide-react";
import { useAdminData, useAdminRevenue } from "@/hooks/useAdmin";
import { useAdminFeedback } from "@/hooks/useFeedback";
import { useWaitlistCount } from "@/hooks/useWaitlist";
import { AdminActivityFeed } from "./AdminActivityFeed";

/* ── Sparkline ─────────────────────────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ── Revenue Bar Chart ──────────────────────────────────────────────── */
function RevenueBar({ sales, repairs }: { sales: number; repairs: number }) {
  const total = sales + repairs || 1;
  const salesPct = (sales / total) * 100;
  const repairsPct = (repairs / total) * 100;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-slate-400">Ventes</span>
        </div>
        <span className="text-slate-300 tabular-nums font-mono">{sales.toFixed(0)} DT</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
        <div
          style={{ width: `${salesPct}%` }}
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
        />
        <div
          style={{ width: `${repairsPct}%` }}
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-slate-400">Réparations</span>
        </div>
        <span className="text-slate-300 tabular-nums font-mono">{repairs.toFixed(0)} DT</span>
      </div>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: "cyan" | "green" | "amber" | "purple";
  subtitle?: string;
  sparkline?: number[];
  pulse?: boolean;
}

const colorMap = {
  cyan: {
    border: "border-[#00D4FF]/15",
    iconBg: "bg-[#00D4FF]/10",
    iconColor: "text-[#00D4FF]",
    spark: "#00D4FF",
    gradientText: "from-[#00D4FF] to-[#0099CC]",
  },
  green: {
    border: "border-emerald-500/15",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    spark: "#10B981",
    gradientText: "from-emerald-400 to-emerald-300",
  },
  amber: {
    border: "border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    spark: "#F59E0B",
    gradientText: "from-amber-400 to-yellow-300",
  },
  purple: {
    border: "border-violet-500/15",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    spark: "#8B5CF6",
    gradientText: "from-violet-400 to-purple-300",
  },
};

function StatCard({ title, value, icon: Icon, color, subtitle, sparkline, pulse }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`relative rounded-xl p-4 border ${c.border} bg-[#101827] overflow-hidden`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${c.iconBg}`}>
          <Icon className={`h-4 w-4 ${c.iconColor}`} />
        </div>
        {pulse && (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 mt-1" />
        )}
        {sparkline && <Sparkline data={sparkline} color={c.spark} />}
      </div>

      <p className={`text-xl font-bold tabular-nums bg-gradient-to-r ${c.gradientText} bg-clip-text text-transparent`}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ── Main Overview ──────────────────────────────────────────────────── */
const repairSparkline = [12, 18, 14, 22, 19, 26, 24];
const mrrSparkline = [0, 0, 0, 0, 0, 0, 0];

export function AdminOverview() {
  const { data } = useAdminData();
  const { data: revenue } = useAdminRevenue();
  const { data: feedbackData } = useAdminFeedback();
  const { data: waitlistData } = useWaitlistCount();

  const newFeedbackCount = feedbackData?.filter(f => f.status === "new").length || 0;
  const totalRevenue = revenue ? revenue.total_revenue : 0;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Boutiques" value={data?.stats.total_owners || 0} icon={Store} color="cyan" />
        <StatCard title="En Ligne" value={data?.stats.active_now_count || 0} icon={Wifi} color="green" pulse />
        <StatCard title="Employés" value={data?.stats.total_employees || 0} icon={Users} color="purple" />
        <StatCard title="Réparations" value={data?.stats.total_repairs || 0} icon={Wrench} color="amber" sparkline={repairSparkline} />
        <StatCard
          title="Waitlist"
          value={waitlistData?.total || 0}
          icon={ClipboardList}
          color="cyan"
          subtitle={waitlistData ? `+${waitlistData.recent_7d} cette semaine` : undefined}
        />
        <StatCard
          title="MRR"
          value={totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(1)}K` : "— DT"}
          icon={DollarSign}
          color="green"
          sparkline={mrrSparkline}
        />
      </div>

      {/* Activity + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Timeline Activity */}
        <div className="lg:col-span-2 rounded-xl border border-white/5 p-5 bg-[#101827]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-[#00D4FF]" />
            <h3 className="font-semibold text-white text-sm">Activité récente</h3>
            <span className="ml-auto text-[10px] text-slate-600">Auto-refresh</span>
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-[#00D4FF]" />
          </div>
          <AdminActivityFeed />
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Feedback */}
          <div className="rounded-xl border border-white/5 p-4 bg-[#101827]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquareIcon className="h-3.5 w-3.5 text-emerald-400" />
              <h3 className="font-semibold text-white text-xs">Feedback</h3>
            </div>
            {newFeedbackCount > 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <span className="text-2xl font-bold text-amber-400 tabular-nums">{newFeedbackCount}</span>
                <div>
                  <p className="text-xs text-amber-300">nouveau{newFeedbackCount > 1 ? "x" : ""} retour</p>
                  <p className="text-[10px] text-slate-600">En attente de traitement</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">Aucun nouveau feedback</p>
            )}
          </div>

          {/* Revenue */}
          <div className="rounded-xl border border-white/5 p-4 bg-[#101827]">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-[#00D4FF]" />
              <h3 className="font-semibold text-white text-xs">Chiffre d'affaires</h3>
            </div>

            {revenue ? (
              <div className="mt-3 space-y-3">
                <div className="text-center py-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Total Plateforme</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-[#00D4FF] to-[#0066FF] bg-clip-text text-transparent tabular-nums">
                    {(revenue.total_revenue / 1000).toFixed(1)}K <span className="text-sm">DT</span>
                  </p>
                </div>
                <div className="h-px bg-white/5" />
                <RevenueBar sales={revenue.sales_revenue} repairs={revenue.repair_revenue} />
              </div>
            ) : (
              <div className="h-16 rounded-lg bg-white/5 animate-pulse mt-3" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* inline icon shim */
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
