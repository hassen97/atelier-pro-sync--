# Dashboard Redesign — Bento Grid

Reorganize `src/pages/Dashboard.tsx` into a professional, data-dense bento layout. Data hooks stay the same except one small addition for the month-over-month trend. No new fonts or colors — uses existing semantic tokens.

## 1. Quick Action Bar (top, full width)
A responsive button row directly under the page header:
- **Nouvelle Réparation** — primary gradient, opens the existing `RepairDialog`.
- **Nouvelle Vente** — navigates to `/pos`.
- **Entrée Stock** — navigates to `/inventory`.
- **Exporter** — runs the existing `handleExport` CSV logic.

Layout: `grid grid-cols-2 md:grid-cols-4 gap-3` so it stacks cleanly on mobile.

## 2. Main Bento Grid (`grid-cols-1 md:grid-cols-3`)
- **Left (wide, `md:col-span-2`)** — `CurrentRegisterPanel` (Caisse en cours) kept exactly as-is with all stats.
- **Right (narrow, stacked)**:
  - **Ventes du mois** — large bold KPI number, muted-grey label, plus a **"vs last month"** indicator (`+12% ↗` green / `-5% ↘` red).
  - **Alertes stock** — big count with a red badge, and the **top 3 critical items at 0 stock**, each with a **Commander** button that adds it to a thermal order receipt (reusing the existing out-of-stock 80mm print helper). A "Voir l'inventaire" link remains.

## 3. Secondary Stats Row
The four cards not covered above (Réparations en cours, Total produits, Dettes clients, Dettes fournisseurs) move into a compact, muted secondary row: `grid grid-cols-2 lg:grid-cols-4`, subtle `bg-muted/30` tiles, small muted labels, bold numbers — no heavy borders/shadows.

## 4. Réparations récentes — Compact Table
Replace the list with a shadcn `Table`, no extra card padding:
- Columns: **Client · Device · Status (colored badge) · Prix**.
- Reuses the existing `statusConfig` badge styling.
- "Voir tout →" link to `/repairs` in a slim header.

## 5. Visual Styling
- Remove heavy borders/drop shadows; group with subtle `bg-muted/30` / `bg-muted/50` shading.
- Primary KPIs: larger size + heavier weight (e.g. `text-3xl font-bold`).
- All labels: `text-muted-foreground`, smaller, to reduce noise.
- Keep `animate-fade-in` and the existing loading skeleton (re-shaped to match the new grid).

## Technical Details
- **Trend data**: extend `useDashboardStats` in `src/hooks/useDashboard.ts` to also compute current-month vs previous-month sales totals (filtered by `created_at` on `sales`, net of refunds), returning `salesTrendPct`. This is the only data-fetching change.
- **Commander / order receipt**: reuse the existing thermal-print helper used by the Inventory "Rupture" out-of-stock flow (`src/lib/receiptPdf.ts`) to print an 80mm supplier order ticket for the selected 0-stock item(s).
- Quick actions reuse existing routes (`/pos`, `/inventory`, `/repairs`) and the already-wired `RepairDialog` + `handleExport`.
- Banners (`WaitlistTrialBanner`, onboarding reminders), `SubscriptionBadge`, `MyTasks`, and the `RepairDialog` submit logic are preserved untouched.
- Layout stays fluid mobile→desktop via `grid-cols-1 md:grid-cols-3`.

No backend/schema changes.
