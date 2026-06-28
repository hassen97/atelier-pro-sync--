# Fix super-admin login (multi-role detection bug)

## Root cause (confirmed in the database)
`useIsPlatformAdmin()` and the login role check both assume each user has exactly **one** row in `user_roles`:

```ts
.from("user_roles").select("role").eq("user_id", user.id).single()
```

But the super-admin `hassen` (`855c224e-…`) has **two** rows in the test/preview backend:

```text
user_roles for hassen:
  platform_admin
  super_admin
```

`.single()` throws "multiple rows returned" → `data` is null → `isPlatformAdmin` becomes `false` → `ProtectedRoute` redirects to `/dashboard` (shop owner). The earlier `.maybeSingle()` + `throw` version had the same multi-row failure, which is why it got stuck on the loader. In production hassen has only `platform_admin`, which is why it behaved differently there.

A separate admin login page would still call the same broken query, so the real fix is to make role detection **multi-role aware**.

## Fix

### 1. `src/hooks/useAdmin.ts` — `useIsPlatformAdmin`
Stop assuming one role row. Query specifically for the admin role so the number of other roles is irrelevant:

```ts
const { data } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "platform_admin")
  .maybeSingle();
return !!data;
```

`maybeSingle()` is safe here because filtering by `role` returns at most one row. This works whether the user has 1 role or several.

### 2. `src/pages/Auth.tsx` — login role/tab matching
Replace the `.single()` lookup (line ~144) with a fetch of **all** the user's roles and derive an effective role from the set, so multi-role accounts don't break:

```ts
const { data: roles } = await supabase
  .from("user_roles").select("role").eq("user_id", userId);
const roleSet = new Set((roles ?? []).map(r => r.role));
const isPlatformAdmin = roleSet.has("platform_admin");
const isOwner = roleSet.has("super_admin") || roleSet.has("admin");
const isEmployee = roleSet.has("employee") || roleSet.has("manager");
```

- If `isPlatformAdmin` → allow login regardless of selected tab; `ProtectedRoute` then routes to `/admin`.
- Keep the existing employee/owner tab-mismatch guards, but base them on `isOwner` / `isEmployee` (a platform admin bypasses these checks).

### 3. No change needed in `ProtectedRoute.tsx`
Once `useIsPlatformAdmin` returns `true` again, the existing redirect (`isPlatformAdmin && pathname !== "/admin" → /admin`) sends you to the admin dashboard correctly.

## About the suggested separate admin login page
Not required to fix this, and it adds a second auth surface to maintain. The multi-role fix restores correct routing from the single existing login. If you still want a dedicated `/admin-login` for convenience/branding afterward, we can add it as a follow-up — but it's optional, not the fix.

## Optional data cleanup (separate step, with your OK)
The duplicate `super_admin` row on `hassen` is harmless once the code is multi-role aware, but if you want a clean state I can remove the extra `super_admin` row from platform-admin accounts via an `insert`/`delete` data operation. I'll only do this if you confirm.

## Verification
1. Type-check passes.
2. Log in as `hassen` in the preview → lands on `/admin`, not the shop dashboard.
3. Log in as a normal shop owner → still lands on `/dashboard`.
4. Publish so the fix reaches the live site.