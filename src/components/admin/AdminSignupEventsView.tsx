import { useState } from "react";
import { Globe2, CheckCheck, Search, RefreshCw, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSignupEvents, useMarkEventsSeen } from "@/hooks/useAdminSecurity";

export function AdminSignupEventsView() {
  const { data: events = [], isLoading, refetch, isFetching } = useSignupEvents();
  const markSeen = useMarkEventsSeen();
  const [query, setQuery] = useState("");
  const [onlyUnseen, setOnlyUnseen] = useState(false);

  const unread = events.filter((e) => !e.seen_at);

  const filtered = events.filter((e) => {
    if (onlyUnseen && e.seen_at) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (e.username ?? "").toLowerCase().includes(q) ||
      (e.full_name ?? "").toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q) ||
      (e.country ?? "").toLowerCase().includes(q)
    );
  });

  const markOne = (id: string) => markSeen.mutateAsync([id]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-emerald-500/20 border border-[#00D4FF]/20 flex items-center justify-center">
            <Globe2 className="h-4 w-4 text-[#00D4FF]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Événements d'inscription</h2>
            <p className="text-xs text-slate-500">Toutes les nouvelles boutiques enregistrées en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#00D4FF]/25 text-[#00D4FF] hover:bg-[#00D4FF]/10"
              onClick={() => markSeen.mutateAsync(events.map((e) => e.id))}
              disabled={markSeen.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Tout marquer lu ({unread.length})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            onClick={() => refetch()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Rechercher par nom, pseudo, e-mail, pays..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <Button
          size="sm"
          variant={onlyUnseen ? "default" : "outline"}
          className={onlyUnseen
            ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25"
            : "border-white/10 text-slate-300 hover:bg-white/5"}
          onClick={() => setOnlyUnseen((v) => !v)}
        >
          Non lus {unread.length > 0 && <Badge variant="outline" className="ml-1.5 border-[#00D4FF]/30 text-[#00D4FF] text-[10px]">{unread.length}</Badge>}
        </Button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-3 text-slate-400 font-medium">Boutique</th>
                <th className="text-left p-3 text-slate-400 font-medium">Pays</th>
                <th className="text-left p-3 text-slate-400 font-medium">Date</th>
                <th className="text-right p-3 text-slate-400 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Inbox className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Aucun événement</p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const unseen = !e.seen_at;
                  return (
                    <tr
                      key={e.id}
                      className={cn(
                        "border-b border-white/5 transition-colors",
                        unseen ? "bg-[#00D4FF]/[0.04] hover:bg-[#00D4FF]/[0.08]" : "hover:bg-white/5"
                      )}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-[#00D4FF]">
                              {(e.full_name || e.username || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                              {e.full_name || e.username || "Inscription"}
                              {unseen && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-[#00D4FF] align-middle" />}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              @{e.username || "—"}
                              {e.email ? ` · ${e.email}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {e.country ? (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-xs">{e.country}</span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 text-xs whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-right">
                        {unseen ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#00D4FF] hover:bg-[#00D4FF]/10 text-xs"
                            onClick={() => markOne(e.id)}
                          >
                            <CheckCheck className="h-3 w-3 mr-1.5" /> Marquer lu
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-600">lu</span>
                        )}
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
        {filtered.length} événement{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
        {onlyUnseen ? " (non lus)" : ""}. La liste se met à jour en temps réel.
      </p>
    </div>
  );
}