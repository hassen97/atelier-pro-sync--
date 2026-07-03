import { useSubscription } from "@/hooks/useSubscription";

export interface PlanModules {
  pos: boolean;
  repairs: boolean;
  inventory_export: boolean;
  advanced_analytics: boolean;
  bulk_sms: boolean;
  supplier_management: boolean;
}

export interface PlanLimits {
  max_employees: number; // 0 = unlimited
  max_products: number;  // 0 = unlimited
  max_monthly_repairs: number; // 0 = unlimited
}

export interface PlanFeatures {
  display: string[];
  modules: PlanModules;
  limits: PlanLimits;
}

const DEFAULT_MODULES: PlanModules = {
  pos: true,
  repairs: true,
  inventory_export: true,
  advanced_analytics: true,
  bulk_sms: true,
  supplier_management: true,
};

const DEFAULT_LIMITS: PlanLimits = {
  max_employees: 0,
  max_products: 0,
  max_monthly_repairs: 0,
};

export function parsePlanFeatures(raw: any): PlanFeatures {
  if (!raw) return { display: [], modules: { ...DEFAULT_MODULES }, limits: { ...DEFAULT_LIMITS } };

  // Already in new structured format
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "modules" in raw) {
    return {
      display: Array.isArray(raw.display) ? raw.display : [],
      modules: { ...DEFAULT_MODULES, ...(raw.modules ?? {}) },
      limits: { ...DEFAULT_LIMITS, ...(raw.limits ?? {}) },
    };
  }

  // Legacy: plain string array — treat as display-only, all features enabled
  const display = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  return {
    display,
    modules: { ...DEFAULT_MODULES },
    limits: { ...DEFAULT_LIMITS },
  };
}

export function usePlanPermissions() {
  const { data: subscription, isLoading } = useSubscription();

  const isPaidPlan = !!subscription && !!subscription.plan && subscription.plan.price > 0;
  const planName = subscription?.plan?.name ?? "Gratuit";

  const rawFeatures = (subscription?.plan as any)?.features;
  const features = parsePlanFeatures(rawFeatures);

  /**
   * Returns true if the feature module is enabled for the current plan.
   * Falls back to true (open) if no subscription / free plan with no restrictions defined.
   */
  const isFeatureEnabled = (featureKey: keyof PlanModules): boolean => {
    if (isLoading) return true; // optimistic while loading
    return features.modules[featureKey] ?? true;
  };

  /**
   * Returns true if the user has reached or exceeded the plan limit.
   * A limit of 0 means unlimited.
   */
  const hasReachedLimit = (limitKey: keyof PlanLimits, currentCount: number): boolean => {
    if (isLoading) return false;
    const limit = features.limits[limitKey] ?? 0;
    if (limit === 0) return false; // unlimited
    return currentCount >= limit;
  };

  const getLimit = (limitKey: keyof PlanLimits): number => {
    return features.limits[limitKey] ?? 0;
  };

  return {
    isLoading,
    isPaidPlan,
    planName,
    features,
    isFeatureEnabled,
    hasReachedLimit,
    getLimit,
  };
}
