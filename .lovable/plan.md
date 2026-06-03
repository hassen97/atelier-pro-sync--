## Goal
Upgrade React, Vite, and Tailwind CSS to their latest major versions and fix everything that breaks, then verify the app still builds, tests pass, and the preview renders.

## ⚠️ Important risk note
The Lovable build/preview harness officially targets **React 18 + Vite 5 + Tailwind 3**. Going to React 19 / Vite 8 / Tailwind 4 are three simultaneous *major* upgrades with breaking changes. I confirmed the core Lovable plugins still allow it:
- `lovable-tagger@1.3.0` → supports `vite >=5 <9` ✅ (but internally depends on Tailwind 3, so a nested v3 will coexist — harmless)
- `@vitejs/plugin-react-swc` → needs bump to `^4` for Vite 8
- `vite-plugin-pwa@1.3.0` → supports Vite 8 ✅
- Node is `v22.22` ✅ (Vite 8 needs ≥20.19/22.12)

Even so, Tailwind 4 is the highest-risk piece (new engine + import syntax). If the preview breaks badly after Tailwind 4, the fallback is to keep Tailwind 3 and ship only React 19 + Vite 8. I'll surface this if it happens.

## Target versions
| Package | From | To |
|---|---|---|
| react / react-dom | 18.3.1 | ^19.2 |
| @types/react / @types/react-dom | 18.x | ^19 |
| vite | 5.4.19 | ^8 |
| @vitejs/plugin-react-swc | 3.11 | ^4 |
| tailwindcss | 3.4.17 | ^4.3 |
| @tailwindcss/postcss | — | ^4.3 (new) |
| tailwindcss-animate | 1.0.7 | replaced by `tw-animate-css` |

## Plan

### Phase 1 — Vite 8 + React 19 (lower risk)
1. Bump `vite@^8`, `@vitejs/plugin-react-swc@^4`, `vite-plugin-pwa@^1.3`.
2. Bump `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`.
3. Reinstall and resolve peer-dependency warnings. Watch specifically:
   - `react-helmet-async` (React 19 compatibility — may need a patch or swap to `react-helmet-async`'s maintained fork if it errors).
   - Radix UI, `framer-motion`, `react-day-picker`, `cmdk`, `vaul`, `sonner` — all recent, expected fine.
4. Fix any React 19 breakages (removed `propTypes`/`defaultProps` on function components, stricter ref typing). The codebase uses `forwardRef` (e.g. `button.tsx`) which stays valid in 19.
5. `vite.config.ts` — no API changes expected; verify the PWA + manualChunks config still loads under Vite 8.

### Phase 2 — Tailwind CSS 4 (high risk)
6. Install `tailwindcss@^4` + `@tailwindcss/postcss@^4`; remove `tailwindcss-animate`, add `tw-animate-css` (the v4-native replacement).
7. `postcss.config.js` — replace the `tailwindcss: {}` plugin with `'@tailwindcss/postcss': {}` (autoprefixer becomes optional; Tailwind 4 includes it).
8. `src/index.css`:
   - Replace `@tailwind base; @tailwind components; @tailwind utilities;` with `@import "tailwindcss";`.
   - Keep the existing design system with the least churn by adding `@config "../tailwind.config.ts";` so the current `tailwind.config.ts` tokens/colors keep working (Tailwind 4 still supports JS config via `@config`).
   - Swap the `tailwindcss-animate` import path for `tw-animate-css` and update the `@layer base`/`@layer utilities` blocks as needed (Tailwind 4 keeps `@layer` but a few utilities changed names).
9. `tailwind.config.ts` — keep as the JS config referenced by `@config`. The `@tailwindcss/typography` plugin reference stays; `require("tailwindcss-animate")` is removed (now handled in CSS).
10. Address known Tailwind 4 class renames if they appear (e.g. `shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, default border color change). I'll grep the codebase for affected utilities and fix only real breakages.

### Phase 3 — Verification
11. Run the build (harness auto-builds) and read sandbox dev-server logs for errors.
12. Run the test suite (`vitest run`) — existing tests must pass.
13. Open the preview, check console/runtime errors, and visually verify a few key pages (Dashboard, POS, Vault, Auth) for broken styling — Tailwind 4 issues show up as missing/incorrect styles.
14. Fix any regressions found, re-verify until clean.

## Technical details / files touched
- `package.json` — version bumps + dependency swap (`tailwindcss-animate` → `tw-animate-css`).
- `postcss.config.js` — new Tailwind 4 PostCSS plugin.
- `src/index.css` — import syntax, `@config`, animate import.
- `tailwind.config.ts` — drop the animate plugin require.
- `vite.config.ts` — only if Vite 8 surfaces an API change (none expected).
- Component fixes only where React 19 / Tailwind 4 actually break them — kept minimal.

## Out of scope
- No feature/behavior changes, no design redesign, no backend/edge-function/Supabase changes.
- Untouched: `src/integrations/supabase/*`, the Returns/RMA module, business logic.

## Rollback
If Tailwind 4 destabilizes the preview, revert just the Tailwind changes (Phase 2) and keep React 19 + Vite 8.
