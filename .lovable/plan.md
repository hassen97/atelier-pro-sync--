# Plan: 3D update-check animation on landing open

Replace the current text+spinner splash on the landing page with a polished 3D scene that visibly communicates three states: **checking**, **up to date** (brief, then auto-enter), and **update found** (mandatory refresh that clears cached data). Reuses the existing Three.js stack (`@react-three/fiber` + `drei`) already used by the login loader, with the same WebGL/lazy-load safety guards.

## Behavior

```text
Landing opens
   │
   ▼
[ CHECKING ]  glowing blue orb pulsing  ── "Vérification de la dernière version…"
   │
   ├── up to date ──►  [ UP TO DATE ]  orb morphs → green checkmark + ring burst
   │                    ~1.5s, then auto-fade into the landing page
   │
   └── update found ─► [ UPDATE FOUND ] amber pulsing sync ring (rotating)
                        "Nouvelle version disponible"
                        Mandatory button: "Rafraîchir maintenant"
                          → clears caches + reloads into the new version
                        (no dismiss / no way past it until refreshed)
```

Network safety: the check is still time-boxed (~2.5s). If the check times out or errors, it is treated as **up to date** so a visitor is never stranded — the brief checkmark plays and the site loads.

## Visual direction (senior UX/UI)

- **Checking**: a single emissive sphere (icosahedron, smooth) in brand blue `#3B82F6`, slow rotation + soft scale "breathing", faint particle/wireframe halo. Subtle dark backdrop matching the Premium Dark theme (zinc-950) with a radial blue glow.
- **Up to date**: the orb shifts color to emerald `#10B981`, a 3D checkmark draws in, and a thin ring expands outward and fades — a satisfying "confirmed" beat. Caption "Vous êtes à jour ✓". Auto-advances after ~1.5s.
- **Update found**: orb shifts to amber `#F59E0B`, two concentric rings rotate/pulse (a "sync" feel), with a clear headline + subtext explaining a refresh is required to load the newest version and clear cached data. Primary glowing button only.
- Motion uses gentle easing; respects `prefers-reduced-motion` by falling back to the lightweight CSS version (no spinning 3D).
- Graceful fallback: if WebGL is unavailable or the 3D chunk fails, a CSS-only equivalent (colored pulsing logo + checkmark/sync icon) renders instead — same three states, same copy.

## Technical implementation

**1. `src/lib/swUpdate.ts` — expose status instead of auto-reloading on landing**
- Add `getUpdateStatus(timeoutMs = 2500): Promise<"current" | "update"`> that runs the same hashed-entry comparison as `checkForUpdateOnLoad` but **returns the result** rather than reloading. Returns `"current"` on timeout/error/preview/iframe.
- Keep `applyUpdateNow()` (already clears caches + reloads once) as the action the refresh button calls.
- Leave `checkForUpdateOnLoad` in place for backward compatibility but the landing page will switch to `getUpdateStatus` so it can drive the UI (the old function auto-reloaded, which conflicts with showing an "update found" prompt).

**2. New `src/components/landing/UpdateCheckCanvas.tsx` (lazy-loaded 3D)**
- React Three Fiber scene accepting a `state: "checking" | "current" | "update"` prop.
- Single orb mesh whose color/emissive animates per state; checkmark mesh + expanding ring for `current`; dual rotating rings for `update`. Uses `useFrame` for animation; `dpr={[1,1.5]}`, `powerPreference: "low-power"` like `BlueprintCanvas`.

**3. New `src/components/landing/UpdateCheckOverlay.tsx`**
- Full-screen overlay that owns the state machine and copy. Lazy-loads `UpdateCheckCanvas` inside a `Suspense` + WebGL check + error boundary (mirroring `BlueprintLoader`), with a CSS fallback for reduced-motion / no-WebGL.
- Props: `state`, and `onRefresh` (calls `applyUpdateNow`). Renders the mandatory "Rafraîchir maintenant" button only in the `update` state. Calls an `onDone` after the ~1.5s success beat in the `current` state.

**4. `src/pages/LandingPage.tsx`**
- Replace the current `checkForUpdateOnLoad` effect + plain splash (lines ~63–74 and ~118–129) with:
  - state `phase: "checking" | "current" | "update" | "done"`.
  - On mount call `getUpdateStatus(2500)`; set `update` or play the `current` success beat then set `done`.
  - While `phase !== "done"`, render `<UpdateCheckOverlay …/>` instead of the page; once `done`, render the landing normally.
- Preview/iframe guard already short-circuits `getUpdateStatus` to `"current"`, so the editor preview just flashes the brief success beat (or we skip straight to `done` in preview to avoid noise).

## Files touched

- `src/lib/swUpdate.ts` — add `getUpdateStatus()` (status-returning check).
- `src/components/landing/UpdateCheckCanvas.tsx` — new 3D scene (orb / checkmark / sync rings).
- `src/components/landing/UpdateCheckOverlay.tsx` — new overlay + state copy + buttons + fallbacks.
- `src/pages/LandingPage.tsx` — drive the three-state overlay on open.

No database, backend, or design-token changes. No new dependencies (Three.js stack already installed).