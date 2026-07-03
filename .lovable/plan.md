# Fix the intermittent blank preview (/db-restore)

## What I verified first
- **Landing (`/`), Auth (`/auth`)** render fully. **TypeScript typecheck passes** (0 errors).
- **BlueprintCanvas builds and renders** correctly. It only mounts during the login loader and is already guarded by a WebGL-availability check, a `CanvasErrorBoundary`, and a CSS fallback (`BlueprintLoaderFallback`) — it is not the source of the blank window.
- The blank is on **`/db-restore`** and **intermittent** — this points at the lazy-load path, not the page's own code.

## Root cause
Two independent issues combine into a blank screen:

1. **No error boundary around routes.** In `src/App.tsx`, `<Routes>` is wrapped only in `<Suspense>`. When a lazily-imported page chunk fails to load (stale cache / network hiccup — intermittent), the rejected promise from `React.lazy` propagates with nothing to catch it, so React unmounts the whole tree → **blank white screen**.

2. **Broken retry guard in `lazyWithRetry`** (`src/App.tsx`). After calling `window.location.reload()`, it *synchronously* runs `sessionStorage.removeItem("chunk_reload")`, wiping the "already reloaded once" flag before the reload happens. The second `importFn()` retry can also reject (again uncaught), and the guard never persists — so a genuinely failing chunk can blank out or reload-loop instead of recovering gracefully.

3. **Secondary (reachability):** `ProtectedRoute` redirects every platform admin to `/admin` (`isPlatformAdmin && pathname !== "/admin"`), so `/db-restore` is currently unreachable for the very admin the page asks you to sign in as — you'd get bounced away rather than see the tool.

## The fix

### 1. Add a route-level error boundary (new file `src/components/RouteErrorBoundary.tsx`)
A small class component that catches render/chunk-load errors and shows a branded fallback (message + "Reload" button using existing UI tokens) instead of a blank screen. On a detected dynamic-import/chunk error it offers a one-tap reload.

### 2. Wrap routes with it in `src/App.tsx`
Wrap the existing `<Suspense fallback={<PageLoader/>}>…</Suspense>` with `<RouteErrorBoundary>` so any failed page chunk degrades to the fallback UI, never a blank window.

### 3. Repair `lazyWithRetry` in `src/App.tsx`
Rework the guard so it:
- only clears the `chunk_reload` flag **after a successful import**, not synchronously right after triggering a reload;
- returns a resolved retry and, if the retry still fails, rethrows into the new error boundary (fallback UI) rather than leaving an uncaught rejection.

### 4. Make `/db-restore` reachable for platform admins in `src/components/auth/ProtectedRoute.tsx`
Add `/db-restore` (and `/admin`) to the admin bypass so a platform admin visiting `/db-restore` is not force-redirected to `/admin`. This keeps the temporary restore tool usable without weakening any other guard.

## Verification
- Run the TypeScript typecheck (expect 0 errors).
- Reproduce with Playwright: load `/db-restore` while blocking the page chunk to simulate the intermittent failure, and confirm the **error-boundary fallback with a Reload button** appears instead of a blank screen; confirm a normal load renders the restore UI.
- Confirm the landing, auth, and a normal protected route still render and that BlueprintCanvas still mounts/renders in the login loader.

## Notes
- All changes are frontend/presentation and routing-guard only — no backend, no database, no changes to the restore edge function or its logic.
- These are the temporary restore-tool files; everything here remains safe to delete after the restore is complete.
