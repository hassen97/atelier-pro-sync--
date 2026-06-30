## Problem

The 3D "Digital Blueprint" login animation never shows. I reproduced it with the real account: 350 ms after clicking "Se connecter", the app is already on the dashboard with a plain spinner — the dark holographic overlay never paints.

Root cause is in `src/pages/Auth.tsx`:

```tsx
if (user) {          // runs on every render
  navigate(from);    // fires instantly once the session is set
  return null;       // unmounts <BlueprintLoader>
}
```

The moment `signIn()` succeeds, the auth listener sets `user`, Auth re-renders, this guard returns `null` and navigates away — before `handleLogin` can display the loader and hold its 1.1 s minimum. The overlay lives inside the very page that unmounts itself, so it is structurally unreachable. This render-time `navigate` also causes the "Cannot update a component while rendering" warning seen in the console.

The 3D libraries themselves are healthy (`@react-three/fiber@8.18` + React 18, no crashes).

## Fix

Edit only `src/pages/Auth.tsx` — no backend, no other files, no logic outside auth UI.

1. **Stop redirecting during render.** Remove the render-time `if (user) { navigate; return null }` block and move the "already authenticated" redirect into a `useEffect`, which clears the React warning.

2. **Don't auto-redirect while the blueprint is playing.** Guard that effect so it skips navigation when `showLoader` is `true`. This keeps the Auth page (and its overlay) mounted for the full blueprint transition instead of being yanked away the instant the session appears.

3. **Paint the loader instantly on owner login.** In `handleLogin`, set `setShowLoader(true)` (with the default logo) for the owner path *before* the role/profile/logo queries run, so the dark overlay appears immediately on click rather than after the network round-trips. Then refine the logo and run the existing ~1.1 s minimum-display hold, and `navigate("/dashboard")` at the end as today.

4. **Keep all existing safeguards.** Employee logins, locked accounts, wrong-tab errors, and auth failures still set `showLoader = false` and behave exactly as now.

## Validation

- Re-run the Playwright login as `coolstoresbz` and capture frames during the transition; confirm the dark zinc-950 overlay with the pulsing logo (and the 3D canvas after ~500 ms) is visible before the dashboard appears.
- Confirm the "setState while rendering" console warning is gone.
- Confirm an intentional wrong password still shows the error and no loader.

## Technical notes

- The 500 ms WebGL/lazy-bundle beat and CSS fallback in `BlueprintLoader.tsx`/`BlueprintCanvas.tsx` already work and stay unchanged; they simply were never reached.
- The minimum-display value (~1.1 s) stays the same so the animation reads as intentional without noticeably slowing login.
