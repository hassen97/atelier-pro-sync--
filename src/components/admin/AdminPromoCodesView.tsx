import { useState } from "react";
import {
  useAdminPromoCodes,
  useCreatePromoCode,
  useTogglePromoCode,
  useDeletePromoCode,
  PromoCode,
} from "@/hooks/usePromoCodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Ticket, Percent, BadgeDollarSign } from "lucide-react";

function formatExpiry(iso: string | null) {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusOf(p: PromoCode): { label: string; cls: string } {
  if (!p.is_active) return { label: "Inactif", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  if (p.expires_at && new Date(p.expires_at) < new Date())
    return { label: "Expiré", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (p.max_uses != null && p.used_count >= p.max_uses)
    return { label: "Épuisé", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
  return { label: "Actif", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
}

export function AdminPromoCodesView() {
  const { data: codes, isLoading } = useAdminPromoCodes();
  const createCode = useCreatePromoCode();
  const toggleCode = useTogglePromoCode();
  const deleteCode = useDeletePromoCode();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const resetForm = () => {
    setCode(""); setDiscountType("percent"); setDiscountValue("10");
    setMaxUses(""); setExpiresAt("");
  };

  const handleCreate = () => {
    if (!code.trim()) return;
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value < 0) return;
    createCode.mutate(
      {
        code: code.trim(),
        discount_type: discountType,
        discount_value: value,
        max_uses: maxUses.trim() ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
      { onSuccess: () => { setOpen(false); resetForm(); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Ticket className="h-4 w-4 text-[#00D4FF]" /> Codes promo
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Réductions appliquées au paiement d'un abonnement.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nouveau code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau code promo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BIENVENUE20"
                  className="uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type de réduction</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valeur</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Utilisations max</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Illimité"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expire le</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={createCode.isPending || !code.trim()}>
                {createCode.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : !codes?.length ? (
        <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-white/10 rounded-xl">
          Aucun code promo pour l'instant.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {codes.map((p) => {
            const st = statusOf(p);
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-white truncate">{p.code}</span>
                    <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                  </div>
                  <button
                    onClick={() => deleteCode.mutate(p.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[#00D4FF] font-semibold">
                  {p.discount_type === "percent"
                    ? <Percent className="h-4 w-4" />
                    : <BadgeDollarSign className="h-4 w-4" />}
                  {p.discount_type === "percent"
                    ? `${p.discount_value}% de réduction`
                    : `${p.discount_value} de réduction`}
                </div>
                <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                  <div>Utilisations : {p.used_count}{p.max_uses != null ? ` / ${p.max_uses}` : " / ∞"}</div>
                  <div>Expire : {formatExpiry(p.expires_at)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-slate-400">Actif</span>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => toggleCode.mutate({ id: p.id, is_active: v })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
