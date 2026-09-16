---
kind: build_system
name: Vite + Supabase Monorepo Build & CI Pipeline
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - vite.config.ts
    - vitest.config.ts
    - eslint.config.js
    - tsconfig.app.json
    - .github/workflows/ci.yml
    - vercel.json
    - src/sw.ts
    - supabase/config.toml
---

## Overview

RepairPro is built as a Vite-based React SPA with a Supabase backend (Edge Functions, SQL migrations) co-located in the same repository. There are no Makefiles or Dockerfiles; the build system is entirely npm/Vite-driven and deploys to Vercel for the frontend and Supabase for the backend.

## Frontend Build (Vite)

- **Build tool**: Vite 5 with `@vitejs/plugin-react-swc` (SWC-based React transform).
- **Entry / output**: Single-page app built via `vite build`; production artifacts go to `dist/` (ignored by ESLint). The dev server runs on port `8080` with HMR overlay disabled.
- **Scripts** (`package.json`):
  - `npm run dev` — development server.
  - `npm run build` — production build.
  - `npm run build:dev` — builds with `--mode development`.
  - `npm run preview` — serves the built output locally.
  - `npm run lint` — ESLint over all TS/TSX.
  - `npm run typecheck` — `tsc -b` across project references.
  - `npm run test` / `test:watch` — Vitest.
- **TypeScript**: `tsconfig.app.json` targets ES2020, uses `moduleDetection: force`, `moduleResolution: bundler`, `noEmit: true` (Vite emits), path alias `@/* → ./src/*`. Strict mode is intentionally off (`strict: false`) and `any` is allowed because generated/edge code is pervasive.
- **PWA**: `vite-plugin-pwa` configured in `injectManifest` mode using a single custom worker at `src/sw.ts`. Precache excludes heavy lazy chunks (`xlsx`, `jspdf`, `html2canvas`, `purify.es`, `JsBarcode`, chart libs, `receiptPdf`) so they are cached on first use instead of bloating the initial shell. The SW handles precaching, NetworkFirst HTML navigation, StaleWhileRevalidate for heavy assets, web push notifications, and immediate activation (`skipWaiting` + `clientsClaim`).
- **Chunking strategy** (`rollupOptions.output.manualChunks`): Three vendor chunks — one monolithic `vendor` chunk that must keep React and react-dom together (splitting them caused a runtime crash where consumers executed before React initialized), plus a separate `vendor-three` chunk for `three`/`@react-three/fiber` loaded lazily on owner login.
- **Aliases**: `@` resolves to `./src` in both Vite and Vitest configs.
- **Environment injection**: `__APP_VERSION__` is defined at build time as an ISO timestamp string, used to label the "new version available" toast.

## Backend Build (Supabase)

- **Edge Functions**: Each function lives under `supabase/functions/<name>/index.ts` with its own `deno.json` when needed (e.g. `auth-email-hook`, `process-email-queue`). They are managed by the Supabase CLI; there is no local compile step in this repo.
- **Database migrations**: Versioned SQL files live under `supabase/migrations/`, named with a leading timestamp and UUID slug (e.g. `20260815120000_perf_hotpath_fixes.sql`). Migrations are applied through the Supabase CLI — no migration runner script exists in the repo.
- **Function config**: `supabase/config.toml` declares every function and sets `verify_jwt = false` for most (only `process-email-queue` requires JWT verification). This file is the source of truth for which functions exist and their auth policy.

## Testing

- **Framework**: Vitest 3 with `jsdom` environment, globals enabled, and a shared setup file at `src/test/setup.ts`. Tests match `src/**/*.{test,spec}.{ts,tsx}`.
- **CI pipeline** (`.github/workflows/ci.yml`): On push to `main` and on pull requests, the job runs on `ubuntu-latest` with Node 20, caches `npm`, then executes `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`. All four steps must pass.

## Deployment

- **Frontend**: Deployed to Vercel. `vercel.json` rewrites all routes to `/index.html` to support client-side routing.
- **Backend**: Supabase project identified by `project_id = "rgikflkocotkljbajzrb"` in `supabase/config.toml`; Edge Functions and migrations are deployed via the Supabase CLI from this repo.

## Conventions & Constraints

- **No Makefile/Dockerfile**: The entire build is driven by npm scripts and Vite; containerization is not part of this repository.
- **Lint rules**: `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any` are explicitly turned off because the project is non-strict by design; only React Hooks rules and react-refresh rules are enforced.
- **Single service worker**: The comment in `src/sw.ts` documents that two workers previously fought over Cache Storage causing update loops; the current architecture enforces exactly one worker handling precache, routing, and push.
- **React chunk integrity**: The manual chunking rule explicitly forbids splitting React/react-dom away from their consumers, citing a production crash as the reason.
- **Heavy library exclusion**: Lazy-loaded libraries are excluded from the precache manifest and gated behind runtime caching rules — this is a deliberate size/performance constraint enforced in both `vite.config.ts` and `src/sw.ts`.
- **CI gate**: The GitHub Actions workflow is the enforcement point for quality — lint, typecheck, tests, and build must all succeed before a PR can be merged.