## Part 1 — Permanently remove the DB restore tool

Remove every entry point so the page and function can never be reached again.

**Frontend**
- Delete `src/pages/DbRestore.tsx`.
- In `src/App.tsx`: remove the lazy import `const DbRestore = lazyWithRetry(() => import("./pages/DbRestore"));` (line 83) and the entire `/db-restore` `<Route>` block plus its "TEMPORARY one-time DB restore tool" comment (lines ~139–144).
- In `src/components/auth/ProtectedRoute.tsx`: change `const adminAllowedPaths = ["/admin", "/db-restore"];` back to `["/admin"]` and update the nearby comment.

**Backend / edge function**
- Delete the folder `supabase/functions/restore-live-db/` (its `index.ts`).
- In `supabase/config.toml`: remove the `[functions.restore-live-db]` block (`verify_jwt = false`).
- Undeploy the live function via the delete-edge-functions tool for `restore-live-db`, so the endpoint stops serving even though it was public (`verify_jwt = false`).

After this, `/db-restore` 404s inside the app and the function URL returns not-found.

## Part 2 — Database & storage analysis (findings)

The database is **not** large: **80 MB total**, and storage buckets hold only **~12.7 MB**. There is no bloat and dead-row counts are ~0, so no urgent cleanup is needed. Summary of the biggest consumers:

```text
Table                  Total     Rows     Notes
activity_log           3.4 MB    13,478   append-only audit log (biggest table)
products               1.6 MB     4,942   live data — keep
repairs                1.0 MB     1,695   live data — keep
repair_status_history  536 kB     3,080   live data — keep

Bucket           Files  Size
shop-logos       11     7.5 MB
payment-proofs   10     5.2 MB
```

## Part 3 — Safe, low-risk cleanup (optional, opt-in)

Only two things are genuinely safe to remove. Both are reversible in impact (no live feature depends on them):

1. **Delete 3 orphaned logo files** — not referenced by any `shop_settings.logo_url` (leftover originals replaced by optimized versions). Frees ~1.6 MB:
   - `shop-logos/c8a47d37-ecc5-44ee-8b1e-3447925f554b/logo.PNG`
   - `shop-logos/26c3f824-a3a7-44f4-8664-9c7d15116e9a/logo.png`
   - `shop-logos/8b499584-fc8f-4e25-8e8e-f58fb9d57c69/logo.jpg`
   Done via a storage delete (`DELETE FROM storage.objects WHERE ...`).

2. **Optionally prune old `activity_log` rows** older than 90 days (~7,000 rows, frees ~1.5 MB). This is audit history only — no business logic reads it — but it is a permanent delete, so it's opt-in. Recent 90 days are kept for accountability.

**What to keep (do NOT touch):** all business tables (products, repairs, customers, sales, payments, etc.), all `payment-proofs` (every file maps to a valid owner — 0 orphans), and all referenced shop logos.

**Note (not cleanup):** many `shop_settings.logo_url` values still point to the previous project's domain (`uvvpgxjbqrvzhcunkpag.supabase.co`) from the restore, not this project. Those images won't load. That's a data-consistency issue separate from storage cleanup — flagging it, not fixing it here.

## Confirmation needed before building

I'll always do Part 1 (removal) and Part 3 step 1 (delete the 3 orphaned logos). For Part 3 step 2 (prune `activity_log`), please confirm whether you want it — and if so, keep the last 90 days or a different window.
