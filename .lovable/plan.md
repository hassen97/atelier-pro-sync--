## Problem

Two issues with the "Digital Blueprint" 3D login animation:

1. **It only appears on the second login (after a login + logout).** The 3D scene lives in a lazily-imported chunk (`BlueprintCanvas`). On the very first login the browser hasn't downloaded that chunk yet, so during the short loader window only the CSS fallback shows. The chunk finishes downloading in the background *after* navigation and gets cached — which is why it appears the next time you log in.
2. **It's too fast.** The loader holds for only ~1.1s total, and the 3D canvas is additionally gated behind a 500ms delay, leaving roughly half a second of 3D before the app navigates away.

## Fix

### 1. Preload the 3D bundle before it's needed (`BlueprintLoader.tsx`)

- Export a `preloadBlueprint()` helper that fires the `import("./BlueprintCanvas")` dynamic import (and warms the logo texture) on demand.
- This makes the chunk available the moment the loader shows, so the 3D scene renders on the **first** login.

### 2. Warm the bundle on the Auth page (`Auth.tsx`)

- Call `preloadBlueprint()` when the login form is in view / when the user focuses the username field, so by the time they press "Connexion" the chunk is already cached.

### 3. Show 3D as soon as it's ready (`BlueprintLoader.tsx`)

- Remove (or shrink to near-zero) the fixed 500ms `allow3D` delay now that the bundle is preloaded, so the 3D canvas paints immediately while the CSS fallback stays underneath as a seamless backdrop.

### 4. Slow the animation down (`Auth.tsx`)

- Increase the minimum loader display time from `1100ms` to a longer, more intentional duration (≈3000–5000ms) so the holographic logo + wireframe animation has time to play before navigating to the dashboard.

## Technical notes

- Files touched: `src/components/auth/BlueprintLoader.tsx`, `src/pages/Auth.tsx`. No backend changes.
- The CSS fallback (`BlueprintLoaderFallback`) remains the instant first paint and the WebGL-unavailable fallback, so behavior degrades gracefully.
- Preloading is best-effort (`import().catch(() => {})`) and never blocks the login form or the login request.