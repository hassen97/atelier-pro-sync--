import { useState, ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlanPermissions, PlanModules, PlanLimits } from "@/hooks/usePlanPermissions";
import { UpgradeModal } from "./UpgradeModal";

interface PremiumFeatureProps {
  /** Module key to check (from PlanModules) */
  featureKey?: keyof PlanModules;
  /** Limit key to check (from PlanLimits) */
  limitKey?: keyof PlanLimits;
  /** Current count to compare against the limit */
  currentCount?: number;
  /** Human-readable feature name shown in the upgrade modal */
  featureName?: string;
  /**
   * "hidden" — render nothing when locked
   * "locked" — render children with a lock overlay (default)
   * "disabled" — render children with reduced opacity + lock icon, no overlay click
   */
  mode?: "hidden" | "locked" | "disabled";
  children: ReactNode;
  /** Optional element shown instead of children when in "hidden" mode */
  fallback?: ReactNode;
}

export function PremiumFeature({
  featureKey,
  limitKey,
  currentCount = 0,
  featureName,
  mode = "locked",
  children,
  fallback = null,
}: PremiumFeatureProps) {
  const { isFeatureEnabled, hasReachedLimit, isLoading } = usePlanPermissions();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (isLoading) return <>{children}</>;

  const featureLocked = featureKey ? !isFeatureEnabled(featureKey) : false;
  const limitReached = limitKey ? hasReachedLimit(limitKey, currentCount) : false;
  const isLocked = featureLocked || limitReached;

  if (!isLocked) return <>{children}</>;

  if (mode === "hidden") return <>{fallback}</>;

  if (mode === "disabled") {
    return (
      <span className="relative inline-flex items-center gap-1 opacity-50 cursor-not-allowed select-none">
        {children}
        <Lock className="h-3 w-3 text-muted-foreground" />
      </span>
    );
  }

  // mode === "locked" — overlay with upgrade trigger
  return (
    <>
      <div
        className="relative inline-flex cursor-pointer group"
        onClick={() => setUpgradeOpen(true)}
        title={featureName ? `Débloquer : ${featureName}` : "Fonctionnalité premium"}
      >
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
          <Lock className="h-4 w-4 text-primary" />
        </span>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} featureName={featureName} />
    </>
  );
}
