# Robust Cache-Busting for RepairPro

## Goal
Users currently must clear browser cache to see new deployments. We'll make new versions load automatically without interrupting active data entry (POS, repairs forms).

## What's already correct (no change needed)
- **File hashing (your point 2):** Vite already fingerprints every JS/CSS output (`main-[hash].js`) by default. Confirmed in build output — nothing to add.
- **Service worker shell:** `vite.config.ts` already uses `NetworkFirst` for HTML, `skipWaiting`, `clientsClaim`, and `cleanupOutdatedCaches: true`. The SW correctly fetches fresh HTML.

## The actual root cause
`src/main.tsx` registers the service worker but never **listens for an updated worker**. So even when a new version is downloaded in the background, the open tab keeps running the old JS until a manual hard-refresh. We fix this with proper update detection plus a safe reload strategy.

## Changes

### 1. `src/main.tsx` — Update detection + safe auto-reload (core fix)
Enhance the existing registration block (keep the iframe/preview guard untouched):
- After `register("/sw.js")`, attach an `updatefound` listener. When the new worker reaches `installed` (and a controller already exists, meaning it's an update not first install), mark "update ready".
- Add a single `navigator.serviceWorker.addEventListener("controllerchange", ...)` listener that reloads **once** (guarded by a flag to prevent reload loops).
- **Safe-reload policy** (your chosen behavior):
  - If the page is hidden (`document.visibilityState === "hidden"`) or the user is idle → reload immediately.
  - Otherwise show a non-blocking toast: **"Nouvelle version disponible"** with a **"Actualiser"** button (via `sonner`, already wired globally). Clicking it reloads.
  - Also reload automatically on the next tab focus/visibility change if an update is pending and no unsaved-form interaction is in progress.
- Poll for updates: call `reg.update()` on initial load and on `visibilitychange` to `visible`, so a returning tab promptly discovers new deploys.

### 2. `index.html` — Reinforce no-cache on the root document (your point 1)
Add to `<head>`:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```
Note: these meta tags are a belt-and-suspenders measure (browsers largely rely on HTTP headers, which Lovable hosting already sends with revalidation). They don't hurt and document intent. The SW `NetworkFirst` HTML strategy is what actually guarantees fresh HTML.

### 3. Version stamp for the toast (lightweight, your point 4)
- Inject a build-time version constant via Vite `define` (e.g. `__APP_VERSION__` = build timestamp) in `vite.config.ts`.
- Use it only to label the update toast and for an optional `localStorage` comparison fallback — **not** a forced `location.reload(true)` loop (that pattern is fragile and the SW path is more reliable). No aggressive reload loops.

## Explicitly NOT doing
- No `selfDestroying` SW, no cache-busting reload loops, no version-polling hacks — these break Lovable preview and risk infinite reloads.
- No changes to `public/sw-custom.js` (push-notification worker stays as-is).
- No forced reload that could wipe an in-progress POS sale or repair form.

## Verification
- Build and confirm hashed filenames + that the generated `/sw.js` still includes the custom push importScript.
- Simulate an update (rebuild) and confirm: background download → toast appears → clicking "Actualiser" loads new chunks; hidden-tab path reloads silently; no reload loop.
- Confirm SW still never registers in the Lovable preview iframe.
