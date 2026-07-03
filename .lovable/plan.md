# Update social & link preview image

## Goal
Replace the current shared-link preview (the image that shows on WhatsApp, Facebook, LinkedIn, iMessage, Twitter/X, etc.) with a new branded preview photo built around the **existing RepairPro logo** (the blue rounded "R"). The logo itself stays unchanged, and the preview domain stays `getheavencoin.com`.

## What changes
1. **Generate a new preview image** — a polished 1200×630 (correct social ratio) graphic:
   - Premium dark background (Zinc-950) matching the app's brand.
   - The current RepairPro "R" logo featured prominently.
   - Product name "RepairPro" + a short French tagline ("Gestion d'atelier de réparation mobile").
   - Brand blue (#3B82F6) accents, subtle glow — no generic AI purple gradients.
2. **Replace `public/og-image.jpg`** with the new image (same filename, so no tag edits are needed — the tags already point at `/og-image.jpg`).

## What stays the same
- The logo (`src/assets/repairpro-logo.png` / `public/repairpro-logo.png`) — untouched.
- Domain in `og:url`, `og:image`, `twitter:image`, canonical — remains `https://www.getheavencoin.com/...`.
- All `index.html` head tags — no changes required since the image path is unchanged.

## Technical notes
- The existing tags in `index.html` already reference:
  - `og:image` → `https://www.getheavencoin.com/og-image.jpg`
  - `twitter:image` → `https://www.getheavencoin.com/og-image.jpg`
  So overwriting `public/og-image.jpg` is sufficient. The new image is served at `/og-image.jpg` on that domain when the app is deployed there.
- Image generated with the premium tier (best for legible text/typography) at 1200×630.

## Important caveat
Because `og:image` points at `www.getheavencoin.com`, the new preview only appears once the app is deployed to that domain and the file is live there. Social platforms also **cache** previews aggressively — the new image won't show in already-shared links until each platform re-scrapes it. You can force a refresh using each platform's link-preview debugger (e.g. Facebook Sharing Debugger, LinkedIn Post Inspector).
