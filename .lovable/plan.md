# Replace Live database with the Test dump

Goal: make **live/production** an exact copy of the **test** database from your uploaded `pg_dump` — all business data, all auth accounts, and the 21 storage files. This is **destructive and irreversible for live**.

## ⚠️ Before anything: back up live
Live currently holds real data (337 users, 587 repairs, 431 customers, 3,728 products, 128 sales) that will be **permanently deleted**. First run **Cloud → Advanced settings → Export data** with **Live/Production selected** and keep that zip. We do not proceed until you confirm you have it.

## Why an edge function
- Lovable tools (migration/insert/SQL editor) write to **test only**; the SQL editor also can't handle a 30k-row `COPY`-format dump.
- An edge function invoked on the **published** app connects to the **live** database directly, so it's the only reliable way to load this data into live.

## Phases

### Phase 1 — Schema parity (prerequisite)
The dump's rows assume live has the **same schema as test**. Because the earlier `ticket_number` publish failed, live schema may be behind. Since we're wiping live anyway, we clear the blocker and publish so live schema == test schema:
1. On live, empty the conflicting rows (we're deleting them regardless): truncate `repairs` (and any other tables the pending migrations touch).
2. **Publish** so all pending migrations apply cleanly to live.
3. Confirm live schema now matches test.

### Phase 2 — Build the restore payload (sandbox, one-time)
A script converts the dump into an executable payload:
- Parse each `COPY ... FROM stdin` block and convert to batched multi-row `INSERT` statements, correctly decoding pg_dump escapes (`\t \n \r \\ \N`→NULL).
- Wrap the whole thing in one transaction:
  - `SET session_replication_role = replica;` (disables triggers + FK checks during load so `handle_new_user`, ordering, etc. don't interfere)
  - `TRUNCATE` every target table (all 56 `public` + the 16 loaded `auth` tables) `RESTART IDENTITY CASCADE` — we only truncate tables we reload, never `auth.sessions`, `auth.refresh_tokens`, `auth.schema_migrations`, etc.
  - all `INSERT` batches
  - `SELECT setval('auth.refresh_tokens_id_seq', 10805, true);`
  - reset `session_replication_role`, then `COMMIT`
- Because it's a single transaction, **any failure rolls back and live is left untouched** until a fully successful run.
- gzip the SQL and upload it as a Lovable asset (stable public URL the function can fetch at runtime).
- Build a storage manifest: upload the 21 export files as assets and record `{bucket, objectPath, url}` for each.

### Phase 3 — The restore edge function
`restore-live-db`:
- Requires a one-time `RESTORE_SECRET` header (added via secret), rejects otherwise.
- Connects with the internal DB URL (same pattern as the existing `admin-db-maintenance` function).
- Fetches the gzipped SQL, decompresses, executes the transaction.
- Then reads the storage manifest and, using the service role, re-uploads each file into the matching live bucket at its original path (`upsert`), so existing `logo_url` / `proof_url` values keep resolving. Buckets already exist in live from schema sync.
- Returns a JSON summary (rows loaded per table, files restored).

### Phase 4 — Run against live, then clean up
1. Publish so the function + secret exist in the **live** environment.
2. Invoke `restore-live-db` once against the **production** URL with the secret.
3. Verify live counts now equal the dump (369 users, 1695 repairs, 4942 products, 1449 customers, 633 sales) and spot-check a logo/proof image loads.
4. **Delete** the function, the `RESTORE_SECRET`, and the temporary restore assets so this can't run again.

## Risks / notes
- **Irreversible** for live once it commits successfully — hence the Phase 0 backup.
- Replacing production **auth** means anyone who signed up on live but isn't in the dump loses their account, and everyone must **log in again** (active sessions are dropped). Passwords from the dump continue to work.
- `repair-photos` and `supplier-proofs` buckets have **no files** in the export, so those stay empty.
- The dump was taken 2026-07-03; any activity on test after that isn't included.
- If the ~30k-row transaction approaches the edge-function time limit, the loader falls back to running per-table in sequence (still wrapped so live isn't left half-populated).

## Confirmations I need before building
1. You have (or will take) the **live backup** in Phase 0.
2. You accept that **all current live data and any live-only accounts are permanently deleted**.
