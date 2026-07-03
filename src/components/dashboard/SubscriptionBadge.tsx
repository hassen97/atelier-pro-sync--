import { motion } from "framer-motion";
import { Crown, Zap, Shield, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

function getPlanConfig(planName?: string | null, status?: string) {
  const name = (planName || "").toLowerCase();
  const isExpired = status === "canceled" || status === "past_due";

  if (isExpired) {
    return {
      label: planName || "Plan Expiré",
      icon: AlertTriangle,
      className: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
      glowClass: "shadow-[0_0_12px_hsl(var(--warning)/0.15)]",
      iconClass: "text-amber-400",
    };
  }

  if (name.includes("elite") || name.includes("entreprise") || name.includes("enterprise")) {
    return {
      label: planName,
      icon: Crown,
      className:
        "bg-gradient-to-r from-yellow-500/15 via-amber-400/10 to-yellow-500/15 border-yellow-500/40 hover:from-yellow-500/25 hover:via-amber-400/20 hover:to-yellow-500/25",
      glowClass: "shadow-[0_0_16px_hsl(45_96%_50%/0.2)]",
      iconClass: "text-yellow-400",
      textClass: "bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-300 bg-clip-text text-transparent font-semibold",
    };
  }

  if (name.includes("pro") || name.includes("premium")) {
    return {
      label: planName,
      icon: Zap,
      className:
        "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-cyan-500/15 border-cyan-500/40 hover:from-cyan-500/25 hover:via-blue-500/20 hover:to-cyan-500/25",
      glowClass: "shadow-[0_0_16px_hsl(186_100%_42%/0.15)]",
      iconClass: "text-cyan-400",
      textClass: "bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent font-semibold",
    };
  }

  // Free / default
  return {
    label: planName || "Plan Gratuit",
    icon: Shield,
    className:
      "bg-muted/60 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
    glowClass: "",
    iconClass: "text-muted-foreground",
    textClass: "font-medium",
  };
}

export function SubscriptionBadge() {
  const { data: subscription, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="h-7 w-28 rounded-full bg-muted/60 animate-pulse" />
    );
  }

  const planName = subscription?.plan?.name ?? null;
  const status = subscription?.status ?? null;
  const config = getPlanConfig(planName, status);
  const Icon = config.icon;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate("/settings?tab=subscription")}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs transition-all duration-200 cursor-pointer select-none",
        config.className,
        config.glowClass
      )}
      title="Gérer mon abonnement"
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", config.iconClass)} />
      <span className={config.textClass ?? ""}>{config.label}</span>
    </motion.button>
  );
}
