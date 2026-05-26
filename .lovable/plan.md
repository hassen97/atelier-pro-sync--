## What I found in the database

The 3 vault entries you created **do exist** in the database:

| email_id | customer | stored under user_id |
|---|---|---|
| Jfkrkdkei | Test | `26c3f824…` |
| Test | Hassen Bargougui | `26c3f824…` |
| Tzst | Test | `26c3f824…` |

But:
- The shop **coolstoresbz** has user_id **`bbb9af55…`** — **not** `26c3f824…`.
- `bbb9af55` is **not** a team member of `26c3f824`.
- `26c3f824` is a separate **super_admin** account (no profile row, but a shop owner role).

So the entries were saved under a different account than the one currently viewing the Coffre-fort page. The hook `useVaultEntries` filters by `effectiveUserId` and RLS also enforces `auth.uid() = user_id` (or team membership), so on the `coolstoresbz` session the result is correctly empty.

The most likely cause: the entries were created **while impersonating** account `26c3f824` from the platform admin dashboard (impersonation sets `effectiveUserId` to the impersonated user). After leaving impersonation, the entries stay attached to `26c3f824` and are no longer visible from `coolstoresbz`.

## Plan

1. **Confirm with a small diagnostic** in `src/pages/Vault.tsx`: render a tiny dev-only debug line showing `auth.uid`, `effectiveUserId`, and the number of rows returned. This makes it instantly obvious which account the page is reading from.
2. Based on what the debug line shows, choose one of:
   - **(A) You actually want to view these entries from `coolstoresbz`** → re-create them while logged in (without impersonation) as `coolstoresbz`, OR move them with a one-shot SQL update reassigning `user_id` from `26c3f824` → `bbb9af55` (I'll prepare the migration once you confirm).
   - **(B) These were intentional test rows on the admin account** → log in to that account (or impersonate it again) to see them; no code change needed.
3. Remove the diagnostic line once resolved.

## Out of scope

- No changes to RLS, schema, or the create/update/delete logic — the data path is working correctly.
- No changes to impersonation behavior.

## Question for you

Can you confirm which account you were logged in as (and whether you were impersonating from the admin dashboard) when you created the 3 test entries? That tells me whether to (A) reassign the rows to `coolstoresbz` or (B) just point you to the right session.