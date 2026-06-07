# Panic Analyzer — iPhone Panic Log Diagnostic

A new client-side page where shop owners paste or upload Apple panic logs. The app scans the text against a known-fault dictionary and shows the probable failing hardware component plus a recommended repair. No backend, no database — everything runs in the browser.

## 1. Navigation

Add a sidebar entry **"Analyseur Panic"** directly below "Coffre-fort":
- Icon: `Activity` (heartbeat) from lucide-react, or `Cpu` as an alternative — will use `Activity`.
- Route: `/panic-analyzer`.
- Registered in the protected routes group and lazy-loaded like other pages.

## 2. Page Layout

`/panic-analyzer` page using the existing `PageHeader`, `SEO`, dark theme, and shadcn components.

- **Input section** (left/top):
  - Large `Textarea` for pasting raw log text.
  - A drag & drop upload zone accepting `.ips` and `.txt` files; dropping/selecting a file reads its text into the textarea (`FileReader`). Also a click-to-browse fallback `<input type="file">`.
  - Prominent **"Analyser le log"** button (disabled when input is empty).
  - A "Clear" / reset button.
- **Results section** (right/bottom): a diagnostic `Card` rendered only after analysis runs.

Responsive: two columns on desktop, stacked on mobile.

## 3. Diagnostic Engine

A constant dictionary array in the page/component file. Each entry: `{ pattern, regex, component, solution }`. Patterns (matched case-insensitively against the log text, evaluated in order):

```text
I2C0        -> Écran / Tactile / Rétroéclairage — Tester avec un écran neuf. Vérifier les lignes I2C0.
I2C1        -> Caméra arrière / Face ID — Débrancher Face ID/caméras et retester. Remplacer le flex défectueux.
I2C2        -> Tristar / Tigris / Connecteur de charge — Remplacer le flex de charge. Vérifier l'IC Tristar.
I2C3        -> Audio IC / Taptic Engine — Vérifier l'Audio IC, remplacer le Taptic Engine.
WDT timeout -> Watchdog Timeout (batterie ou charge) — Remplacer la batterie ou le flex du connecteur de charge.
AOP PANIC   -> Capteur de proximité / luminosité (ALS) — Débrancher le flex de l'écouteur. Remplacer si nécessaire.
SMC PANIC   -> Capteurs thermiques / données batterie — Remplacer batterie avec carte data d'origine, vérifier connecteur.
NAND/nvme   -> Stockage / NAND Flash — Restaurer via iTunes/3uTools. Si l'erreur persiste, reballing/remplacement NAND.
```

A `analyzePanicLog(text)` function returns the **first** matching entry, or `null`. The matcher detects all matches but surfaces the primary one (could optionally list additional matches as secondary chips).

## 4. Results Display

When a match is found, the card shows:
- **Status**: red/orange warning icon (`AlertTriangle`) with a "Faute détectée" heading.
- **Detected code**: e.g. `Erreur détectée : I2C1` (badge style).
- **Probable cause**: the failing component, visually emphasized.
- **Recommended solution**: inside a prominent green-highlighted box.

When no pattern matches, show the fallback:
> "Log Panic non reconnu. Probable défaut de carte mère nécessitant un diagnostic en micro-soudure. Veuillez vérifier le texte complet du log."

## 5. Design System

Uses existing semantic tokens and dark theme. shadcn `Card`, `Textarea`, `Button`, `Badge`. Warning/success states use existing `destructive` token and a green accent built from theme-consistent classes. No new colors introduced outside the token system.

## Technical Details

- New file `src/pages/PanicAnalyzer.tsx` (page + dictionary + analyze logic + drag/drop). Optionally split the dictionary into `src/lib/panicPatterns.ts` for clarity.
- `src/App.tsx`: add `const PanicAnalyzer = lazyWithRetry(() => import("./pages/PanicAnalyzer"))` and a `<Route path="/panic-analyzer" element={<PanicAnalyzer />} />` inside the protected layout group.
- `src/components/layout/AppSidebar.tsx`: add nav item `{ nameKey: "nav.customers", href: "/panic-analyzer", icon: Activity, labelOverride: "Analyseur Panic" }` immediately after the Coffre-fort entry; import `Activity` from lucide-react.
- File reading is purely client-side via `FileReader`; `.ips` files are read as text (Apple panic logs are JSON/plain text).
- No migrations, no edge functions, no schema changes.
