---
kind: configuration_system
name: RepairPro Configuration System — Env Vars, Supabase Config, Feature Flags & Per-Tenant Settings
category: configuration_system
scope:
    - '**'
source_files:
    - .env
    - vite.config.ts
    - src/integrations/supabase/client.ts
    - src/integrations/supabase/previewAuthStorage.ts
    - supabase/config.toml
    - src/hooks/useShopSettings.ts
    - src/contexts/ShopSettingsContext.tsx
    - src/hooks/useFeatureFlags.ts
    - vercel.json
---

## Overview

RepairPro uses a layered configuration approach across three scopes: **build-time** (Vite env vars), **runtime platform** (Supabase project config), and **per-tenant runtime** (database-stored shop settings and feature flags). There is no centralized config loader; each layer is consumed directly where needed.

## Build-time Configuration (Vite + .env)

- Environment variables are declared in the root `.env` file using the Vite convention `VITE_*`, which makes them available at compile time via `import.meta.env`:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`
- These are consumed exclusively by the auto-generated Supabase client at `src/integrations/supabase/client.ts`, which calls `createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ...)`.
- A build stamp `__APP_VERSION__` is injected via `define` in `vite.config.ts` (ISO timestamp) and used by the update-banner UI to label new-version notifications.
- Vite also defines an alias `@` → `./src` and ships a PWA via `vite-plugin-pwa` with `injectManifest` strategy pointing at `src/sw.ts`. The PWA manifest is disabled in favor of `/public/manifest.json`.
- No separate `.env.development` / `.env.production` files are present; all env is read from the single `.env`.

## Platform / Backend Configuration (Supabase)

- `supabase/config.toml` declares the project ID (`project_id = "rgikflkocotkljbajzrb"`) and per-function JWT verification policy. Every function under `[functions.*]` has `verify_jwt = false` except `process-email-queue`, which sets `verify_jwt = true`. This is the authoritative backend security posture for Edge Functions.
- Database schema and behavior are versioned as SQL migrations under `supabase/migrations/` (60+ dated files). New features or schema changes are applied by adding a migration rather than editing live state.
- Email templates live under `supabase/functions/_shared/email-templates/*.tsx` and notification templates under `supabase/functions/_shared/notification-templates.ts`; they are bundled into Edge Functions rather than fetched at runtime.

## Runtime Tenant Configuration (Database-backed)

Per-shop (per-user) configuration is not held in env files but persisted in the `shop_settings` table and surfaced through the React hook `useShopSettings` (`src/hooks/useShopSettings.ts`). The hook:
- Loads settings from `shop_settings` filtered by `user_id` (effective user id, accounting for impersonation).
- Merges any missing fields against a `defaultSettings` object defined in the same file (e.g. default currency `TND`, country `TN`, tax rate `19`, language `fr`, brand color `blue`, receipt mode `detailed`, warranty days `30`, loyalty defaults).
- Exposes `settings`, `loading`, `saving`, `saveSettings(newSettings)`, and `refetch()` via a React Context provider (`ShopSettingsProvider` in `src/contexts/ShopSettingsContext.tsx`).
- Enforces ownership: only the shop owner (or a platform admin impersonating) can write back to `shop_settings`; employees attempting to save get a toast error and the mutation is rejected.

## Feature Flags

Feature flags are a first-class runtime configuration surface:
- Flag definitions and plan-to-flag assignments are retrieved via `useFeatureFlags` (`src/hooks/useFeatureFlags.ts`), which calls the Supabase Edge Function `admin-manage-users` with `{ action: "list-feature-flags" }`.
- Toggling a flag goes through `useToggleFeatureFlag`, invoking the same function with `{ action: "toggle-feature-flag", planId, featureFlagId, enabled }` and invalidates the React Query cache.
- An admin UI component `AdminFeatureFlagsView` exposes these controls in the admin dashboard.
- Flags are scoped to subscription plans (`plan_id` ↔ `feature_flag_id` mapping), enabling per-plan rollout.

## Auth Storage Configuration

The Supabase client is configured with a custom auth storage returned by `brokeredPreviewStorage()` (`src/integrations/supabase/previewAuthStorage.ts`):
- On Lovable preview hosts (`lovableproject.com`, `lovableproject-dev.com`, `lovable.app`, `gpt-eng.com`, `gptengineer.run`) running inside a frame, it brokers session tokens to the parent editor via `postMessage`, validated against trusted origins (`lovable.dev`, `gptengineer.app`, `localhost:3000`).
- Outside previews it falls back to `localStorage`.
- Session persistence and auto-refresh are enabled in the Supabase client options.

## Deployment Configuration

- `vercel.json` rewrites all routes to `/index.html`, making it a SPA deploy target.
- CI is driven by `.github/workflows/ci.yml` (not inspected here).
- The PWA service worker is authored in `src/sw.ts` and registered manually from `main.tsx` with an iframe guard; dev-mode SW registration is disabled in `vite.config.ts`.

## Conventions Observed

| Area | Convention | Evidence |
|---|---|---|
| Env vars | All frontend secrets use the `VITE_` prefix so Vite injects them at build time | `.env` + `src/integrations/supabase/client.ts` |
| Supabase client | Single source of truth; never call `createClient` elsewhere | Generated `client.ts` is the only import site |
| Backend functions | JWT verification toggled per function in `supabase/config.toml` | `[functions.*] verify_jwt = false/true` blocks |
| Schema evolution | Add a new SQL migration file per change | `supabase/migrations/` contains dated, UUID-named files |
| Tenant settings | Default values co-located with the hook that reads them | `defaultSettings` in `useShopSettings.ts` |
| Feature flags | Admin-only, plan-scoped, fetched via Edge Function | `useFeatureFlags` / `useToggleFeatureFlag` |
| Preview auth | Brokered via postMessage only on known preview zones | `PREVIEW_ZONES` whitelist in `previewAuthStorage.ts` |

## Constraints

- Secrets must not be committed; the repo includes a `.env` with placeholder credentials — treat it as a template and keep real values out of version control.
- Only `process-email-queue` among Edge Functions requires JWT verification; all others run unauthenticated, so callers must rely on RLS and business logic for authorization.
- Shop settings writes are gated server-side by the hook's ownership check before touching the database.