---
kind: frontend_style
name: Tailwind + shadcn/ui Design System with HSL Theme Tokens and Brand Theming
category: frontend_style
scope:
    - '**'
source_files:
    - tailwind.config.ts
    - src/index.css
    - components.json
    - postcss.config.js
    - src/components/ui/button.tsx
    - src/contexts/BrandThemeContext.tsx
---

## What system/approach is used

The frontend uses a **Tailwind CSS** utility-first styling pipeline powered by **PostCSS** (`postcss.config.js`), with a full **shadcn/ui** component library (configured via `components.json`, style `default`, RSC disabled, TSX enabled). The design system is built on **CSS custom properties in HSL** for theming, with a dark-mode variant driven by Tailwind's `darkMode: ["class"]`. Components are composed from Radix primitives and styled through `class-variance-authority` (CVA) variants, merged with `@/lib/utils`'s `cn()` helper.

## Key files and packages

- `tailwind.config.ts` — central theme configuration: font families (`Inter`, `JetBrains Mono`, `Archivo Black`, `Hind`), color tokens mapped to CSS variables (`--primary`, `--background`, `--sidebar-*`, etc.), border radius scale, shadow tokens, keyframes/animations, and the `tailwindcss-animate` plugin.
- `src/index.css` — root stylesheet that injects Tailwind layers, defines light/dark HSL token sets under `:root` and `.dark`, global base styles, scrollbar customization, glassmorphism utilities (`.glass`, `.glass-strong`, `.admin-glass`, `.admin-glass-card`), neon glow classes, gradient text/background helpers, landing-page specific CSS variables and animations, thermal-printer print media rules, and scroll-hide utilities.
- `components.json` — shadcn/ui configuration pointing at `tailwind.config.ts`, `src/index.css`, `baseColor: "slate"`, CSS variables enabled, and path aliases (`@/components/ui`, `@/lib/utils`, `@/hooks`).
- `postcss.config.js` — PostCSS pipeline with `tailwindcss` and `autoprefixer`.
- `src/components/ui/button.tsx` — canonical example of a shadcn/ui component using CVA variants (`variant`: default/destructive/outline/secondary/ghost/link; `size`: default/sm/lg/icon) and `cn()` composition.
- `src/contexts/BrandThemeContext.tsx` — runtime brand theming context that applies shop-specific primary colors by mutating CSS variables (`--primary`, `--ring`, `--gradient-primary`, `--sidebar-primary`, `--sidebar-ring`) from a fixed set of presets (`Neon Blue`, `Emerald Green`, `Crimson Red`, `Amethyst Purple`, `Sunset Orange`, `Teal`).
- `src/App.css` — minimal Vite scaffolding CSS (not part of the active design system).

## Architecture and conventions

1. **Token-driven theme**: All colors are defined as HSL CSS variables in `:root` (light mode) and `.dark` (dark mode) and referenced throughout Tailwind via `hsl(var(--...))` mappings in `tailwind.config.ts`. This means every semantic color (`primary`, `secondary`, `destructive`, `success`, `warning`, `accent`, `card`, `popover`, `sidebar`) flows from a single source of truth.
2. **Dark mode via class toggle**: Dark mode is opt-in per element using the `.dark` class (Tailwind `darkMode: ["class"]`); there is no automatic system preference detection in the config.
3. **shadcn/ui components**: Every UI primitive lives under `src/components/ui/*` (button, dialog, sheet, table, toast, tabs, select, command, popover, drawer, sidebar, etc.) and is consumed via the `@/components/ui` alias. Components use CVA for variant/size APIs and `cn()` for className merging.
4. **Utility layering**: Custom reusable visual patterns live in `src/index.css` under `@layer utilities` (e.g., `.glass`, `.glass-strong`, `.text-gradient-primary`, `.bg-gradient-*`, `.shadow-soft`, `.shadow-elevated`, `.animate-fade-in`, `.font-mono-numbers`) so they can be composed with Tailwind classes.
5. **Section-scoped themes**: Landing pages define their own scoped CSS variables under `.landing-page` (e.g., `--lp-bg`, `--lp-accent`, `--lp-card`) and ship dedicated glass/bento/mesh-gradient utilities (`.lp-glass`, `.lp-bento-card`, `.lp-mesh-gradient`, `.lp-pricing-popular`) isolated from the app theme.
6. **Admin aesthetic**: Admin surfaces use a distinct dark glassmorphism palette (`.admin-glass`, `.admin-glass-card`, `.admin-neon-blue`, `.admin-neon-green`, `.admin-neon-blue-glow`) separate from the main app theme.
7. **Print / thermal output**: A comprehensive `@media print` block in `src/index.css` forces high-contrast black-on-white rendering, fixes thermal printer dimensions to 72mm, and targets `.thermal-print-root` / `.thermal-print-container` elements.
8. **Runtime brand theming**: `BrandThemeContext` lets shops override the primary palette at runtime by writing new HSL values into CSS variables, keeping all downstream Tailwind classes intact.

## Conventions and constraints observed

- **No inline styles for layout/branding**: Visual appearance is expressed exclusively through Tailwind utility classes and the shared CSS variable tokens; inline `style` attributes are not used for theming.
- **Semantic color usage**: Components reference semantic tokens (`bg-primary`, `text-destructive`, `border-border`, `bg-muted`) rather than hard-coded hex/hsl values, ensuring consistency across light/dark modes.
- **CVA-driven component APIs**: New UI components follow the shadcn pattern of defining `variants` (e.g., `variant`, `size`) with sensible defaults, then composing via `cn(buttonVariants({ variant, size, className }))`.
- **Font discipline**: Typography is restricted to the four declared families (`Inter`, `JetBrains Mono`, `Archivo Black`, `Hind`) plus system fallbacks; numbers use `font-mono-numbers` with `tabular-nums`.
- **Border radius scale**: Rounded corners use the token scale `lg` (`var(--radius)` = 0.625rem), `md` (`calc(var(--radius) - 2px)`), `sm` (`calc(var(--radius) - 4px)`).
- **Animation tokens**: Reusable motion is exposed as both Tailwind animation names (`fade-in`, `slide-up`, `slide-in-right`, `scale-in`, `accordion-down/up`) and CSS utility classes (`.animate-fade-in`, `.animate-slide-up`, etc.).
- **Autoprefixing enforced**: All vendor-prefixed selectors (e.g., `-webkit-background-clip`, `-webkit-mask-composite`, `-ms-overflow-style`) are generated via PostCSS autoprefixer, so authors write standard properties only.
- **Path aliases**: All imports use `@/` aliases (`@/components/ui`, `@/lib/utils`, `@/contexts`, `@/hooks`), never relative paths across feature boundaries.