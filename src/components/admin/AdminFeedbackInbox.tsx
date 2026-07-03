import { useAdminFeedback, useUpdateFeedbackStatus } from "@/hooks/useFeedback";
import { Bug, Lightbulb, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const statusConfig = {
  new: { label: "Nouveau", color: "text-[#00D4FF] bg-[#00D4FF]/10 border-[#00D4FF]/30", icon: Clock },
  in_progress: { label: "En cours", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: ArrowRight },
  resolved: { label: "Résolu", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle },
  dismissed: { label: "Rejeté", color: "text-slate-400 bg-slate-500/10 border-slate-500/30", icon: XCircle },
};

const nextStatus: Record<string, string> = {
  new: "in_progress",
  in_progress: "resolved",
  resolved: "dismissed",
  dismissed: "new",
};

export function AdminFeedbackInbox() {
  const { data: feedback } = useAdminFeedback();
  const updateStatus = useUpdateFeedbackStatus();

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-white">Boîte de réception</h2>

      <div className="space-y-2">
        {(feedback || []).map((f) => {
          const config = statusConfig[f.status as keyof typeof statusConfig] || statusConfig.new;
          const StatusIcon = config.icon;
          return (
            <div key={f.id} className="admin-glass-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", f.type === "bug" ? "bg-red-500/10" : "bg-purple-500/10")}>
                  {f.type === "bug" ? (
                    <Bug className="h-4 w-4 text-red-400" />
                  ) : (
                    <Lightbulb className="h-4 w-4 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-white">{f.shop_name || "Boutique"}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", config.color)}>
                      {config.label}
                    </span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border",
                      f.type === "bug" ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-purple-400 bg-purple-500/10 border-purple-500/30"
                    )}>
                      {f.type === "bug" ? "Bug" : "Suggestion"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5 whitespace-pre-wrap">{f.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500">
                      {format(new Date(f.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-slate-400 hover:text-white"
                      onClick={() => updateStatus.mutate({ id: f.id, status: nextStatus[f.status] || "new" })}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      → {statusConfig[nextStatus[f.status] as keyof typeof statusConfig]?.label || "Nouveau"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {(!feedback || feedback.length === 0) && (
          <p className="text-sm text-slate-500 text-center py-8">Aucun feedback reçu</p>
        )}
      </div>
    </div>
  );
}
