import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublicPlans, getPlanDisplayFeatures } from "@/hooks/useSubscriptionPlans";
import { Zap, Star, Check, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  featureName?: string;
}

export function UpgradeModal({ open, onOpenChange, featureName }: UpgradeModalProps) {
  const { data: plans, isLoading } = usePublicPlans();
  const navigate = useNavigate();

  const paidPlans = plans?.filter((p) => p.price > 0 && p.is_active) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/50 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        {/* Hero gradient header */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/15%), hsl(var(--primary)/5%))" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, hsl(var(--primary)/20%), transparent 70%)" }} />
          <div className="relative flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--primary)/20%)", border: "1px solid hsl(var(--primary)/30%)" }}>
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Passer à la version supérieure
              </DialogTitle>
              {featureName && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">{featureName}</span> requiert un plan payant
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              {paidPlans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-xl p-5 cursor-pointer group transition-all"
                  style={{
                    background: plan.highlight
                      ? "linear-gradient(135deg, hsl(var(--primary)/12%), hsl(var(--primary)/6%))"
                      : "hsl(var(--muted)/50%)",
                    border: plan.highlight
                      ? "1px solid hsl(var(--primary)/30%)"
                      : "1px solid hsl(var(--border)/50%)",
                  }}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-2 right-3 text-[10px] px-2 py-0.5"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                      <Star className="h-3 w-3 mr-1" /> Populaire
                    </Badge>
                  )}
                  <h3 className="font-semibold text-foreground mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-1 text-sm">{plan.currency}</span>
                    {plan.period && <span className="text-muted-foreground text-xs ml-1">{plan.period}</span>}
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {getPlanDisplayFeatures(plan).slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-2 text-sm"
                    style={plan.highlight ? {
                      background: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                    } : {}}
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/checkout?plan=${plan.id}`);
                    }}
                  >
                    Choisir ce plan <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4">
            Paiement manuel · Activation par l'administrateur dans les 24h
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
