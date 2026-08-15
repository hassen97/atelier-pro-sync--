# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

# RepairPro (atelier-pro-sync)

POS / inventory / repairs SaaS for phone-repair shops (Tunisia). React 18 SPA + Supabase (Postgres + Deno edge functions), built via Lovable. Pushing to `main` syncs back to Lovable.

## Commands

- `npm run dev` — dev server on port **8080** (not 5173). Bun also works (`bun.lock` is tracked alongside `package-lock.json`).
- `npm run build` — prod build; `npm run build:dev` — dev-mode build.
- `npm run lint` — ESLint (`@typescript-eslint/no-unused-vars` is off).
- `npm test` — Vitest (jsdom); `npm run test:watch`. Single file: `npx vitest run src/test/example.test.ts`; single test by name: `npx vitest run -t "<name pattern>"`.
- No typecheck script exists. TS is non-strict (`strict: false`, `noImplicitAny: false`). Use `npx tsc -b` to typecheck.

## Architecture

- `src/pages/` — route pages, all lazy-loaded via `lazyWithRetry` (stale-chunk reload guard).
- `src/hooks/` — one TanStack Query hook per domain (`useProducts`, `useRepairs`, ...). All data flows through these + the shared `supabase` client.
- `src/components/<domain>/` — feature components; `src/components/ui/` — shadcn components.
- Admin shell: `src/components/admin/AdminSidebar.tsx` exports the `AdminView` union (single source of truth — `AdminDashboard.tsx` imports it). Sidebar = nested categories with sub-items + a live "Sécurité" badge fed by `useSignupAttempts`.
- Security center: `AdminSecurityView` (landing) + `AdminSignupEventsView` + `AdminSignupAttemptsView`, all backed by `src/hooks/useAdminSecurity.ts` (attempts, events+realtime, notify toggles, purge).
- `src/integrations/supabase/types.ts` — **generated** (`supabase gen types`); never edit by hand. Use `Tables` / `TablesInsert` / `TablesUpdate` helper types.
- `supabase/migrations/*.sql` — chronological schema history. `supabase/functions/*` — Deno edge functions.

## Critical: tenant scoping

- Every business row carries `user_id` = the shop **owner's** auth id; RLS filters by `(select auth.uid())`.
- Team members (employees) must query with `useEffectiveUserId()` (`src/hooks/useTeam.ts`), which resolves to the owner id (or the id of a user being impersonated). NEVER filter data hooks by `user.id` — employees would get an empty shop.
- `team_members` is the source of truth for employees; a stray `super_admin` role row must not override active team membership.

## Auth & roles

- Users authenticate with a **username**, internally converted to `username@repairpro.local` (`src/contexts/AuthContext.tsx`). Real email is optional metadata. Auth has a resilient direct-REST fallback on network errors.
- `user_roles`: `super_admin` / `admin` / `manager` / `employee`. Platform admins are redirected to `/admin` by `ProtectedRoute`; shop owners live under `/dashboard`+.
- `allowed_pages` on `team_members` is a UX policy only — the real boundary is RLS.

## Data-layer conventions

- Server-side pagination with `.range()`; `useAllProducts` batches 1000 rows to bypass Supabase's default 1000-row limit.
- Invalidate by prefix keys: `["products"]`, `["low-stock-alerts"]`, `["session-totals"]`, `["dashboard-stats"]`, `["repairs"]`. Query keys embed `effectiveUserId`.
- `useSales()` (`src/hooks/useSales.ts`) is legacy — it fetches the whole sales history + nested items unbounded. Live pages use the narrow `useAllUnpaidSales()` (batched, unpaid-only) behind `CustomerDebts`; invalidations: `["sales-unpaid-all"]`, `["repairs-unpaid-all"]`. Prefer paginated/aggregate hooks for perf-sensitive queries.

## PWA / build gotchas

- Single service worker `src/sw.ts` (vite-plugin-pwa `injectManifest`); registration logic in `src/lib/swUpdate.ts`. The SW never runs in Lovable preview / iframe / localhost.
- Do NOT re-split React chunks in `vite.config.ts` (`manualChunks`) — splitting react/react-dom away from consumers crashes prod with `'forwardRef'` undefined. The existing `vendor` / `vendor-three` split is deliberate; only `vendor-three` may be touched.
- Heavy libs (xlsx, jspdf, three, barcode, charts, receiptPdf) are lazy-loaded and excluded from precache; cached on use by runtime routes in `src/sw.ts`.

## i18n

- i18next, fallback **fr** (`SUPPORTED_LANGUAGES = ["fr","ar","en"]`). Arabic is RTL: `applyHtmlDir` sets `lang`/`dir` on `<html>`; use Tailwind `rtl:` / `ltr:` variants, no plugin.

## Edge functions

- Deno. Some functions import JSX email templates from `_shared/email-templates/*.tsx`; only `auth-email-hook` and `process-email-queue` have their own `deno.json`.
- `supabase/config.toml` lists every function in the dir (reconciled 2026-08-15 — the bogus `mcp` entry was removed); `verify_jwt = false` is the convention since functions self-guard with `auth.uid()`/role checks. Secrets are per-function env vars (e.g. `HCAPTCHA_SECRET_KEY`), set in the dashboard.
- `signup_attempts` is write-only (deny-all RLS) except a new platform-admin SELECT policy + `purge_signup_attempts(keep_hours)` SECURITY DEFINER RPC (`20260815000000_...`). The Security center depends on that migration being applied.

## Tests

- Vitest + jsdom + Testing Library; `src/test/setup.ts` mocks `matchMedia`. Only an example test exists — assume no coverage.

## Other

- `.env` is committed and contains only publishable `VITE_*` keys — never add secrets to it.
- `vercel.json` SPA-rewrites all paths to `index.html`.
- `.lovable/plan/*.md` holds prior audit/fix plans (POS perf, RLS hardening, white-screen fixes) — read before touching those areas.
- `/db-restore` is a temporary Live-DB restore bridge to be removed. Public repair tracking (`/track/:token`) works via the SECURITY DEFINER `get_repair_by_token`, not an anon policy.