import { useAdminActivity } from "@/hooks/useAdmin";
import { Wrench, ShoppingCart, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Complété" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", label: "En attente" },
  "in-progress": { bg: "bg-[#00D4FF]/10", text: "text-[#00D4FF]", label: "En cours" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", label: "Annulé" },
};

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || statusStyles["pending"];
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-white/5 animate-pulse rounded w-3/4" />
        <div className="h-2.5 bg-white/5 animate-pulse rounded w-1/2" />
      </div>
    </div>
  );
}

export function AdminActivityFeed() {
  const { data, isLoading } = useAdminActivity();

  if (isLoading) {
    return (
      <div className="divide-y divide-white/5">
        {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
      </div>
    );
  }

  const activities = data?.activity || [];

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-600">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="relative max-h-[340px] overflow-y-auto pr-1">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-[#00D4FF]/20 via-white/5 to-transparent" />

      <div className="space-y-1">
        {activities.map((item) => (
          <div
            key={item.id}
            className="relative flex items-start gap-3 py-2.5 pl-1 pr-2 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer"
          >
            {/* Timeline dot */}
            <div className={cn(
              "relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0",
              item.type === "repair" ? "bg-amber-500/10 ring-1 ring-amber-500/20" : "bg-emerald-500/10 ring-1 ring-emerald-500/20"
            )}>
              {item.type === "repair" ? (
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-200 leading-snug truncate">{item.description}</p>
                <span className="text-xs font-mono text-slate-300 shrink-0 tabular-nums">
                  {Number(item.amount) > 0 ? `${Number(item.amount).toFixed(0)} DT` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-600">{item.shop_name}</span>
                <span className="text-[10px] text-slate-700">·</span>
                <span className="text-[10px] text-slate-600">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                </span>
                <StatusBadge status={item.status || "pending"} />
              </div>
            </div>

            {/* Hover action */}
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10 shrink-0">
              <ArrowUpRight className="h-3 w-3 text-slate-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
