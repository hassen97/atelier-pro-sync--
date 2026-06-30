## Goal

Show a premium 3D "Digital Blueprint" loading screen the moment a shop owner clicks **Login**, while authentication and the first dashboard data load happen in the background — then fade smoothly into the dashboard. It must never slow down login: the 3D libraries load lazily and a lightweight CSS-only version covers any delay or WebGL failure.

## How it behaves

```text
Click "Connexion"
   │
   ▼
Full-screen loader appears INSTANTLY (CSS glowing logo pulse)
   │  (auth runs in background)
   ├─ 3D bundle ready within 500ms? ─► swap CSS pulse → 3D holographic logo
   │                                   (rotation + glowing pulse)
   └─ slower / WebGL fails / no logo ─► keep beautiful CSS fallback
   │
   ▼
Auth success + dashboard data prefetched
   │
   ▼
Loader fades out → navigate to /dashboard (fades in)
```

If login fails, the loader disappears and the existing error message shows as today.

## What gets built

### 1. New dependencies (React 18 compatible versions)
- `@react-three/fiber@^8.18`
- `@react-three/drei@^9.122.0`
- `three@^0.160`

These are only ever pulled into the bundle through a lazy import, so the main login screen stays light.

### 2. `src/components/auth/BlueprintLoaderFallback.tsx` (CSS-only, zero deps)
- Full-screen `bg-zinc-950` overlay matching the auth theme (grid + blue radial glows).
- The shop logo (or the default RepairPro logo) centered with a glowing/pulsing animation using existing Tailwind animation tokens (`pulse`, custom glow via `box-shadow`/`drop-shadow`).
- A short status line ("Préparation de votre atelier…").
- This renders immediately and is also the Suspense fallback + WebGL/error fallback.

### 3. `src/components/auth/BlueprintCanvas.tsx` (the heavy 3D part, lazy-loaded)
- A `@react-three/fiber` `<Canvas>` (low DPR cap, `frameloop` tuned) sized to the overlay.
- `useTexture` (drei) loads `logo_url` and caches it in the browser; the image is also preloaded so it appears instantly.
- **Logo:** a single low-poly `planeGeometry` displaying the logo texture with a transparent, emissive/holographic material (additive glow) — keeps it as a glass-morphism blueprint.
- **Blueprint accent:** one low-poly wireframe `icosahedronGeometry` behind the logo for the "tech blueprint" vibe.
- Animation via `useFrame`: subtle Y-axis rotation + a sine-based glowing pulse (emissive intensity / scale). Geometry stays minimal for 60 FPS on cheap Android tablets.
- Internal WebGL error boundary: if context creation throws, it signals the parent to drop back to the CSS fallback.

### 4. `src/components/auth/BlueprintLoader.tsx` (orchestrator)
- Props: `logoUrl: string | null`, `visible: boolean`, optional `onReady`.
- Renders `BlueprintLoaderFallback` immediately.
- Uses `React.lazy(() => import("./BlueprintCanvas"))` inside `<Suspense fallback={<BlueprintLoaderFallback />}>`.
- A **500ms timer + WebGL capability check**: only mount the lazy 3D canvas if WebGL is supported and the bundle resolves in time; otherwise stay on the CSS fallback. (The CSS fallback is always visible underneath, so the swap is seamless and there is never a blank frame.)
- Wrapped in an error boundary so any 3D failure silently falls back to CSS.
- Fade in/out controlled by `visible` using existing `animate-fade-in` / opacity transitions.

### 5. Integrate into `src/pages/Auth.tsx`
- Add `showLoader` state. In `handleLogin`, set `showLoader = true` right after the button is pressed (before/around `signIn`) so the overlay appears instantly.
- After successful sign-in, fetch the shop's `logo_url` (single lightweight query on `shop_settings.logo_url` for the signed-in user) and pass it to the loader. Default to the bundled RepairPro logo if none.
- Prefetch the dashboard's primary data via `queryClient` so the dashboard paints immediately when we navigate (this is the "fetch dashboard data in the background" step).
- Keep a small minimum display time (~900ms) so the animation reads as intentional, then `navigate("/dashboard")`.
- On any auth error: set `showLoader = false` and show the existing error UI unchanged — no behavior regression.
- Render `<BlueprintLoader visible={showLoader} logoUrl={...} />` as a top-level overlay in the Auth page.

## Scope / assumptions
- Applies to the **owner login** path (the "fully setup shop" case). Employee login and registration keep today's plain spinner unless you want it everywhere.
- Logo source is the existing `shop_settings.logo_url` (a PNG/image), shown on a textured plane — not vector extrusion — which is the reliable, low-poly approach.
- No backend/schema changes. Frontend-only.

## Performance guarantees addressed
- **Lazy loading:** 3D libs load only via `React.lazy` after the login click, never blocking the login form's initial render. They'll also land in their own Vite chunk (manualChunks can be extended for `three`/`@react-three`).
- **Texture caching:** `useTexture` + browser image cache; preloaded logo URL for instant reuse on return logins.
- **Graceful fallback:** CSS-only pulse for >500ms load, unsupported WebGL, or any 3D error.
- **Low poly:** one plane + one icosahedron, capped DPR → 60 FPS target on low-end tablets.
