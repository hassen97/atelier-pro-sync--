## Problem

Existing shop owners (e.g. `coolstoresbz`, who has `onboarding_completed = true` and real data) are **sometimes** redirected to `/onboarding/setup` after login, as if they were brand-new accounts with no data.

## Root cause

The funnel guard lives in `useOnboardingStatus` inside `src/components/auth/ProtectedRoute.tsx`. It reads `shop_settings.onboarding_completed` like this:

```ts
const { data: settings } = await supabase
  .from("shop_settings")
  .select("onboarding_completed")
  .eq("user_id", userId)
  .maybeSingle();

const onboardingCompleted = (settings as any)?.onboarding_completed === true;
```

Two problems combine:

1. **The query error is ignored.** If the read transiently fails (network blip, or the auth token not fully attached on the first request right after login), `settings` is `undefined`, so `onboardingCompleted` silently becomes `false`.
2. **The bad result is cached.** The query returns successfully (no throw) with `onboardingCompleted = false`, and `staleTime: 30s` keeps that wrong value around. The guard then fires:

```ts
if (onboardingStatus.isVerified && !onboardingStatus.onboardingCompleted) {
  if (path !== "/onboarding/setup") return <Navigate to="/onboarding/setup" replace />;
}
```

So a transient read failure pushes a fully-onboarded owner into the onboarding funnel until the cache expires — exactly the intermittent behavior reported.

The same swallow-the-error pattern exists for the `user_roles` and `shop_subscriptions` reads in that hook, which can similarly mis-classify a user during a transient failure.

## Fix

Edit only `useOnboardingStatus` in `src/components/auth/ProtectedRoute.tsx` so a failed read never gets interpreted as "not onboarded":

1. **Throw on real errors** from the `user_roles`, `shop_settings`, and `shop_subscriptions` reads instead of ignoring them. React Query then retries with backoff rather than caching a false negative. Bump the query `retry` (e.g. `retry: 2`) for this gate.
2. **Only redirect to onboarding on a positive signal.** Compute `onboardingCompleted` only from a successfully-read row. If the `shop_settings` row read returns no error but `data` is `null` (row genuinely missing — should not happen for existing owners since the signup trigger always creates it), treat it as `skip`/no-redirect rather than forcing the funnel.
3. **Keep brand-new-owner behavior intact:** a real new owner still has a `shop_settings` row with `onboarding_completed = false`, which is a definitive read → they are still correctly sent to `/onboarding/setup`.

### Technical notes
- This is a frontend-only change; no schema or data changes.
- `isPlatformAdmin`, employee, and impersonation skip paths stay unchanged.
- Auth.tsx already invalidates `["onboarding-status"]` on login; with the retry-on-error fix, the post-login refetch will no longer cache a transient `false`.
- Note for awareness (not changed by this fix): 74 owners legitimately have `onboarding_completed = false` while having data; those are real incomplete-onboarding accounts and will still be routed to the funnel by design. If you want those grandfathered in, that's a separate data decision we can handle on request.
