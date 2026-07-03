import { useState } from "react";
import { useAdminPlans, useUpdatePlan, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { parsePlanFeatures, PlanModules, PlanLimits, PlanFeatures } from "@/hooks/usePlanPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, Star, Save, Plus, Trash2, Settings, ToggleLeft, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const MODULE_LABELS: Record<keyof PlanModules, string> = {
  pos: "Point de Vente (POS)",
  repairs: "Gestion Réparations",
  inventory_export: "Export Inventaire (CSV/Excel)",
  advanced_analytics: "Statistiques Avancées",
  bulk_sms: "Bulk SMS",
  supplier_management: "Gestion Fournisseurs",
};

const LIMIT_LABELS: Record<keyof PlanLimits, { label: string; hint: string }> = {
  max_employees: { label: "Max Employés", hint: "0 = illimité" },
  max_products: { label: "Max Produits", hint: "0 = illimité" },
  max_monthly_repairs: { label: "Max Réparations/mois", hint: "0 = illimité" },
};

function buildDisplayFromFeatures(modules: PlanModules, limits: PlanLimits): string[] {
  const lines: string[] = [];
  Object.entries(modules).forEach(([key, enabled]) => {
    if (enabled) lines.push(MODULE_LABELS[key as keyof PlanModules]);
  });
  if (limits.max_employees > 0) lines.push(`Jusqu'à ${limits.max_employees} employé${limits.max_employees > 1 ? "s" : ""}`);
  if (limits.max_products > 0) lines.push(`Jusqu'à ${limits.max_products} produits`);
  if (limits.max_monthly_repairs > 0) lines.push(`Jusqu'à ${limits.max_monthly_repairs} réparations/mois`);
  return lines;
}

interface PlanEditorState {
  identity: Partial<SubscriptionPlan>;
  modules: PlanModules;
  limits: PlanLimits;
}

const DEFAULT_MODULES: PlanModules = {
  pos: true, repairs: true, inventory_export: false,
  advanced_analytics: false, bulk_sms: false, supplier_management: false,
};
const DEFAULT_LIMITS: PlanLimits = { max_employees: 1, max_products: 100, max_monthly_repairs: 50 };

function planToEditorState(plan?: Partial<SubscriptionPlan>): PlanEditorState {
  const parsed = parsePlanFeatures((plan as any)?.features);
  return {
    identity: plan ?? {
      name: "", price: 0, currency: "DT", period: "/mois",
      description: "", highlight: false, sort_order: 0, is_active: true,
    },
    modules: { ...DEFAULT_MODULES, ...parsed.modules },
    limits: { ...DEFAULT_LIMITS, ...parsed.limits },
  };
}

function serializeEditorState(state: PlanEditorState): any {
  const display = buildDisplayFromFeatures(state.modules, state.limits);
  const featuresObj: PlanFeatures = { display, modules: state.modules, limits: state.limits };
  return { ...state.identity, features: featuresObj };
}

