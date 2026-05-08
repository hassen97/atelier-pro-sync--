## 1. Custom period / month picker on Profit page

**Current:** `src/pages/Profit.tsx` has a Select with fixed periods (today/week/month/quarter/year) passed to `useProfit(period)`.

**Change:**
- Add two new options to the period selector: **"Mois spécifique"** and **"Période personnalisée"**.
- When "Mois spécifique" → show a month/year picker (simple month + year dropdowns) → compute `startDate = startOfMonth`, `endDate = endOfMonth` of that month.
- When "Période personnalisée" → show a date-range picker (two shadcn Calendar popovers, From/To, with `pointer-events-auto`) → use those dates directly.
- Refactor `useProfit` in `src/hooks/useProfit.ts` to accept either a period string OR `{ from: Date, to: Date }`. Internally it already builds `startDate`/`endDate`, so we just branch on the input. Previous-period comparison = same length window immediately before `from`.
- Update the export filename and the text export header to show the actual date range when custom.

**Files:** `src/pages/Profit.tsx`, `src/hooks/useProfit.ts`.

## 2. Let employees see remaining stock quantity

**Current:** In `src/pages/Inventory.tsx` the **Stock** column header and cell are gated by `!isEmployee`, so employees see no stock at all. Cost / Margin / Adjust / Delete also hidden.

**Change (only stock visibility, nothing else):**
- Show the **Stock** column to employees as **read-only** (just the number + low-stock badge), no inline edit and no "Ajuster stock" / "Supprimer" actions.
- Keep Coût and Marge hidden for employees (financial privacy rule stays intact).
- Update the empty-row `colSpan` accordingly (employees: 6 instead of 5).
- Also reveal stock in `ProductSheet` quick view if it's currently hidden for employees (quick check; only adjust if needed).

**Files:** `src/pages/Inventory.tsx` (and `src/components/inventory/ProductSheet.tsx` if needed).

No DB migration, no RLS change — employees already have SELECT on `products` via `is_team_member`, this is purely a UI gate.
