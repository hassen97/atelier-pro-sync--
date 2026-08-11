# Fix: /db-restore bounces platform admins to the admin dashboard

## What's happening

The route `/db-restore` exists and is wrapped in the auth guard, so login works — but the guard contains an allow-list of paths a platform admin may visit:

```text
adminAllowedPaths = ["/admin"]
```

Any other path, `/db-restore` included, is immediately redirected to `/admin`. That is exactly the behaviour you saw: log in as platform admin, land on the admin dashboard, nothing else happens.

Verified in `src/components/auth/ProtectedRoute.tsx` (admin redirect block) and `src/App.tsx` (the `/db-restore` route is registered inside `ProtectedRoute`).

## The fix

Add `/db-restore` to the platform-admin allow-list in `src/components/auth/ProtectedRoute.tsx` so the restore bridge is reachable while signed in as platform admin. One-line change, no effect on any other route: non-admins still get bounced by the existing rules, and the page itself still requires the restore secret before it can do anything.

Since this route is the temporary restore bridge, the allow-list entry is removed together with the page when we delete the bridge after the Live import.

## Verification before handing back

Drive the preview in a headless browser: sign in as the platform admin, navigate to `/db-restore`, and confirm the page renders with its "Connected backend" line and the secret field instead of redirecting to `/admin`. I'll also confirm `/admin` and a normal shop route are unchanged.

## Then: continue the restore

Once the page opens, the two remaining steps are the ones from before:

1. Preview app (Test backend) → paste the restore secret → *Export this backend* → copy the returned payload URL.
2. Published app (Live backend) at `/db-restore` → paste the secret plus that payload URL → *Replace this backend with the payload*.

If the earlier payload URL has expired (they last 3 days), re-run the export in step 1 to get a fresh one.
