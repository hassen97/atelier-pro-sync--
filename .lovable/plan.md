# Fix: Login button stuck loading forever

## What's happening

When you click **Login**, the button spins forever and never shows an error or logs you in.

I reproduced it and traced the cause. The sign-in code first tries the standard auth client call. That call has **no timeout** — so if the auth server is slow or unresponsive, the request just hangs:

- It never succeeds → you're not logged in.
- It never fails → no error message is shown.
- The "stop loading" code never runs → the spinner stays forever.

There is already a resilient backup path (a direct request with timeouts + retries), but today it is **never reached**, because the code only switches to it when the first call *errors* — and a hung call neither succeeds nor errors.

Note: the database itself is healthy. The problem is specifically that the app waits indefinitely on the auth call instead of giving up and either retrying or showing a clear message. (Separately, the auth service looked unresponsive when I probed it; this fix ensures the app degrades gracefully and tells the user, instead of hanging, whether or not the service is fully healthy at any given moment.)

## The fix

```text
Goal: login must ALWAYS end in one of: success, or a clear error message.
Never an infinite spinner.
```

### 1. Add a timeout to the primary auth calls (`src/contexts/AuthContext.tsx`)
- Wrap the primary `supabase.auth.signInWithPassword(...)` call in a timeout race (~12s).
- If it doesn't settle in time, treat it as a network error so the code falls through to the **existing** timed + retried REST fallback path (which already handles slow networks correctly).
- Apply the same timeout guard to the primary `supabase.auth.signUp(...)` call so registration can't hang either.

### 2. Guarantee a final error instead of a hang
- If both the primary call and the REST fallback fail/timeout, return a clear French message (e.g. "Connexion au serveur impossible. Vérifiez votre connexion et réessayez.") so the button stops loading and the user can retry.

### 3. Defensive reset in the login handler (`src/pages/Auth.tsx`)
- Ensure `setLoading(false)` always runs even on unexpected errors (wrap the post-sign-in logic so the spinner can never get stuck if a follow-up query is slow).

## What this changes for you
- Login will either succeed, or fail fast with a readable message and let you retry — no more endless spinner.
- The app automatically uses the resilient retry path when the auth server is slow (matching the existing mobile-network resilience design).

## Technical notes
- Files touched: `src/contexts/AuthContext.tsx` (timeout race around primary `signInWithPassword` / `signUp`; ensure fallback yields an error), `src/pages/Auth.tsx` (guard `loading` state reset).
- No database, schema, or auth-provider changes.
- If the auth service is genuinely down at a given moment, login still can't complete until it recovers — but the app will now say so clearly instead of hanging. I'll re-verify auth-server reachability after the change.
