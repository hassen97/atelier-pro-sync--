import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { useEnabledGateways, useCreateOrder } from "@/hooks/useCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePromoCode } from "@/hooks/usePromoCodes";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ensureSession, withSessionRetry } from "@/lib/authWrite";
import {
  ArrowLeft, Check, Upload, Loader2, Smartphone, CreditCard,
  Landmark, Globe, Bitcoin, Image, ChevronRight, Clock, Zap, Camera, Ticket, X
} from "lucide-react";
import { ProofPickerSheet } from "@/components/ui/ProofPickerSheet";

const gatewayIcons: Record<string, any> = {
  stripe: CreditCard,
  konnect: Globe,
  flouci: Smartphone,
  bank_transfer: Landmark,
  d17: Smartphone,
  usdt: Bitcoin,
  binance_pay: Bitcoin,
};

export default function Checkout() {
  const [params] = useSearchParams();
  const planId = params.get("plan");
  const isOnboarding = params.get("onboarding") === "true";
  const isExpired = params.get("reason") === "expired";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans } = usePublicPlans();
  const { data: gateways, isLoading: gatewaysLoading } = useEnabledGateways();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const [startingTrial, setStartingTrial] = useState(false);

  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
  } | null>(null);

  const plan = plans?.find(p => p.id === planId);
  const gateway = gateways?.find(g => g.gateway_key === selectedGateway);

  const discountAmount = (() => {
    if (!plan || !appliedPromo) return 0;
    const raw = appliedPromo.discount_type === "percent"
      ? (plan.price * appliedPromo.discount_value) / 100
      : appliedPromo.discount_value;
    return Math.min(plan.price, Math.max(0, Math.round(raw * 100) / 100));
  })();
  const finalPrice = plan ? Math.max(0, Math.round((plan.price - discountAmount) * 100) / 100) : 0;

  const promoReasons: Record<string, string> = {
    not_found: "Code promo introuvable.",
    inactive: "Ce code promo n'est plus actif.",
    expired: "Ce code promo a expiré.",
    max_uses_reached: "Ce code promo a atteint sa limite d'utilisation.",
    already_used: "Vous avez déjà utilisé ce code promo.",
    empty: "Veuillez saisir un code.",
  };

  const applyPromo = async (raw?: string) => {
    const code = (raw ?? promoInput).trim();
    if (!code) return;
    setPromoChecking(true);
    setPromoError(null);
    try {
      const res = await validatePromoCode(code);
      if (res.valid && res.promo_code_id) {
        setAppliedPromo({
          id: res.promo_code_id,
          code: res.code || code.toUpperCase(),
          discount_type: res.discount_type!,
          discount_value: Number(res.discount_value),
        });
        setPromoInput(res.code || code.toUpperCase());
      } else {
        setAppliedPromo(null);
        setPromoError(promoReasons[res.reason] || "Code promo invalide.");
      }
    } catch {
      setPromoError("Impossible de vérifier le code pour l'instant.");
    } finally {
      setPromoChecking(false);
    }
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // Prefill promo code saved at signup (auto-apply if still valid)
  useEffect(() => {
    if (!user || appliedPromo || promoInput) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("pending_promo_code")
        .eq("user_id", user.id)
        .maybeSingle();
      const saved = (data as any)?.pending_promo_code as string | null;
      if (!cancelled && saved) {
        setPromoInput(saved);
        applyPromo(saved);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const handleStartTrial = async () => {
    if (!user) return;
    setStartingTrial(true);
    try {
      // Find cheapest plan as the trial plan (or first active plan)
      const trialPlan = plans?.sort((a, b) => a.price - b.price)?.[0];
      if (!trialPlan) {
        toast.error("Aucun plan disponible");
        return;
      }

      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 3);

      // Guarantee the auth token is attached so RLS `auth.uid()` is populated.
      const uid = await ensureSession();

      // Deactivate any existing subscriptions
      await supabase
        .from("shop_subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", uid);

      await withSessionRetry(async () => {
        const { error } = await supabase
          .from("shop_subscriptions")
          .insert({
            user_id: uid,
            plan_id: trialPlan.id,
            status: "trialing",
            started_at: now.toISOString(),
            expires_at: trialEnd.toISOString(),
          });
        if (error) throw error;
      });


      // Invalidate caches that gate routing & subscription state, otherwise
      // ProtectedRoute would re-read its stale "no subscription" snapshot
      // and bounce the user back to /checkout.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["onboarding-status", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-subscription", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-subscription-orders", user.id] }),
      ]);

      toast.success("Essai de 3 jours activé ! Bienvenue 🎉");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation de l'essai");
    } finally {
      setStartingTrial(false);
    }
  };

  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`} replace />;
  }

  // Plan selection view (onboarding or no plan selected)
  if (!plan) {
    return (
      <div className="min-h-screen" style={{ background: "hsl(222 47% 6%)" }}>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "hsl(0 0% 98%)" }}>
              {isExpired ? "Votre abonnement a expiré" : "Choisissez votre formule"}
            </h1>
            <p className="mt-2" style={{ color: "hsl(240 5% 55%)" }}>
              {isExpired
                ? "Renouvelez votre abonnement pour continuer à utiliser RepairPro"
                : "Sélectionnez un plan ou démarrez un essai gratuit"
              }
            </p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {plans?.filter(p => p.is_active).sort((a, b) => a.sort_order - b.sort_order).map(p => (
              <div
                key={p.id}
                className={`rounded-xl border p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                  p.highlight
                    ? "border-blue-500/50 bg-blue-950/20"
                    : "border-white/10 bg-white/5"
                }`}
                onClick={() => navigate(`/checkout?plan=${p.id}`)}
              >
                {p.highlight && (
                  <Badge className="mb-3 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Populaire
                  </Badge>
                )}
                <h3 className="text-lg font-bold" style={{ color: "hsl(0 0% 98%)" }}>{p.name}</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold" style={{ color: "hsl(217 91% 60%)" }}>
                    {p.price} {p.currency}
                  </span>
                  <span style={{ color: "hsl(240 5% 55%)" }}>{p.period}</span>
                </div>
                {p.description && (
                  <p className="text-sm mt-2" style={{ color: "hsl(240 5% 55%)" }}>{p.description}</p>
                )}
                <Button className="w-full mt-4" size="sm">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Sélectionner
                </Button>
              </div>
            ))}
          </div>

          {/* Trial button */}
          {(isOnboarding || !isExpired) && (
            <div className="text-center border-t border-white/10 pt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={handleStartTrial}
                disabled={startingTrial}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                {startingTrial ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activation...</>
                ) : (
                  <><Clock className="h-4 w-4 mr-2" />Démarrer l'essai de 3 jours</>
                )}
              </Button>
              <p className="text-xs mt-2" style={{ color: "hsl(240 5% 55%)" }}>
                Aucun paiement requis. Accès complet pendant 3 jours.
              </p>
            </div>
          )}

          {!isOnboarding && !isExpired && (
            <div className="text-center mt-6">
              <Link to="/dashboard" className="text-sm" style={{ color: "hsl(240 5% 55%)" }}>
                ← Retour au tableau de bord
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleProofSelected = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Fichier trop volumineux (max 5MB)");
      return;
    }
    setProofFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!selectedGateway || !proofFile) return;
    createOrder.mutate({
      planId: plan.id,
      gatewayKey: selectedGateway,
      amount: finalPrice,
      currency: plan.currency,
      proofFile,
      promoCodeId: appliedPromo?.id ?? null,
      discountApplied: discountAmount,
    }, {
      onSuccess: async () => {
        if (user) {
          // Consume the saved promo so it isn't reused
          if (appliedPromo) {
            await supabase
              .from("profiles")
              .update({ pending_promo_code: null })
              .eq("user_id", user.id);
          }
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["onboarding-status", user.id] }),
            queryClient.invalidateQueries({ queryKey: ["my-subscription", user.id] }),
            queryClient.invalidateQueries({ queryKey: ["my-subscription-orders", user.id] }),
          ]);
        }
        navigate("/dashboard");
      },
    });
  };

  const configLabels: Record<string, string> = {
    bank_name: "Banque",
    account_name: "Titulaire du compte",
    rib: "RIB",
    iban: "IBAN",
    phone_number: "Numéro de téléphone",
    d17_name: "Nom du titulaire",
    wallet_address: "Adresse du wallet",
    network: "Réseau",
    binance_id: "Binance Pay ID",
    binance_username: "Nom d'utilisateur Binance",
    merchant_id: "Merchant ID",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, hsl(222 47% 6%), hsl(222 47% 10%))" }}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: "hsl(240 5% 55%)" }}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(0 0% 95%)" }}>Finaliser votre abonnement</h1>
        </div>

        {/* Plan summary */}
        <div className="rounded-xl p-5 mb-8" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: "hsl(0 0% 95%)" }}>{plan.name}</h3>
              <p className="text-sm" style={{ color: "hsl(240 5% 50%)" }}>{plan.description}</p>
            </div>
            <div className="text-right">
              {appliedPromo && discountAmount > 0 ? (
                <>
                  <span className="text-sm line-through mr-2" style={{ color: "hsl(240 5% 45%)" }}>
                    {plan.price} {plan.currency}
                  </span>
                  <span className="text-2xl font-bold" style={{ color: "hsl(142 71% 55%)" }}>
                    {finalPrice} {plan.currency}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold" style={{ color: "hsl(217 91% 60%)" }}>
                  {plan.price} {plan.currency}
                </span>
              )}
              {plan.period && <span className="text-sm ml-1" style={{ color: "hsl(240 5% 45%)" }}>{plan.period}</span>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Array.isArray(plan.features) ? plan.features : ((plan.features as any)?.display ?? [])).slice(0, 4).map((f: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs" style={{ background: "hsla(217, 91%, 60%, 0.1)", color: "hsl(217 91% 70%)", border: "none" }}>
                <Check className="h-3 w-3 mr-1" /> {f}
              </Badge>
            ))}
          </div>

          {/* Promo code */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.06)" }}>
            {appliedPromo && discountAmount > 0 ? (
              <div className="flex items-center justify-between rounded-lg px-3 py-2.5"
                   style={{ background: "hsla(142, 71%, 45%, 0.1)", border: "1px solid hsla(142, 71%, 45%, 0.25)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Ticket className="h-4 w-4 shrink-0" style={{ color: "hsl(142 71% 55%)" }} />
                  <span className="text-sm font-medium truncate" style={{ color: "hsl(142 71% 70%)" }}>
                    {appliedPromo.code} · −{discountAmount} {plan.currency}
                  </span>
                </div>
                <button onClick={clearPromo} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Retirer le code">
                  <X className="h-4 w-4" style={{ color: "hsl(240 5% 60%)" }} />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                    placeholder="Code promo"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyPromo()}
                    disabled={promoChecking || !promoInput.trim()}
                  >
                    {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
                  </Button>
                </div>
                {promoError && (
                  <p className="text-xs mt-2" style={{ color: "hsl(0 72% 60%)" }}>{promoError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Select payment method */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(0 0% 95%)" }}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: "hsl(217 91% 55%)", color: "white" }}>1</span>
            Choisir le mode de paiement
          </h2>
          
          {gatewaysLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(217 91% 60%)" }} /></div>
          ) : !gateways?.length ? (
            <p className="text-sm py-4" style={{ color: "hsl(240 5% 45%)" }}>Aucun mode de paiement disponible pour le moment.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {gateways.map((gw) => {
                const Icon = gatewayIcons[gw.gateway_key] || CreditCard;
                const isSelected = selectedGateway === gw.gateway_key;
                return (
                  <button
                    key={gw.id}
                    onClick={() => setSelectedGateway(gw.gateway_key)}
                    className="flex items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{
                      background: isSelected ? "hsla(217, 91%, 60%, 0.1)" : "hsla(0, 0%, 100%, 0.03)",
                      border: `1px solid ${isSelected ? "hsl(217 91% 55%)" : "hsla(0, 0%, 100%, 0.08)"}`,
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsla(217, 91%, 60%, 0.1)" }}>
                      <Icon className="h-5 w-5" style={{ color: "hsl(217 91% 65%)" }} />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm" style={{ color: "hsl(0 0% 95%)" }}>{gw.gateway_name}</span>
                      {gw.description && <p className="text-xs" style={{ color: "hsl(240 5% 45%)" }}>{gw.description}</p>}
                    </div>
                    {isSelected && <Check className="h-5 w-5" style={{ color: "hsl(217 91% 60%)" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Payment details */}
        {selectedGateway && gateway && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(0 0% 95%)" }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: "hsl(217 91% 55%)", color: "white" }}>2</span>
              Informations de paiement
            </h2>
            
            <div className="rounded-xl p-5" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
              {gateway.config && Object.keys(gateway.config).length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm mb-4" style={{ color: "hsl(240 5% 55%)" }}>
                    Effectuez votre paiement de <strong style={{ color: "hsl(217 91% 60%)" }}>{finalPrice} {plan.currency}</strong> en utilisant les informations suivantes :
                  </p>
                  {Object.entries(gateway.config).filter(([_, v]) => v).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
                      <span className="text-sm" style={{ color: "hsl(240 5% 50%)" }}>{configLabels[key] || key}</span>
                      <span className="text-sm font-mono font-medium select-all" style={{ color: "hsl(0 0% 95%)" }}>{value as string}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "hsl(240 5% 45%)" }}>
                  Les informations de paiement ne sont pas encore configurées. Contactez l'administrateur.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Upload proof */}
        {selectedGateway && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(0 0% 95%)" }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: "hsl(217 91% 55%)", color: "white" }}>3</span>
              Capture d'écran du paiement
            </h2>
            
            {previewUrl ? (
              <div className="rounded-xl overflow-hidden relative" style={{ border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
                <img src={previewUrl} alt="Preuve de paiement" className="w-full max-h-64 object-contain" style={{ background: "hsla(0, 0%, 0%, 0.3)" }} />
                <button
                  onClick={() => setPickerOpen(true)}
                  className="absolute bottom-3 right-3 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ background: "hsla(0, 0%, 0%, 0.6)", color: "white", backdropFilter: "blur(8px)" }}
                >
                  Changer l'image
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full rounded-xl p-8 flex flex-col items-center gap-3 transition-colors"
                style={{ background: "hsla(0, 0%, 100%, 0.02)", border: "2px dashed hsla(0, 0%, 100%, 0.1)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsla(217, 91%, 60%, 0.1)" }}>
                  <Camera className="h-5 w-5" style={{ color: "hsl(217 91% 60%)" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "hsl(0 0% 85%)" }}>Cliquez pour télécharger</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(240 5% 40%)" }}>PNG, JPG jusqu'à 5MB</p>
                </div>
              </button>
            )}
            <ProofPickerSheet
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onFileSelected={handleProofSelected}
            />
          </div>
        )}

        {/* Submit */}
        {selectedGateway && (
          <Button
            onClick={handleSubmit}
            disabled={!proofFile || createOrder.isPending}
            className="w-full h-12 rounded-full text-sm font-medium"
            style={{ background: proofFile ? "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 40%))" : "hsla(0, 0%, 100%, 0.05)", color: proofFile ? "white" : "hsl(240 5% 40%)" }}
          >
            {createOrder.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            Envoyer le paiement pour vérification
          </Button>
        )}
      </div>
    </div>
  );
}
