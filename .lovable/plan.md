# 3D Loader Fixes + AI Logo Optimization

## Part 1 — 3D Loader Fixes (`src/components/auth/BlueprintCanvas.tsx`)

**Z-fighting / double logo**
- The `LogoPlane` currently always falls back to the bundled `repairpro-logo.png` (the "R" logo). Change the canvas so the default "R" logo is only ever mounted when there is **no** `logoUrl`. When a custom `logoUrl` exists, render only the custom logo texture — never both. This guarantees a single textured mesh in the scene.

**Circle mask + material**
- Replace `<planeGeometry args={[1, 1]} />` with `<circleGeometry args={[1, 64]} />` so square JPGs are masked into a clean circle immediately.
- Replace the current `meshBasicMaterial` (additive blending) with `<meshStandardMaterial map={texture} transparent />` so transparent PNGs and circle-masked JPGs render correctly with the scene lighting. Keep the existing aspect-ratio scaling and the gentle float/pulse animation.

The CSS fallback (`BlueprintLoaderFallback.tsx`) and `BlueprintLoader.tsx` already pass a single `logoUrl`, so no change is needed there beyond the canvas itself.

## Part 2 — AI Logo Optimization Workflow (Lovable AI, no extra setup)

### Backend — new Edge Function `optimize-logo`
- Accepts a temporary image (the just-selected file, sent as a base64 data URL or a signed URL from a temp upload).
- Calls the Lovable AI image gateway (`https://ai.gateway.lovable.dev/v1/images/generations`) using a Gemini image-editing model with the source image plus a prompt to: sharpen/clean the logo and remove the background to produce a transparent PNG.
- Returns the optimized PNG as base64.
- Handles gateway errors explicitly: `429` (rate limit) and `402` (credits exhausted) surface clear messages to the UI.
- Uses `LOVABLE_API_KEY` (already configured) and CORS headers.

### Frontend — Settings page (`src/pages/Settings.tsx` + new component)
- Add a prominent button **"Optimiser et Rendre Transparent (IA)"** next to the logo upload input.
- Add the French hint below the upload button:
  > *Cette fonction optimise, upscale et supprime le fond de votre logo pour un rendu 3D parfait. Le format transparent (PNG ou SVG) est recommandé.*
- New component `LogoOptimizerDialog.tsx`:
  - Lets the user pick / reuse the logo image, sends it to `optimize-logo`, shows a loading state.
  - On completion, shows a **side-by-side comparison**: original JPG vs optimized transparent PNG, both over a CSS checkerboard background.
  - Two actions:
    - **"Utiliser ce logo"** — uploads the optimized PNG to the `shop-logos` bucket and saves it as `logo_url` (replacing the current logo), then closes.
    - **"Télécharger"** — triggers a client-side download of the high-quality PNG.

### Data / storage
- Reuses the existing public `shop-logos` bucket and the existing `logo_url` field on `shop_settings`. No schema migration required.

## Technical notes
- Lovable AI image editing produces best-effort alpha transparency; results vary per logo. The comparison preview lets the user accept or reject before saving, so a poor result never overwrites the live logo.
- Optimized PNG is saved under `${user.id}/logo-optimized-<timestamp>.png` with a cache-busting query param, consistent with the current upload flow.
- All AI calls stay server-side in the edge function; the key is never exposed to the browser.

## Files touched
- `src/components/auth/BlueprintCanvas.tsx` — circle geometry, standard material, single-logo logic
- `supabase/functions/optimize-logo/index.ts` — new edge function
- `src/components/settings/LogoOptimizerDialog.tsx` — new comparison/optimization UI
- `src/pages/Settings.tsx` — new button + hint wiring