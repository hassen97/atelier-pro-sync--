# Rollback to before the deep scan

## What's happening now
After the deep scan, the super admin login no longer redirects at all — it's **stuck on the loading screen**. This is a direct side effect of the last hardening change in `ProtectedRoute.tsx`:

```text
if (loading || ... || (adminError && !!user) || ...) { show loader }
```

The admin-role query is failing/erroring for your account, and because the guard now keeps the loader visible on `adminError`, you never leave "Chargement...". Before the deep scan this code didn't exist, so login worked.

## Recommended rollback: use History (safest, one click)
The cleanest way to get back to the exact state **before the deep scan** is the built-in History — no risk, no "undo code", and it restores every touched file at once (`useAdmin.ts`, `ProtectedRoute.tsx`, `Auth.tsx`, `useProfit.ts`, `usePresence.ts`, `vite.config.ts`, etc.).

Steps:
1. Open History (button below).
2. Find the version **just before** the "deep scan / db indexes" turn.
3. Click Restore on that version.

Everything after stays archived in chat and can be reapplied later if you ever want it.

```text
Before deep scan  ──►  [RESTORE HERE]  ──►  deep scan  ──►  admin hardening (broken)
```

## What rollback does and does not touch
- **Code**: fully reverted to the pre-deep-scan state. This removes the `adminError`-based loader trap, so the super admin login behaves as it did before.
- **Database indexes**: the indexes added during the deep scan are **not removed** by a code revert. That's fine — indexes only make reads faster, they never change data or behavior, and they are not what broke login. Leaving them in place is safe and recommended.
- **Data**: untouched. No customer, repair, sales, or session data is affected.

## Alternative: I revert only the 3 admin files for you
If you'd rather keep the other deep-scan improvements (chunking, PWA precache, profit-day fix) and only undo the part that broke admin login, I can instead restore just these to their pre-deep-scan versions:
- `src/hooks/useAdmin.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/pages/Auth.tsx`

Tell me which you prefer:
- **A)** Full rollback to before the deep scan (via History — recommended), or
- **B)** I surgically revert only the admin-login changes and keep the rest.

## Note on the live site
Code rollbacks only reach your live customers after a successful **Publish**. Once you've rolled back (or I revert the admin files), we should retry publishing so the working version goes live.

<presentation-actions>
<presentation-open-history>View History</presentation-open-history>
</presentation-actions>