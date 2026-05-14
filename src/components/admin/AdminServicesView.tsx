import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useServices, useToggleService, useDeleteService, SERVICE_CATEGORIES, type ServiceRow } from "@/hooks/useServices";
import { ServiceFormDialog } from "./ServiceFormDialog";

export function AdminServicesView() {
  const { data = [], isLoading } = useServices({ adminMode: true });
  const toggle = useToggleService();
  const del = useDeleteService();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);

  const activeCount = data.filter((s) => s.is_active).length;
  const inactiveCount = data.length - activeCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Catalogue Services</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            FRP, KG, MDM bypass, location d'outils — gestion centrale.
            {data.length > 0 && (
              <span className="ml-2">
                <span className="text-emerald-400">{activeCount} actif{activeCount > 1 ? "s" : ""}</span>
                <span className="text-slate-600"> · </span>
                <span className="text-slate-500">{inactiveCount} inactif{inactiveCount > 1 ? "s" : ""}</span>
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-black">
          <Plus className="h-4 w-4 mr-1" /> Nouveau service
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5">Nom</th>
              <th className="text-left px-4 py-2.5">Catégorie</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Prix</th>
              <th className="text-center px-4 py-2.5">Actif</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {isLoading && (<tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Chargement...</td></tr>)}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun service. Cliquez sur « Nouveau service ».</td></tr>
            )}
            {data.map((s) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category;
              return (
                <tr key={s.id} className={`hover:bg-white/[0.02] ${!s.is_active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      {!s.is_active && (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] px-1.5 py-0">
                          Inactif
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className="border-white/10 text-slate-300">{cat}</Badge></td>
                  <td className="px-4 py-2.5 text-slate-400">{s.type === "tool_rental" ? "Location" : "Service"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Number(s.price).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })} />
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                      onClick={() => { if (confirm(`Supprimer "${s.name}" ?`)) del.mutate(s.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ServiceFormDialog open={open} onOpenChange={setOpen} service={editing} />
    </div>
  );
}
