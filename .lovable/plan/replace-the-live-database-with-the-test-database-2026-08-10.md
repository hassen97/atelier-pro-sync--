# Replace the Live database with the Test database

## What we verified first

- Schemas are already identical in both environments: 61 tables, 575 columns, 172 access policies, 33 functions. Nothing to migrate structurally.
- Live: 337 accounts / 337 shops, 587 repairs, 3 728 products, 128 sales — no new signup since April 2026, last login June 29.
- Test: 55 accounts / 55 shops, 2 332 repairs, 5 238 products, 1 627 sales, 139 subscriptions — active last night.

## What this does (read carefully)

Live's 337 accounts and all their data are **permanently deleted** and replaced by Test's 55 accounts and data, including login emails and password hashes so people sign in with the same credentials they use today. This cannot be undone. Storage files (logos, payment proofs, repair photos) are copied too.

## How it will work

Normal tooling can only write to Test, so the copy needs a temporary admin-only bridge — the same pattern used for the earlier restore, removed again immediately afterwards.

1. **Export Test** — dump every public table (in dependency order) plus the login records into a single gzipped JSON payload, and list the storage files to copy.
2. **Temporary bridge** — recreate an edge function `restore-live-db` (platform-admin JWT + one-time shared secret required) and a hidden `/db-restore` admin page. The function runs inside a transaction with `session_replication_role = replica` so triggers and foreign keys don't fight the load order.
3. **Publish** — the function and page only exist in Live once you publish, so publishing is a required step before the restore can run.
4. **Run the restore** from `/db-restore`, in this order:
   - truncate all public tables and clear Live's login records,
   - insert login records (id, email, password hash, confirmation timestamps, metadata) and their identities,
   - insert every public table's rows,
   - re-sync sequences, re-enable normal replication role.
5. **Copy storage files** — re-upload the Test bucket objects to the matching Live buckets and paths.
6. **Verify** — compare row counts table-by-table between Test and Live, spot-check one shop's repairs/sales/products, and confirm one real login works against Live.
7. **Remove the bridge** — delete the edge function, the `/db-restore` page, the payload asset and the one-time secret, then publish again so nothing admin-privileged stays deployed.

## Before I start, you should know

- Anyone currently signed in to the Live app is signed out and any Live-only data they created since April is gone.
- The 55 Test accounts include test/demo shops; they will exist in Live. I can exclude specific ones if you list them.
- Best run during a quiet window; the Live app will error for a few minutes mid-restore.

## Technical notes

- Payload: gzipped JSON, table-keyed arrays, inserted in FK-safe order with `ON CONFLICT DO NOTHING` disabled (tables are empty after truncate).
- Live writes go through the edge function's direct Postgres connection (`SUPABASE_DB_URL`) rather than the Data API, so RLS and grants are bypassed cleanly.
- Login records: `auth.users` + `auth.identities` copied field-for-field including `encrypted_password`; no password resets needed.
- Sequence fix-up for `repairs.ticket_number` and any serial columns after load.
- Auth config (providers, email templates, secrets) is unaffected — only rows are replaced.
