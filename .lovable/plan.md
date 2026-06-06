## Root cause

Both `auth.uid` and `effectiveUserId` correctly equal `26c3f824…` (the same `user_id` stored on the 3 vault rows), so RLS is **not** the blocker. The real problem is the embedded select in `useVaultEntries`:

```ts
.select("…, customers:customer_id(id, name, phone)")
```

The `customer_vault` table has **no foreign key** to `customers` (confirmed in the schema dump — "No foreign keys for the table customer_vault"). PostgREST therefore can't resolve the embed and returns an error; the hook throws, React Query's `data` is undefined, the page defaults to `[]` and shows "Aucune entrée".

## Plan

1. **Add the missing FK** via migration:
   ```sql
   ALTER TABLE public.customer_vault
     ADD CONSTRAINT customer_vault_customer_id_fkey
     FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
   ```
   Once present, PostgREST resolves the `customers:customer_id(...)` embed and the 3 existing rows appear immediately.

2. **Remove the temporary debug block** from `src/pages/Vault.tsx` (and the now-unused `useAuth` / `useEffectiveUserId` / `useVaultEntries` imports there).

## Out of scope
- No changes to RLS, the hook logic, the dialog, the table component, or the search input — all of those are working correctly.
- No data migration: the existing 3 rows stay as-is and become visible automatically.