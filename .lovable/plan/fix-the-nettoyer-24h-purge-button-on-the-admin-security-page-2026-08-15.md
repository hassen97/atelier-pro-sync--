# Fix the "Nettoyer +24h" purge button on the admin Security page

## What's wrong

The button calls a database function `purge_signup_attempts(keep_hours)`. I checked the live backend: **that function does not exist**, so the call fails immediately with a "function not found" error and nothing is purged.

The same missing piece also affects reading: the platform-admin read policy on the signup attempts table is missing too — only a deny-all policy exists, so the attempts list can silently show nothing for admins.

Both were introduced in a migration that was written but never applied to this backend.

## Fix

One migration that re-creates the two missing pieces, written to be safe to re-run:

1. `public.purge_signup_attempts(keep_hours integer default 24)` — SECURITY DEFINER, `search_path = public`, rejects callers who are not `platform_admin`, deletes attempts older than the window and returns the deleted row count. Execute granted to `authenticated`, revoked from `PUBLIC`.
2. Platform-admin `SELECT` policy on `public.signup_attempts` (created only if absent), plus the matching `GRANT SELECT ... TO authenticated` so the Data API can reach it. The existing deny-all policy stays untouched for everyone else.

## Frontend touch-up

`usePurgeSignupAttempts` in `src/hooks/useAdminSecurity.ts` currently reports a raw error and hardcodes "24h" in the success toast. Small polish: surface the real backend message, and use the actual `keepHours` value in the toast. No behaviour change beyond clearer feedback.

## Verification

- Confirm the function exists and the policy is present after the migration.
- Call the purge as a platform admin and confirm it returns a count instead of erroring (currently 0 rows are older than 24h, so expect `0` with no error).
- Confirm a non-admin call is rejected.
