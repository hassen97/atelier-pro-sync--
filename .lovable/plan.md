# Fix: Super admin wrongly redirected to shop-owner dashboard

## Problem
After logging in, the super ultra admin (`hassen`, role `platform_admin`) lands on the normal shop-owner dashboard instead of `/admin`.

The database and RLS are correct (one `platform_admin` role, readable by the user). The routing in `ProtectedRoute.tsx` correctly redirects a `platform_admin` to `/admin`. The fault is in how the admin role is detected.

## Root cause
`useIsPlatformAdmin()` in `src/hooks/useAdmin.ts`:

```ts
const { data } = await supabase
  .from("user_roles").select("role").eq("user_id", user.id).single();
return data?.role === "platform_admin";
```

- It uses `.single()` and **discards the `error`**. Any transient failure (flaky mobile network, a stale cached JS chunk from the failed publishes) makes `data` `undefined`, so the hook returns `false`.
- When it returns `false`, `ProtectedRoute` skips the `/admin` redirect and renders the shop-owner dashboard — with no error surfaced.
- Every other role hook (`useIsOwner`, `useMyTeamInfo`) was already hardened with `.maybeSingle()` + error handling; this one was not.

The mobile screenshot and "works sometimes / intermittent" nature both point to this fragile query silently failing.

## Fix

### 1. Harden `useIsPlatformAdmin` (`src/hooks/useAdmin.ts`)
- Switch `.single()` → `.maybeSingle()`.
- **Throw on a real query error** instead of returning `false`. This is the key change: on error, React Query keeps the result in a loading/error state and retries, so `ProtectedRoute` shows the loader and retries rather than wrongly concluding "not an admin" and dropping the user into the shop dashboard.
- Add `retry: 2` and a short `staleTime` (e.g. 60s) so the admin status is resilient on mobile networks and isn't re-fetched on every navigation.

### 2. Make the route guard fail safe (`src/components/auth/ProtectedRoute.tsx`)
- Pull `isError`/`isLoading` from `useIsPlatformAdmin()` and keep the loading screen visible while the admin check is still loading or errored, so a failed admin check never falls through to rendering the shop owner UI. (The funnel guard already skips `platform_admin`, so this only tightens the admin path.)

### 3. Align the login-time role check (`src/pages/Auth.tsx`)
- The post-login role lookup (around line 144) also uses `.single()`. Switch it to `.maybeSingle()` for consistency so a hiccup there doesn't misclassify the account. This is secondary (navigation still goes through `ProtectedRoute`), but keeps the behavior consistent.

## After the fix
- Publish is required for this to reach the live site. Because earlier publishes failed, I'll confirm the build succeeds and recommend a fresh publish. If you're using the installed PWA, a hard refresh (or reopening the app) clears the old cached bundle so the corrected admin redirect loads.

## Verification
- Type-check / build passes.
- Trace the logic: a `platform_admin` whose role query succeeds → redirected to `/admin`; whose role query errors → stays on the loader and retries, never the shop dashboard.

## Technical notes
- No database or RLS changes are needed — the data is already correct.
- Files touched: `src/hooks/useAdmin.ts`, `src/components/auth/ProtectedRoute.tsx`, `src/pages/Auth.tsx`.
