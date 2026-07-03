import { useWaitlistEntries } from "@/hooks/useWaitlist";
import { Loader2, Mail, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AdminWaitlistView() {
  const { data, isLoading } = useWaitlistEntries();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" /></div>;
  }

  const entries = data?.entries || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Liste d'attente</h2>
        <span className="text-sm text-slate-400 font-mono-numbers">{entries.length} inscrits</span>
      </div>

      <div className="admin-glass-card rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {entries.length === 0 ? (
            <div className="text-center text-slate-500 py-12">Aucune inscription pour le moment</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-white text-sm">{entry.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {format(new Date(entry.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
