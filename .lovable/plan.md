## Problem found

The super-admin account is getting stuck because parts of the app still assume a user has only one role row.

Two concrete blockers are visible:

1. `useIsOwner()` in `src/hooks/useTeam.ts` uses `.maybeSingle()` without filtering by role. For the super-admin account that has both `platform_admin` and `super_admin`, the backend returns `PGRST116` / “multiple rows returned”.
2. The `admin-manage-users` edge function checks the caller role with `.single()`, so the same multi-role account is rejected with `403 Forbidden`. The admin page then waits/loads because core admin requests fail.

## Fix plan

1. **Make role checks multi-role safe**
   - Update `useIsOwner()` to query specifically for `role = 'super_admin'`.
   - Add short caching (`staleTime`) so this role check is not refetched constantly while navigating.
   - Ensure query errors do not keep the UI stuck indefinitely.

2. **Fix the admin edge function authorization**
   - In `supabase/functions/admin-manage-users/index.ts`, replace the `.single()` caller-role lookup with a filtered `role = 'platform_admin'` lookup using `.maybeSingle()`.
   - This will allow platform admins even when they also have another role.
   - Keep the security rule strict: only `platform_admin` can access this function.

3. **Prevent normal shop-owner guards from delaying admin users**
   - Adjust `ProtectedRoute.tsx` so platform admins are redirected to `/admin` before waiting on owner/team/onboarding checks that are only relevant to shop-owner routes.
   - This avoids unnecessary queries and prevents a broken shop-owner role check from blocking the admin dashboard.

4. **Optimize admin dashboard startup performance**
   - Stop loading all heavy admin overview queries at once when the shell first opens where possible.
   - Add `retry: false` or low retry counts for admin queries that fail with `403`, so the UI does not repeatedly hammer the backend while stuck.
   - Keep existing `staleTime`/`refetchOnWindowFocus: false` patterns.

5. **Validate**
   - Run a type-check.
   - Verify in preview that super-admin reaches `/admin` instead of staying on “Chargement du centre de commande...” or redirecting to `/dashboard`.
   - Confirm admin API calls no longer return `403 Forbidden` for the platform-admin user.

## Expected result

The super-admin login should open the admin dashboard reliably, even if the account has multiple roles, and the admin page should make fewer unnecessary role/onboarding requests during startup.