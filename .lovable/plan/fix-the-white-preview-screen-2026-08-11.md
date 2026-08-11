# Fix the white preview screen

## What I checked

The app itself is healthy in the sandbox: the dev server answers 200, and loading the app at your phone-sized viewport (384x657) renders the full landing page (logo, trial countdown banner, hero) with no page errors.

The one real problem I could reproduce: your preview is currently sitting on the URL `/index`, and that path is not registered in the router. It falls through to the catch-all and logs `404 Error: User attempted to access non-existent route: /index`. The 404 page is very short content, so on a phone it can look like an empty white/dark screen with nothing meaningful on it.

The second likely factor is the PWA service worker. This project registers a service worker that precaches the app shell. After the recent service-worker consolidation, a browser that still holds the old worker can keep serving a stale shell whose JS bundles no longer exist — which shows as a genuinely blank page. This is device-side state, so it cannot be reproduced from the sandbox, only defended against in code.

## Plan

1. **Make `/index` resolve instead of 404-ing** — add a redirect from `/index` (and `/home`) to `/` in the router so old or bookmarked links land on the landing page.

2. **Make the 404 page unmistakable** — it currently renders a bare centered block. Give it the app's dark surface, the RepairPro mark, the attempted path, and clear "Retour à l'accueil" / "Se connecter" buttons so a wrong URL never reads as a broken app.

3. **Self-healing for a stale service-worker shell** — in the service-worker update helper, detect the case where a precached navigation request resolves to a shell whose assets 404, and unregister + clear caches + reload once (guarded by a session flag so it can never loop). Combined with the existing chunk-reload guard in `App.tsx`, a device holding a dead cache recovers by itself on next open.

4. **Verify** — reload `/index`, `/`, and a bogus path in a headless browser at your mobile viewport, confirm each renders visible content with no page errors, and confirm the service worker registers cleanly.

## Technical notes

- Router changes in `src/App.tsx`: two `<Route>` entries using `<Navigate to="/" replace />`.
- `src/pages/NotFound.tsx`: presentation-only rewrite using existing semantic tokens (no hardcoded colors).
- `src/lib/swUpdate.ts`: add a one-shot recovery path (`caches.keys()` clear + `registration.unregister()` + single reload behind a `sessionStorage` guard). No changes to push-notification handling in `src/sw.ts`.
- No backend, database, or auth changes.
