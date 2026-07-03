import { useState } from "react";
import { useAdminSetSubscription, useAdminShopSubscriptions } from "@/hooks/useSubscription";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

interface GodModeSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  shopName: string;
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

  const [planId, setPlanId] = useState("");
  const [months, setMonths] = useState("1");

  const currentSub = subs?.find((s: any) => s.user_id === userId);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
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
              <div className="mt-1">
                <span className="text-slate-400">Plan actuel : </span>
                <Badge className="text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 ml-1">
                  {currentSub.plan?.name ?? "—"}
                </Badge>
              </div>
            )}
          </div>

          <div>
            <Label className="text-slate-300">Nouveau plan</Label>
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
                    {m} mois{m > 1 ? "" : ""}
                  </SelectItem>
                ))}
                <SelectItem value="0" className="text-white hover:bg-white/10">Illimité (pas d'expiration)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400">
            ⚡ Cette action annulera l'abonnement actuel et activera immédiatement le nouveau plan choisi.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            Annuler
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
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
