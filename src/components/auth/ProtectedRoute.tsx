import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAllowedPages } from "@/hooks/useTeam";
import { useIsPlatformAdmin } from "@/hooks/useAdmin";
import { useMaintenanceModeFlag } from "@/hooks/useSystemHealth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MaintenancePage = lazy(() => import("@/pages/Maintenance"));

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Hook to fetch onboarding + verification + subscription status for the funnel guard.
 * Only runs for non-admin, non-employee users (shop owners / super_admin).
 */
function useOnboardingStatus(userId: string | undefined) {
  const { data: isPlatformAdmin } = useIsPlatformAdmin();
  return useQuery({
    queryKey: ["onboarding-status", userId, isPlatformAdmin],
    queryFn: async () => {
      if (!userId || isPlatformAdmin) return { skip: true } as const;

      // Active team membership is the source of truth for employees. Check it
      // before role rows so stale roles can never route employees as owners.
      const { data: teamRows, error: teamError } = await supabase
        .from("team_members")
        .select("id, status")
        .eq("member_user_id", userId);

      if (teamError) throw teamError;

      const hasActiveTeam = (teamRows ?? []).some((row) => row.status === "active");
      const hasTeamHistory = (teamRows ?? []).length > 0;

      if (hasActiveTeam) return { skip: true } as const;
      if (hasTeamHistory) return { skip: true, removedTeam: true } as const;

      // Role fallback for legacy accounts without a team row. Throw on a real
      // error so React Query retries instead of mis-classifying the user.
      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["employee", "manager", "admin", "platform_admin"]);

      if (roleError) throw roleError;

      const roleSet = new Set((role ?? []).map((r) => r.role));
      if (roleSet.has("employee") || roleSet.has("manager") || roleSet.has("platform_admin")) {
        return { skip: true } as const;
      }

      // Fetch onboarding_completed. CRITICAL: a transient read failure must NOT
      // be interpreted as "not onboarded" — that wrongly pushes fully-onboarded
      // owners into the onboarding funnel. Throw so React Query retries.
      const { data: settings, error: settingsError } = await supabase
        .from("shop_settings")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // No error but no row at all (should not happen for existing owners since
      // the signup trigger always creates shop_settings). Skip the funnel rather
      // than forcing onboarding on an indeterminate state.
      if (!settings) {
        return { skip: true } as const;
      }

      // Fetch active subscription (including trialing)
      const { data: sub, error: subError } = await supabase
        .from("shop_subscriptions")
        .select("status, expires_at")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      // Only a definitively-read row drives the onboarding redirect.
      const onboardingCompleted = (settings as any).onboarding_completed === true;

      // Check subscription: expired if exists but past expiry date
      let subscriptionExpired = false;
      if (sub && sub.expires_at) {
        subscriptionExpired = new Date(sub.expires_at) < new Date();
      }
      const hasActiveSubscription = sub && !subscriptionExpired;
      const hasNoSubscription = !sub;

      return {
        skip: false,
        isVerified: true,
        isPendingVerification: false,
        isSuspended: false,
        hasSubmittedVerification: true,
        onboardingCompleted,
        hasActiveSubscription,
        hasNoSubscription,
        subscriptionExpired,
      } as const;
    },
    enabled: !!userId && isPlatformAdmin !== undefined,
    // Cache the funnel-gating check briefly so it isn't re-fetched (3 queries)
    // on every navigation. This sharply reduces DB load during login storms.
    staleTime: 30 * 1000,
    // Retry transient failures with backoff so a momentary read error never
    // gets cached as a (wrong) "not onboarded" verdict.
    retry: 2,
  });
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();
  const { allowedPages, isLoading: pagesLoading } = useAllowedPages({ enabled: !!user && isPlatformAdmin === false });
  const { isImpersonating, isVerifying } = useImpersonation();
  const hasShownToast = useRef(false);
  const { data: onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus(user?.id);
  // Maintenance mode: only checked for non-admins (admins always operate).
  const { data: maintenanceOn } = useMaintenanceModeFlag(
    !!user && isPlatformAdmin === false,
  );

  // Normalize path: treat "/" and "/dashboard" as equivalent
  const currentPath = location.pathname === "/" ? "/dashboard" : location.pathname;

  // NOTE: `allowed_pages` is a UX navigation policy, not a data-security boundary.
  // Actual data protection lives in row-level security on every business table
  // (employees inherit the owner context via useEffectiveUserId + team_members RLS).
  // A team member who manually types a restricted URL hits this guard AND would
  // see no data even if the guard were bypassed, because the underlying queries
  // are RLS-scoped to permissions granted on `team_members`.
  const isBlocked =
    !pagesLoading &&
    allowedPages !== null &&
    !allowedPages.includes(currentPath);

  useEffect(() => {
    if (isBlocked && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("Accès non autorisé à cette page");
    }
  }, [isBlocked]);

  if (loading || adminLoading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Platform admin redirect logic
  if (isPlatformAdmin && location.pathname !== "/admin" && !isImpersonating) {
    return <Navigate to="/admin" replace />;
  }

  // Maintenance mode: block non-admins with a full maintenance page.
  if (!isPlatformAdmin && maintenanceOn) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <MaintenancePage />
      </Suspense>
    );
  }

  if (!isPlatformAdmin && (pagesLoading || onboardingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isPlatformAdmin && location.pathname === "/admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // === ONBOARDING FUNNEL GUARD (shop owners only) ===
  if (onboardingStatus && !onboardingStatus.skip && !isImpersonating) {
    const path = location.pathname;

    // Allow funnel routes to pass through
    const funnelRoutes = ["/onboarding/setup", "/checkout"];
    const isOnFunnelRoute = funnelRoutes.some(r => path.startsWith(r));

    // Stage 2: Verified but onboarding not completed → force to /onboarding/setup
    if (onboardingStatus.isVerified && !onboardingStatus.onboardingCompleted) {
      if (path !== "/onboarding/setup") {
        return <Navigate to="/onboarding/setup" replace />;
      }
    }

    // Stage 3: Onboarding completed but no subscription at all → force to /checkout
    if (
      onboardingStatus.isVerified &&
      onboardingStatus.onboardingCompleted &&
      onboardingStatus.hasNoSubscription &&
      !isOnFunnelRoute
    ) {
      return <Navigate to="/checkout?onboarding=true" replace />;
    }

    // Stage 4: Onboarding completed but subscription expired → force to /checkout
    if (
      onboardingStatus.isVerified &&
      onboardingStatus.onboardingCompleted &&
      onboardingStatus.subscriptionExpired &&
      !isOnFunnelRoute
    ) {
      return <Navigate to="/checkout?reason=expired" replace />;
    }
  }

  if (isBlocked) {
    const firstAllowed = allowedPages?.[0] || "/dashboard";
    return <Navigate to={firstAllowed} replace />;
  }

  return <>{children}</>;
}
