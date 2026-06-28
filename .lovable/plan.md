## Goal

Replace the generic dark-blue "AI SaaS" landing page with a distinctive, professional **Emerald Prestige** launch design based on the direction you picked: light cream canvas, full nav, bold Archivo Black headlines, gold accents, and a live dashboard mockup in a split-screen hero.

All existing behavior stays exactly the same — only the look changes.

## What stays (no logic changes)

- Waitlist email capture → derives username → redirects to `/auth` (success + duplicate)
- Dynamic pricing from `usePublicPlans`, plan selection / checkout routing
- Auth-aware CTAs (`/dashboard` vs `/auth`), login link
- SEO tags, mobile menu, scroll-aware navbar

## Design direction (locked)

- **Palette — Emerald Prestige:** deep emerald `#064e3b`, emerald `#0d7a5f`, gold `#c9a84c`, cream `#f5f0e0`
- **Type:** Archivo Black (headings, uppercase, tight), Hind (body)
- **Layout:** split-screen hero — copy + waitlist on the left, live dashboard mockup on the right
- **Tone:** fast & powerful, premium, confident

## Implementation

### 1. Fonts
- `bun add @fontsource/archivo-black @fontsource/hind`
- Import both in `src/main.tsx`
- Add `display`, `sans` (Hind) families to `tailwind.config.ts` so `font-display`/`font-sans` work

### 2. Theme tokens
- Add a scoped `.landing-page` token override block in `index.css` for the Emerald Prestige palette (cream background, emerald/gold accents), plus light-canvas variants of the helper classes the page uses (mesh gradient, glass cards, gradient text, navbar-scrolled, dashboard mockup). This keeps the rest of the app's dark theme untouched.

### 3. Rebuild `src/pages/LandingPage.tsx`
Rebuild the markup against the chosen prototype while reusing the existing handlers/data:
- **Navbar:** cream/transparent → emerald on scroll; Archivo Black "REPAIRPRO" wordmark with gold-accented logo mark; nav links + gold "Rejoindre la liste" CTA; mobile menu restyled.
- **Hero (split-screen):** left = live "Nouveau" pill, oversized Archivo Black headline with gold/emerald emphasis, Hind subcopy, waitlist form (gold button), reassurance line; right = white dashboard mockup (stat cards, weekly activity bar chart with gold highlight bar, repair-status panel) with soft emerald/gold glow accents.
- **Stats band:** 4 trust stats in gold/emerald.
- **Features:** keep the 6 features, restyle cards to cream/white with emerald icons + gold hover edges (bento or even grid).
- **Value props:** Sécurisé / Ultra Rapide / Mobile First restyled.
- **Pricing:** dynamic plans restyled — highlighted plan gets the gold/emerald popular treatment.
- **Final CTA + footer:** emerald CTA band with gold button; restyled footer.
- Keep Framer Motion entrances but tune to snappier timing.

### 4. Verify
- Typecheck, then capture the rendered page (desktop + mobile) via the preview to confirm spacing, contrast, and that nothing overlaps before finishing.

## Notes
- Color values applied through the scoped `.landing-page` tokens / inline styles already used on this page, so the global design system and app theme are unaffected.
- No backend, schema, or routing changes.
