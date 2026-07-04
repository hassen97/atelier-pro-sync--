import { useState } from "react";
import {
  useAdminSetSubscription,
  useAdminShopSubscriptions,
  useAdminAdjustSubscriptionMonths,
  useNotifySubscriptionBonus,
} from "@/hooks/useSubscription";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Zap, Gift, Minus, Plus, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";

interface GodModeSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  shopName: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Illimité";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GodModeSubscriptionDialog({
  open,
  onOpenChange,
  userId,
  shopName,
}: GodModeSubscriptionDialogProps) {
  const { data: plans, isLoading: plansLoading } = usePublicPlans();
  const { data: subs } = useAdminShopSubscriptions();
  const setSubscription = useAdminSetSubscription();
  const adjustMonths = useAdminAdjustSubscriptionMonths();
  const notifyBonus = useNotifySubscriptionBonus();

  const [planId, setPlanId] = useState("");
  const [months, setMonths] = useState("1");

  // Adjustment state
  const [deltaMonths, setDeltaMonths] = useState(1);
  const [notify, setNotify] = useState(true);
  const [bonusMessage, setBonusMessage] = useState("");

  const currentSub = subs?.find((s: any) => s.user_id === userId);
  const hasActiveSub = !!currentSub;
  const isUnlimited = hasActiveSub && currentSub.expires_at === null;

  // Preview new expiry from current expiry / now
  const previewNewExpiry = (() => {
    if (!hasActiveSub || isUnlimited || deltaMonths === 0) return null;
    const now = new Date();
    const current = currentSub.expires_at ? new Date(currentSub.expires_at) : now;
    const base = current.getTime() > now.getTime() ? current : now;
    const next = new Date(base);
    next.setMonth(next.getMonth() + deltaMonths);
    if (next.getTime() < now.getTime()) next.setTime(now.getTime());
    return next.toISOString();
  })();

  const handleApply = () => {
    if (!planId) return;
    setSubscription.mutate(
      { userId, planId, months: Number(months) },
      {
        onSuccess: () => {
          toast.success("Abonnement mis à jour avec succès");
          onOpenChange(false);
          setPlanId("");
          setMonths("1");
        },
        onError: (e: any) => toast.error(e.message || "Erreur"),
      }
    );
  };

  const handleAdjust = () => {
    if (!hasActiveSub || deltaMonths === 0) return;
    adjustMonths.mutate(
      { userId, months: deltaMonths },
      {
        onSuccess: async (res) => {
          if (res.wasUnlimited) {
            toast.info("Cet abonnement est illimité — aucune date à ajuster.");
            return;
          }
          const verb = deltaMonths > 0 ? "ajouté" : "retiré";
          toast.success(
            `${Math.abs(deltaMonths)} mois ${verb} — expire le ${formatDate(res.newExpiresAt)}`
          );

          if (notify) {
            try {
              const r = await notifyBonus.mutateAsync({
                userId,
                months: deltaMonths,
                newExpiresAt: res.newExpiresAt,
                customMessage: bonusMessage.trim() || undefined,
              });
              const parts: string[] = [];
              if (r.channels.inApp) parts.push("popup");
              if (r.channels.push > 0) parts.push(`push (${r.channels.push})`);
              if (r.channels.email) parts.push("email");
              toast.success(
                parts.length
                  ? `Client notifié : ${parts.join(", ")}`
                  : "Notification envoyée (aucun canal actif)"
              );
            } catch (e: any) {
              toast.error(`Ajustement OK, mais notification échouée : ${e.message}`);
            }
          }

          onOpenChange(false);
          setDeltaMonths(1);
          setBonusMessage("");
        },
        onError: (e: any) => toast.error(e.message || "Erreur"),
      }
    );
  };

  const adjusting = adjustMonths.isPending || notifyBonus.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#00D4FF]" />
            God Mode — Abonnement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-white/5 p-3 text-sm">
            <span className="text-slate-400">Boutique : </span>
            <span className="text-white font-medium">{shopName}</span>
            {currentSub && (
              <>
                <div className="mt-1">
                  <span className="text-slate-400">Plan actuel : </span>
                  <Badge className="text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 ml-1">
                    {currentSub.plan?.name ?? "—"}
                  </Badge>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400">Expire le : </span>
                  <span className="text-white font-medium">
                    {formatDate(currentSub.expires_at)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ===== Adjust duration (keep current plan) ===== */}
          <div className="rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-[#00D4FF]" />
              <Label className="text-white font-medium">Ajuster la durée (même plan)</Label>
            </div>

            {!hasActiveSub ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Aucun abonnement actif. Attribuez d'abord un plan ci-dessous.
              </p>
            ) : isUnlimited ? (
              <p className="text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                <InfinityIcon className="h-3.5 w-3.5" />
                Abonnement illimité — pas de date d'expiration à ajuster.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeltaMonths((d) => d - 1)}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 w-9"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={deltaMonths}
                    onChange={(e) => setDeltaMonths(Math.trunc(Number(e.target.value) || 0))}
                    className="bg-white/5 border-white/10 text-white text-center w-20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeltaMonths((d) => d + 1)}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 w-9"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400">mois</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDeltaMonths(m)}
                      className="text-xs px-2.5 py-1 rounded-md bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 hover:bg-[#00D4FF]/20"
                    >
                      🎁 +{m}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDeltaMonths(-1)}
                    className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  >
                    −1
                  </button>
                </div>

                {previewNewExpiry && (
                  <p className="text-xs text-slate-300">
                    Nouvelle expiration :{" "}
                    <span className="text-[#00D4FF] font-medium">
                      {formatDate(previewNewExpiry)}
                    </span>
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <Label className="text-sm text-slate-300">Notifier le client du bonus</Label>
                  <Switch checked={notify} onCheckedChange={setNotify} />
                </div>

                {notify && (
                  <Textarea
                    value={bonusMessage}
                    onChange={(e) => setBonusMessage(e.target.value)}
                    placeholder="Message personnalisé (optionnel)…"
                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px]"
                  />
                )}

                <Button
                  onClick={handleAdjust}
                  disabled={deltaMonths === 0 || adjusting}
                  className="w-full bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
                >
                  {adjusting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Gift className="h-4 w-4 mr-2" />
                  )}
                  {deltaMonths >= 0 ? "Offrir / Ajouter" : "Retirer"} {Math.abs(deltaMonths)} mois
                </Button>
              </>
            )}
          </div>

          {/* ===== Replace plan ===== */}
          <div className="pt-1">
            <Label className="text-slate-300">Remplacer le plan</Label>
            {plansLoading ? (
              <div className="mt-1.5 flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : (
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sélectionner un plan…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {plans?.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white hover:bg-white/10">
                      {p.name} — {p.price === 0 ? "Gratuit" : `${p.price} ${p.currency}${p.period ?? ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-slate-300">Durée (mois)</Label>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {[1, 2, 3, 6, 12, 24].map((m) => (
                  <SelectItem key={m} value={String(m)} className="text-white hover:bg-white/10">
                    {m} mois
                  </SelectItem>
                ))}
                <SelectItem value="0" className="text-white hover:bg-white/10">Illimité (pas d'expiration)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400">
            ⚡ Remplacer le plan annulera l'abonnement actuel et activera immédiatement le nouveau plan choisi.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            Fermer
          </Button>
          <Button
            onClick={handleApply}
            disabled={!planId || setSubscription.isPending}
            className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
          >
            {setSubscription.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Remplacer le plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
