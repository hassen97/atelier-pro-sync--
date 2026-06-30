# Plan: Dark mode persistence + update checks

Three changes: (1) make the dark/light theme stick after refresh, (2) add a manual "Check for update" button beside the theme toggle, (3) replace the 2-day-old toast-style hash check with an automatic update check that runs when the main landing page opens.

## 1. Dark mode persists after refresh

Currently the header just toggles a CSS class with no storage, so every refresh resets to light.

- Add a tiny inline script in `index.html` `<head>` that reads `localStorage["theme"]` and applies the `dark` class **before first paint** (prevents a light flash on reload).
- In `MainLayout.tsx`, initialize `darkMode` state from `localStorage`/the current `<html>` class instead of always `false`, and on toggle write the choice (`"dark"` / `"light"`) to `localStorage` so it survives refresh and is shared across pages.

Result: a shop owner who picks dark mode stays in dark mode after refresh and across navigation.

## 2. Manual "Check for update" button (beside theme toggle)

- Add a refresh-style icon button in the `MainLayout` header, right next to the sun/moon toggle.
- Clicking it shows a "Recherche de mises à jour…" toast, then:
  - **Update found:** toast "Mise à jour disponible" with an **Actualiser** action that reloads into the new version.
  - **Already current:** toast "Vous êtes à jour ✓".
- The check asks the service worker for the newest deployment and compares the build version; a small helper for this is added to `src/lib/swUpdate.ts` and reused by the button.

## 3. Automatic update check when the landing page opens (replaces the old toast check)

The current mechanism (added 2 days ago) waits in the background and pops a toast. You want the check to happen up front when someone opens the site.

- On the **main landing page** load, before showing the normal content, run a quick version check against the latest deployed `index.html`/build stamp.
- While checking, show a brief **"Chargement de la dernière version…"** splash (your "block with quick splash" choice). The check is time-boxed (~2.5s max) so a slow network never leaves users stuck on the splash.
- If a newer version is detected, caches are cleared and the page reloads **once** into the latest version before the app runs. A one-time guard prevents any reload loop.
- If it is already current (or the check times out), the landing page renders normally.

This keeps the existing background toast available inside the app as a safety net, but the primary update gate now happens at the landing page entry point.

## Technical notes

- Reuse and extend `src/lib/swUpdate.ts` (no new SW file) — it already guards against running inside the Lovable preview/iframe; the new manual check and landing splash respect those same guards so the editor preview is never affected.
- Theme: `localStorage` key `theme`; inline head script + `MainLayout` stay in sync; no design-token or color changes.
- Landing splash: lightweight overlay rendered by `LandingPage.tsx`, controlled by a small `checkForUpdateOnLoad()` helper with a hard timeout and a `sessionStorage` reload guard.
- `__APP_VERSION__` (build timestamp from `vite.config.ts`) is the version signal compared during checks.

## Files touched

- `index.html` — pre-paint theme script.
- `src/components/layout/MainLayout.tsx` — persistent dark mode + manual update button.
- `src/lib/swUpdate.ts` — `checkForUpdate()` (manual) and `checkForUpdateOnLoad()` (landing) helpers.
- `src/pages/LandingPage.tsx` — splash + on-open update check.