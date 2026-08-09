# RLS hardening + single service worker

## What I verified first

- 65 of 172 policies in the database still call `auth.uid()` directly (per-row evaluation). The rest were already converted to `(select auth.uid())` in the earlier performance pass.
- The `anon` role has **zero** table privileges in the public schema, so there is no anon key data leak on core tables today. No anon-facing policy exists on `repairs`, `products`, `customers`, `sales`, `shop_settings`, `profiles`, `expenses`, `invoices`, `suppliers`.
- `storage.objects` already has 12 folder-scoped policies (shop logos, repair photos, supplier proofs, payment proofs), all restricted to `authenticated`.
- The project has `vite-plugin-pwa` and `workbox-window` but **not** `workbox-precaching`, which the `injectManifest` strategy requires.
- `index.html` contains no manual service-worker registration; the only registrar is `src/lib/swUpdate.ts`, and `InstallAppButton.tsx` uses only `beforeinstallprompt` / `appinstalled` — neither touches `sw-custom.js`.

## Task 1 — RLS migration

One migration that rewrites the remaining 65 policies so every `auth.uid()` becomes `(select auth.uid())`, keeping each policy's existing logic byte-for-byte otherwise (owner match, `is_team_member(...)`, `has_role(..., 'platform_admin')`, conversation/participant checks, etc.).

Also in the same migration:

- Pin every rewritten policy to `TO authenticated` (or `TO authenticated, service_role` where edge functions write), replacing the implicit `public` role. This makes multi-tenant isolation explicit rather than relying only on the absent anon grants.
- Re-assert `REVOKE ALL ... FROM anon` on the core business tables so a future migration can't silently re-expose them.
- Re-create the four `storage.objects` policy groups with the canonical folder guard `(storage.foldername(name))[1] = (select auth.uid())::text` for owner-scoped buckets, and the owner-or-team variant for `repair-photos` / `supplier-proofs`. Dropped and recreated in the same statement block so there is no window with no policy.

Public tracking stays intact: repair tracking already goes through the `get_repair_by_token` security-definer function, not an anon policy, so nothing there changes.

## Task 2 — Unify the service worker

- Add the `workbox-precaching` dependency.
- Create `src/sw.ts`: `precacheAndRoute(self.__WB_MANIFEST)`, the existing `push` and `notificationclick` listeners moved verbatim from `public/sw-custom.js`, plus `NetworkFirst` navigation routing, `StaleWhileRevalidate` for the heavy lazy chunks, `cleanupOutdatedCaches()`, `skipWaiting` + `clientsClaim`, and a `SKIP_WAITING` message handler.
- Delete `public/sw-custom.js`.
- `vite.config.ts`: switch to `strategies: "injectManifest"`, `srcDir: "src"`, `filename: "sw.ts"`, move `globPatterns` / `globIgnores` / `maximumFileSizeToCacheInBytes` under `injectManifest`, and drop the `workbox` block (which is ignored by this strategy).
- `src/lib/swUpdate.ts` keeps its preview/iframe guard, its single `reloading` flag and its `controllerchange` handler — the loop came from two workers claiming clients, and after this there is exactly one `/sw.js`. The "Nouvelle version disponible" toast and manual `checkForUpdate` / `applyUpdateNow` paths stay unchanged.

## Task 3 — Verification before I finish

- Typecheck the new `src/sw.ts` against the webworker lib and confirm `vite build` emits a single `dist/sw.js` containing both the precache manifest and the push listeners.
- Grep the repo for any remaining `sw-custom` reference.
- Re-query `pg_policies` after the migration to confirm zero policies still contain a bare `auth.uid()`, and confirm `anon` still has no grants.
- Load the app in a headless browser to confirm no console errors and that install/update UI still renders.

## Notes

The migration is DDL-only (policy drops/creates) — no data is touched, and it is safe to re-run.