export function AdminPlansView() {
  const { data, isLoading } = useAdminPlans();
  const updatePlan = useUpdatePlan();
  const qc = useQueryClient();
  const [editState, setEditState] = useState<PlanEditorState | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newState, setNewState] = useState<PlanEditorState>(planToEditorState());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditId(plan.id);
    setEditState(planToEditorState(plan));
  };

  const handleSave = () => {
    if (!editState || !editId) return;
    const payload = serializeEditorState(editState);
    updatePlan.mutate(
      { id: editId, ...payload },
      { onSuccess: () => { setEditId(null); setEditState(null); } }
    );
  };

  const handleCreate = async () => {
    if (!newState.identity.name?.trim()) return;
    setSaving(true);
    const payload = serializeEditorState(newState);
    const { error } = await supabase.from("subscription_plans").insert({
      name: payload.name!,
      price: payload.price ?? 0,
      currency: payload.currency ?? "DT",
      period: payload.period ?? "/mois",
      description: payload.description ?? null,
      features: payload.features as any,
      highlight: payload.highlight ?? false,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Plan créé");
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["public-subscription-plans"] });
      setCreating(false);
      setNewState(planToEditorState());
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error("Impossible de supprimer ce plan");
    else {
      toast.success("Plan supprimé");
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["public-subscription-plans"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  const plans = data?.plans || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Tarifs & Plans</h2>
        <Button
          onClick={() => { setCreating(true); setNewState(planToEditorState()); }}
          className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouveau plan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const parsed = parsePlanFeatures((plan as any).features);
          const activeModules = Object.entries(parsed.modules).filter(([, v]) => v).length;
          return (
            <div key={plan.id} className="admin-glass-card rounded-xl p-5 relative">
              {plan.highlight && (
                <Badge className="absolute -top-2 right-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-[10px]">
                  <Star className="h-3 w-3 mr-1" /> Populaire
                </Badge>
              )}
              <div className="mb-3">
                <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-[#00D4FF] font-mono-numbers">
                    {plan.price === 0 ? "Gratuit" : `${plan.price} ${plan.currency}`}
                  </span>
                  {plan.period && <span className="text-slate-500 text-sm ml-1">{plan.period}</span>}
                </div>
              </div>

              {/* Module chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(parsed.modules).map(([key, enabled]) => (
                  <span
                    key={key}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      enabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-700/40 text-slate-500 border-slate-600/30"
                    }`}
                  >
                    {MODULE_LABELS[key as keyof PlanModules].split(" ")[0]}
                  </span>
                ))}
              </div>

              {/* Limits */}
              <div className="text-xs text-slate-500 space-y-0.5 mb-3">
                {Object.entries(parsed.limits).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span>{LIMIT_LABELS[key as keyof PlanLimits].label}</span>
                    <span className="text-slate-400 font-mono-numbers">{val === 0 ? "∞" : val}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Actif</span>
                  <span className={`w-2 h-2 rounded-full ${plan.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-7 px-2" onClick={() => handleEdit(plan)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="text-slate-400 hover:text-red-400 h-7 px-2"
                    disabled={deletingId === plan.id} onClick={() => handleDelete(plan.id)}
                  >
                    {deletingId === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={(v) => !v && setCreating(false)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau plan</DialogTitle>
          </DialogHeader>
          <PlanEditor state={newState} onChange={setNewState} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)} className="text-slate-400">Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !newState.identity.name?.trim()} className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer le plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => { setEditId(null); setEditState(null); }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le plan : {editState?.identity.name}</DialogTitle>
          </DialogHeader>
          {editState && <PlanEditor state={editState} onChange={setEditState} />}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditId(null); setEditState(null); }} className="text-slate-400">Annuler</Button>
            <Button onClick={handleSave} disabled={updatePlan.isPending} className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30">
              {updatePlan.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanEditor({ state, onChange }: { state: PlanEditorState; onChange: (s: PlanEditorState) => void }) {
  const setIdentity = (patch: Partial<typeof state.identity>) =>
    onChange({ ...state, identity: { ...state.identity, ...patch } });
  const setModule = (key: keyof PlanModules, val: boolean) =>
    onChange({ ...state, modules: { ...state.modules, [key]: val } });
  const setLimit = (key: keyof PlanLimits, val: number) =>
    onChange({ ...state, limits: { ...state.limits, [key]: val } });

  return (
    <Tabs defaultValue="identity" className="w-full">
      <TabsList className="w-full bg-white/5 mb-4">
        <TabsTrigger value="identity" className="flex-1 data-[state=active]:bg-white/10 gap-1.5">
          <Settings className="h-3.5 w-3.5" /> Identité
        </TabsTrigger>
        <TabsTrigger value="modules" className="flex-1 data-[state=active]:bg-white/10 gap-1.5">
          <ToggleLeft className="h-3.5 w-3.5" /> Modules
        </TabsTrigger>
        <TabsTrigger value="limits" className="flex-1 data-[state=active]:bg-white/10 gap-1.5">
          <Gauge className="h-3.5 w-3.5" /> Limites
        </TabsTrigger>
      </TabsList>

      <TabsContent value="identity" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300 text-xs">Nom</Label>
            <Input value={state.identity.name ?? ""} onChange={(e) => setIdentity({ name: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1" placeholder="Pro, Starter..." />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Prix</Label>
            <Input type="number" value={state.identity.price ?? 0}
              onChange={(e) => setIdentity({ price: Number(e.target.value) })}
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300 text-xs">Devise</Label>
            <Input value={state.identity.currency ?? "DT"} onChange={(e) => setIdentity({ currency: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Période</Label>
            <Input value={state.identity.period ?? "/mois"} onChange={(e) => setIdentity({ period: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1" placeholder="/mois" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300 text-xs">Description</Label>
            <Input value={state.identity.description ?? ""} onChange={(e) => setIdentity({ description: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Ordre d'affichage</Label>
            <Input type="number" value={state.identity.sort_order ?? 0}
              onChange={(e) => setIdentity({ sort_order: Number(e.target.value) })}
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-6 pt-1">
          <div className="flex items-center gap-2">
            <Switch checked={state.identity.highlight ?? false} onCheckedChange={(v) => setIdentity({ highlight: v })} />
            <Label className="text-slate-300 text-xs">Plan populaire</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={state.identity.is_active ?? true} onCheckedChange={(v) => setIdentity({ is_active: v })} />
            <Label className="text-slate-300 text-xs">Actif</Label>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="modules" className="space-y-3 mt-0">
        <p className="text-xs text-slate-500 mb-3">Activez ou désactivez les modules pour ce plan.</p>
        {(Object.keys(MODULE_LABELS) as (keyof PlanModules)[]).map((key) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-white/5">
            <div>
              <p className="text-sm text-slate-200">{MODULE_LABELS[key]}</p>
            </div>
            <Switch
              checked={state.modules[key]}
              onCheckedChange={(v) => setModule(key, v)}
            />
          </div>
        ))}
      </TabsContent>

      <TabsContent value="limits" className="space-y-4 mt-0">
        <p className="text-xs text-slate-500 mb-3">Définissez les limites de ressources. <strong className="text-slate-400">0 = illimité.</strong></p>
        {(Object.keys(LIMIT_LABELS) as (keyof PlanLimits)[]).map((key) => (
          <div key={key}>
            <Label className="text-slate-300 text-xs">
              {LIMIT_LABELS[key].label}
              <span className="text-slate-500 ml-1">({LIMIT_LABELS[key].hint})</span>
            </Label>
            <Input
              type="number" min={0}
              value={state.limits[key]}
              onChange={(e) => setLimit(key, Number(e.target.value))}
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
