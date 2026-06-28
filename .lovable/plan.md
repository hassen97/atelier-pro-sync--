## Goal

Revert the landing page from the new "Emerald Prestige" design back to the previous **Premium Dark SaaS** look (dark navy/blue), then apply small UI polish, performance optimizations, an OG social image, and SEO fixes. All waitlist, pricing, and navigation logic stays unchanged.

## 1. Restore the old design (faithful, from version history)

The previous design is recoverable verbatim from commit `d5dd9e8` (the last version before the redesign), so this is an exact restore — not a re-code from memory.

- **`src/pages/LandingPage.tsx`** → restore the dark version (blue `hsl(217 91% 60%)` accents, dark `240 10% 4%` background, glass cards, CSS dashboard mockup).
- **`src/index.css`** → restore the `.landing-page` + `lp-*` block to the **Premium Dark SaaS** tokens (replacing the cream/emerald/gold block). The rest of the app theme is untouched.
- Fonts: the old design uses **Inter** (already loaded). The `@fontsource/archivo-black` / `@fontsource/hind` imports added for the redesign are no longer needed by the page; they'll be removed from `src/main.tsx` so they don't ship unused (small perf win).

## 2. Small UI changes (on the restored dark design)

- **Spacing & typography**: tighten section vertical rhythm, normalize heading sizes/line-heights, and balance padding on the hero, feature cards, and pricing for a cleaner, less cramped layout.
- **Buttons & CTAs**: refine the primary button (consistent radius, hover/active states, clearer focus ring), make the main "Rejoindre la liste" CTA more prominent, and tidy secondary/ghost buttons for consistency.
- No layout restructuring — same sections, same content.

## 3. Performance optimization

Note: the landing page has **no image files** — the hero "dashboard" is pure CSS/HTML, so there are no hero images to compress. Work focuses on what actually affects this page:

- **Fonts**: drop the unused Archivo/Hind font imports; keep the existing Inter load. Add `rel="preconnect"` is already present; ensure font CSS uses `display=swap` (already set).
- **Preloads**: the real LCP element is text/CSS, so no image preload is needed. Confirm no render-blocking work is added.
- **Code-splitting**: the landing route already benefits from the earlier `manualChunks` work; verify `framer-motion` isn't pulling unnecessary weight on first paint (lazy/animate-on-view already in place).
- **Lighthouse check**: after changes, run the page in the sandbox (Playwright + Lighthouse/manual metrics) to capture before/after and confirm no regressions in performance/accessibility/SEO/best-practices.

## 4. OG / social preview image

- Generate a branded **1200x630** OG image matching the dark SaaS look (RepairPro wordmark + tagline).
- Save it to `public/og-image.jpg` and wire `og:image` / `twitter:image` in `index.html` to the project URL.

## 5. SEO optimization

- Update `index.html` `og:url`, `twitter` and canonical/sitemap references from the stale `getheavencoin.com` domain to the live project domain **https://atelier-pro-sync.lovable.app** (also update `public/sitemap.xml` and `public/robots.txt` `Sitemap:` line).
- Verify a single `<h1>`, descriptive headings, image `alt`/`aria-label`s, and that title (<60 chars) and meta description (<160 chars) are accurate.
- Run the SEO review afterward and mark addressed findings fixed.

## Verification

- Typecheck.
- Capture desktop + mobile screenshots of the restored page to confirm the dark design and UI polish render correctly.
- Capture Lighthouse/metrics before/after.

## Notes / technical details

- Restore source: `git show d5dd9e8:src/pages/LandingPage.tsx` and the `.landing-page`/`lp-*` block from `git show d5dd9e8:src/index.css`.
- No backend, schema, routing, or business-logic changes.
- Social-preview crawlers cache aggressively; the new OG image may take time to appear in shared links until platforms re-fetch.
