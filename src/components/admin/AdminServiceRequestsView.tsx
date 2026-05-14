import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminServiceRequests, useUpdateServiceRequest, type AdminServiceRequest } from "@/hooks/useAdminServiceRequests";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, Phone, Search } from "lucide-react";

const STATUS_BADGE: Record<AdminServiceRequest["status"], { label: string; cls: string }> = {
  pending:     { label: "En attente", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  in_progress: { label: "En cours",   cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  completed:   { label: "Terminée",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled:   { label: "Annulée",    cls: "bg-white/5 text-slate-400 border-white/10" },
};

export function AdminServiceRequestsView() {
  const { data = [], isLoading } = useAdminServiceRequests();
  const update = useUpdateServiceRequest();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminServiceRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [resultText, setResultText] = useState("");

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          r.service_name_snapshot,
          r.shop_name,
          r.owner_full_name,
          r.input_data?.imei,
          r.input_data?.model,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, search]);

  const openDetail = (r: AdminServiceRequest) => {
    setSelected(r);
    setAdminNote(r.admin_note ?? "");
    setResultText(r.result_data && Object.keys(r.result_data).length ? JSON.stringify(r.result_data, null, 2) : "");
  };

  const setStatus = (s: AdminServiceRequest["status"]) => {
    if (!selected) return;
    update.mutate({ id: selected.id, status: s });
    setSelected({ ...selected, status: s });
  };

  const saveDetails = async () => {
    if (!selected) return;
    let parsed: Record<string, any> = {};
    try { parsed = resultText.trim() ? JSON.parse(resultText) : {}; }
    catch { parsed = { value: resultText }; }
    await update.mutateAsync({ id: selected.id, admin_note: adminNote || null, result_data: parsed });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Demandes entrantes</h2>
        <p className="text-xs text-slate-500 mt-0.5">Centralisation des demandes de services & locations envoyées par les boutiques.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (boutique, IMEI, service)"
            className="pl-8 w-72 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-left px-4 py-2.5">Boutique</th>
              <th className="text-left px-4 py-2.5">Service</th>
              <th className="text-left px-4 py-2.5">IMEI / Détails</th>
              <th className="text-right px-4 py-2.5">Prix</th>
              <th className="text-center px-4 py-2.5">Statut</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {isLoading && (<tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Chargement...</td></tr>)}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Aucune demande.</td></tr>
            )}
            {filtered.map((r) => {
              const s = STATUS_BADGE[r.status];
              return (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{format(new Date(r.created_at), "dd MMM HH:mm", { locale: fr })}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-white">{r.shop_name || r.owner_full_name || "—"}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      {r.shop_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.shop_phone}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-white">{r.service_name_snapshot}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[200px] truncate">{r.input_data?.imei || r.input_data?.model || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Number(r.service_price_snapshot).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-center"><Badge variant="outline" className={s.cls}>{s.label}</Badge></td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="outline" className="border-white/10 text-slate-300" onClick={() => openDetail(r)}>
                      Ouvrir
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-[#0B1120] border-white/10 text-white overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{selected.service_name_snapshot}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border border-white/10 p-3 space-y-1">
                  <div className="text-xs text-slate-500">Boutique</div>
                  <div className="font-medium">{selected.shop_name || selected.owner_full_name || "—"}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selected.shop_whatsapp && (
                      <a
                        href={`https://wa.me/${selected.shop_whatsapp.replace(/\D/g, "")}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                    {selected.shop_phone && (
                      <a href={`tel:${selected.shop_phone}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10">
                        <Phone className="h-3 w-3" /> {selected.shop_phone}
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Données envoyées</div>
                  <pre className="rounded bg-white/5 border border-white/10 p-2 text-xs overflow-auto">{JSON.stringify(selected.input_data, null, 2)}</pre>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">Note admin (visible par la boutique)</div>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">Résultat (code, lien, JSON)</div>
                  <Textarea
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    rows={4}
                    placeholder='{"code":"123456"}'
                    className="bg-white/5 border-white/10 text-white font-mono text-xs"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <Button size="sm" variant="outline" className="border-white/10" onClick={saveDetails} disabled={update.isPending}>
                    Enregistrer
                  </Button>
                  <Button size="sm" onClick={() => setStatus("in_progress")} className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30">
                    En cours
                  </Button>
                  <Button size="sm" onClick={() => setStatus("completed")} className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30">
                    Terminer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus("cancelled")} className="border-white/10 text-slate-300">
                    Annuler
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
